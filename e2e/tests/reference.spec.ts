import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { test, expect, control, readiness, layout, interactiveLogin, csrfHeaders as headers, keyboardActivate, logout } from './fixtures';

test.describe.configure({ timeout: 90_000 });
const path = '/api/v1/reference-items';

test('private reference CRUD persists, paginates and rejects a simultaneous second OIDC identity', async ({ page, browser, identity }, testInfo) => {
  await control('reference-login');
  await readiness(page);
  const a = await interactiveLogin(page, identity);
  await page.getByRole('link', { name: 'Referencias', exact: true }).click();
  await expect(page.getByText('No tenés elementos en esta página.')).toBeVisible();
  const create = page.getByRole('button', { name: 'Crear elemento', exact: true });
  await create.click();
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  const title = page.getByRole('textbox', { name: 'Título', exact: false });
  await expect(title).toBeFocused();
  await expect(page.getByText('Ingresá un título.')).toBeVisible();
  await title.fill(' Ejemplo A ');
  await page.getByRole('textbox', { name: 'Descripción', exact: true }).fill('<b>Texto plano</b>');
  const creation = page.waitForResponse(response => new URL(response.url()).pathname === path && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  const response = await creation;
  expect(response.status()).toBe(201);
  expect(response.headers()['cache-control']).toContain('no-store');
  const item = await response.json();
  expect(Object.keys(item).sort()).toEqual(['createdAt', 'description', 'id', 'title', 'updatedAt']);
  expect(response.headers().location).toBe(`${path}/${item.id}`);
  await expect(page.getByRole('heading', { name: 'Ejemplo A', exact: true })).toBeVisible();
  await expect(create).toBeFocused();
  await expect(page.getByText('<b>Texto plano</b>', { exact: true })).toBeVisible();
  await page.reload();
  expect(await (await page.request.get(`${path}/${item.id}`)).json()).toEqual(item);
  await page.getByRole('button', { name: 'Editar Ejemplo A', exact: true }).click();
  await page.getByRole('textbox', { name: 'Título', exact: false }).fill('Ejemplo editado');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ejemplo editado' })).toBeVisible();
  const beforeDenials = await (await page.request.get(`${path}/${item.id}`)).json();
  expect((await page.request.post(path, { data: { title: 'Sin CSRF', description: '' } })).status()).toBe(403);

  const second = await browser.newContext({ baseURL: 'http://localhost', viewport: page.viewportSize()! });
  try {
    const bPage = await second.newPage();
    const b = await interactiveLogin(bPage, randomUUID());
    expect(b).not.toBe(a);
    expect((await (await page.request.get('/api/v1/auth/me')).json()).id).toBe(a);
    await bPage.getByRole('link', { name: 'Referencias', exact: true }).click();
    await expect(bPage.getByText('No tenés elementos en esta página.')).toBeVisible();
    const csrf = await headers(bPage);
    const missing = await (await bPage.request.get(`${path}/${randomUUID()}`)).json();
    for (const method of ['GET', 'PUT', 'DELETE']) {
      const rejected = await bPage.request.fetch(`${path}/${item.id}`, { method, headers: csrf, ...(method === 'PUT' ? { data: { title: 'Ataque', description: '' } } : {}) });
      expect(rejected.status()).toBe(404);
      expect((await rejected.json()).detail).toBe(missing.detail);
    }
    expect((await bPage.request.post(path, { headers: csrf, data: { title: 'Inyección', description: '', ownerId: a } })).status()).toBe(400);
    expect((await bPage.request.post(path, { headers: csrf, data: { title: 'Privado B', description: '' } })).status()).toBe(201);
    expect((await (await bPage.request.get(path)).json()).totalElements).toBe(1);
    expect(await (await page.request.get(`${path}/${item.id}`)).json()).toEqual(beforeDenials);
    expect((await (await page.request.get(path)).json()).totalElements).toBe(1);
    expect((await page.request.get('/api/v1/reference/private')).status()).toBe(403);
    const aCsrf = await headers(page);
    for (let index = 0; index < 20; index++) expect((await page.request.post(path, { headers: aCsrf, data: { title: `Paginado ${index}`, description: '' } })).status()).toBe(201);
    await page.reload();
    await expect(page.getByText('Página 1 de 2 · 21 elementos')).toBeVisible();
    await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Ejemplo editado' })).toBeVisible();
    await page.getByRole('button', { name: 'Eliminar Ejemplo editado', exact: true }).click();
    await keyboardActivate(page, 'button', 'Confirmar eliminación');
    await expect(page.getByText('Elemento eliminado.', { exact: true })).toBeVisible();
    await expect(page.getByText('Página 1 de 1 · 20 elementos')).toBeVisible();
    await expect(create).toBeFocused();
    expect((await page.request.get(`${path}/${item.id}`)).status()).toBe(404);
    expect((await (await bPage.request.get(path)).json()).totalElements).toBe(1);
    await layout(page);
    // Only this known fictitious SPA screen enters the existing audited screenshot export.
    expect(page.url()).toBe('http://localhost/reference');
    await page.screenshot({ path: testInfo.outputPath('safe-failure.png') });
    await writeFile(testInfo.outputPath('safe-screenshot.json'), JSON.stringify({ safe: true }));
    await logout(page);
    await expect(page).toHaveURL('http://localhost/login');
    expect((await page.request.get(path)).status()).toBe(401);
    expect((await bPage.request.get(path)).status()).toBe(200);
  } finally { await second.close(); }
});
