import { test, expect, control, readiness, layout, serverStatus } from './fixtures';

test.describe.configure({ timeout: 90_000 });

// T-050: sin pantalla de inicio, el estado real del servidor se muestra en el indicador de la barra superior.
test('compiled shell displays the real server status and recovers accessibly through Reintentar after an outage', async ({ page }, testInfo) => {
  const desktop = testInfo.project.name === 'desktop';
  const ready = page.waitForResponse(response => new URL(response.url()).pathname === '/actuator/health/readiness' && response.status() === 200);
  await page.goto('/');
  expect(await (await ready).json()).toEqual({ status: 'UP' });
  const info = await page.request.get('/api/v1/system/info');
  expect(info.status()).toBe(200);
  const data = await info.json();
  expect(Object.keys(data).sort()).toEqual(['name', 'version']);
  expect(data.name).toBe('DevNotes');
  await expect(page).toHaveTitle(data.name);
  // La ruta índice abre Notas, también para un visitante.
  await expect(page).toHaveURL('http://localhost/notes');
  await expect(page.getByText('Inicia sesión para acceder a tus notas.')).toBeVisible();
  const online = serverStatus(page, 'Servidor conectado');
  const offline = serverStatus(page, 'Servidor sin conexión');
  await expect(online).toBeVisible();
  // En ancho el indicador lleva texto; en angosto, solo el punto con su nombre accesible.
  await expect(online).toHaveText(desktop ? 'Online' : '');
  await expect(offline).toHaveCount(0);
  await layout(page);
  await control('stop');
  await page.reload();
  await expect(offline).toBeVisible({ timeout: 20_000 });
  await expect(offline).toHaveText(desktop ? 'Offline' : '');
  await expect(online).toHaveCount(0);
  const error = page.getByRole('alert').filter({ hasText: 'No se pudo verificar tu sesión' });
  await expect(error).toBeVisible({ timeout: 20_000 });
  await expect(error).toContainText('El servidor no está disponible en este momento. Intentá de nuevo en unos minutos.');
  await layout(page);
  await control('start');
  await readiness(page);
  // Multiple alerts may expose retry while the backend is down; select the session alert explicitly.
  const retry = error.getByRole('button', { name: 'Reintentar', exact: true });
  await expect(retry).toBeEnabled();
  for (let index = 0; index < 24; index++) {
    await page.keyboard.press('Tab');
    if (await retry.evaluate(element => element === document.activeElement)) break;
  }
  await expect(retry).toBeFocused();
  const recovered = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/auth/me');
  await page.keyboard.press('Enter');
  expect((await recovered).status()).toBe(401);
  await expect(error).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Ingresar', exact: true })).toBeVisible();
  // El indicador revalida solo cada 5 s: vuelve a «conectado» sin recargar la página.
  // Directed red assay changes this relevant expected UI result, never the server response.
  await expect(serverStatus(page, process.env.E2E_ASSERT_FAILURE === '1'
    ? 'INDUCED_WRONG_CONNECTED_LABEL' : 'Servidor conectado')).toBeVisible({ timeout: 20_000 });
  await expect(offline).toHaveCount(0);
  expect(await (await page.request.get('/api/v1/system/info')).json()).toEqual(data);
  await layout(page);
});
