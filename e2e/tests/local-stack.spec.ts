import { test, expect, control, layout, serverStatus, returnToForeground } from './fixtures';

test.describe.configure({ timeout: 90_000 });

// T-050: el estado de API y base de datos se lee en el indicador de la barra superior.
test('real database outage removes cached success and recovers on foreground within 30 seconds', async ({ page }) => {
  await page.goto('/');
  const online = serverStatus(page, 'Servidor conectado');
  const offline = serverStatus(page, 'Servidor sin conexión');
  await expect(online).toBeVisible();
  await layout(page);
  try {
    const stoppedAt = Date.now();
    await control('stop-db');
    await returnToForeground(page);
    await expect(offline).toBeVisible({ timeout: 30_000 });
    expect(Date.now() - stoppedAt).toBeLessThan(30_000);
    await expect(online).toHaveCount(0);
    const health = await page.request.get('/actuator/health/readiness', { timeout: 5000 });
    expect(health.status()).toBe(503);
    expect(await health.json()).toEqual({ status: 'DOWN' });
    expect((await page.request.get('/api/v1/system/info')).status()).toBe(200);
    await layout(page);
    const restartedAt = Date.now();
    await control('start-db');
    await expect.poll(async () => (await page.request.get('/actuator/health/readiness', { timeout: 5000 })).status(),
      { timeout: 30_000 }).toBe(200);
    await returnToForeground(page);
    await expect(online).toBeVisible({ timeout: 30_000 });
    expect(Date.now() - restartedAt).toBeLessThan(30_000);
    await expect(offline).toHaveCount(0);
    const recovered = await page.request.get('/actuator/health/readiness', { timeout: 5000 });
    expect(recovered.status()).toBe(200);
    expect(await recovered.json()).toEqual({ status: 'UP' });
    await layout(page);
  } finally {
    await control('start-db');
  }
});
