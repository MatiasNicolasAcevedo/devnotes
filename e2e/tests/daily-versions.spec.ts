import { randomUUID } from 'node:crypto';
import { test, expect, control, login, interactiveLogin, readiness, csrfHeaders, layout, logout } from './fixtures';
import { chooseDate, writeWork, saveVersion, readVersion } from './daily-helpers';

test.describe.configure({ timeout: 90_000 });

const day19 = '2026-10-19';
const day20 = '2026-10-20';

test('T-020: direct URL, reload, Hoy and empty dates keep route and editor coherent without writes', async ({ page, identity }) => {
  await login(page, identity);
  const writes: string[] = [];
  page.on('request', request => {
    if (['PUT', 'POST'].includes(request.method()) && new URL(request.url()).pathname.startsWith('/api/v1/daily-')) writes.push(request.url());
  });
  await page.goto(`/notes/${day19}`);
  await expect(page.getByLabel('Fecha', { exact: true })).toHaveValue(day19);
  const editor = page.getByRole('textbox', { name: 'Editor de nota diaria' });
  await expect(editor).toHaveAttribute('contenteditable', 'true');
  await expect(editor).toHaveText('');
  await chooseDate(page, day20);
  await expect(editor).toHaveText('');
  await page.reload();
  await expect(page).toHaveURL(`http://localhost/notes/${day20}`);
  await expect(page.getByLabel('Fecha', { exact: true })).toHaveValue(day20);
  await expect(editor).toHaveAttribute('contenteditable', 'true');
  await expect(editor).toHaveText('');
  // En angosto el enlace es un icono con nombre «Ir a hoy».
  await page.getByRole('link', { name: /^(Hoy|Ir a hoy)$/ }).click();
  const today = await page.evaluate(() => {
    const value = new Date();
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  });
  await expect(page).toHaveURL(`http://localhost/notes/${today}`);
  await expect(page.getByLabel('Fecha', { exact: true })).toHaveValue(today);
  await expect(editor).toHaveAttribute('contenteditable', 'true');
  // Completar un debounce real prueba que montar/hidratar no programa una escritura.
  await page.waitForTimeout(800);
  expect(writes).toEqual([]);
  const listResponse = await page.request.get('/api/v1/daily-notes');
  expect(listResponse.status()).toBe(200);
  expect((await listResponse.json()).totalElements).toBe(0);
  await layout(page);
});

test('CA-04: dates 19/10 and 20/10 are independent; create/replace one version; editing note does not alter history', async ({ page, identity }) => {
  await login(page, identity);
  await page.getByRole('link', { name: 'Notas', exact: true }).click();
  await chooseDate(page, day19);
  await writeWork(page, day19, 'Nota del 19 de octubre');
  const original = await saveVersion(page, day19);

  await chooseDate(page, day20);
  await expect(page.getByRole('textbox', { name: 'Editor de nota diaria' })).toHaveText('');
  await writeWork(page, day20, 'Nota del 20 de octubre');
  const version20 = await saveVersion(page, day20);
  expect(version20.id).not.toBe(original.id);
  await readVersion(page, day19, 'Nota del 19 de octubre');
  await readVersion(page, day20, 'Nota del 20 de octubre');

  await page.getByRole('link', { name: /Volver a mi nota/ }).click();
  await chooseDate(page, day19);
  await expect(page.getByRole('textbox', { name: 'Editor de nota diaria' })).toHaveText('Nota del 19 de octubre');
  const edited = await writeWork(page, day19, 'Nota editada del 19');
  await readVersion(page, day19, 'Nota del 19 de octubre');
  await page.getByRole('link', { name: /Volver a mi nota/ }).click();
  await expect(page.getByRole('textbox', { name: 'Editor de nota diaria' })).toHaveText('Nota editada del 19');

  // Cancelar un reemplazo deja la copia anterior intacta.
  await page.getByRole('button', { name: 'Guardar versión', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
  const afterCancel = await page.request.get(`/api/v1/daily-versions/${day19}`);
  expect(afterCancel.status()).toBe(200);
  expect(await afterCancel.json()).toEqual(original);
  const replacement = await saveVersion(page, day19, true);
  expect(replacement.id).toBe(original.id);
  expect(replacement.sourceRevision).toBe(edited.revision);
  expect(JSON.stringify(replacement.content)).toContain('Nota editada del 19');
  await readVersion(page, day19, 'Nota editada del 19');
  await readVersion(page, day20, 'Nota del 20 de octubre');
  const listResponse = await page.request.get('/api/v1/daily-versions');
  expect(listResponse.status()).toBe(200);
  const list = await listResponse.json();
  expect(list.totalElements).toBe(2);
  expect(list.content.map((item: { date: string }) => item.date)).toEqual([day20, day19]);
  const unchanged20 = await page.request.get(`/api/v1/daily-versions/${day20}`);
  expect(unchanged20.status()).toBe(200);
  expect(await unchanged20.json()).toEqual(version20);
  await layout(page);
});

test('CA-05: reload and logout/login recover work and version copy', async ({ page, identity }) => {
  await login(page, identity);
  await page.getByRole('link', { name: 'Notas', exact: true }).click();
  const date = await page.getByLabel('Fecha', { exact: true }).inputValue();
  expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  await writeWork(page, date, 'Copia guardada que se recupera');
  const version = await saveVersion(page, date);
  await writeWork(page, date, 'Trabajo posterior que se recupera');
  await page.reload();
  await expect(page).toHaveURL(`http://localhost/notes/${date}`);
  await expect(page.getByLabel('Fecha', { exact: true })).toHaveValue(date);
  await expect(page.getByRole('textbox', { name: 'Editor de nota diaria' })).toHaveText('Trabajo posterior que se recupera');
  await readVersion(page, date, 'Copia guardada que se recupera');
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Versión de solo lectura' })).toHaveText('Copia guardada que se recupera');
  await logout(page);
  await expect(page).toHaveURL('http://localhost/login');
  await expect(page.locator('.daily-editor-content')).toHaveCount(0);
  expect((await page.request.get('/api/v1/daily-versions')).status()).toBe(401);
  await login(page, identity);
  await page.getByRole('link', { name: 'Notas', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Editor de nota diaria' })).toHaveText('Trabajo posterior que se recupera');
  await readVersion(page, date, 'Copia guardada que se recupera');
  const recovered = await page.request.get(`/api/v1/daily-versions/${date}`);
  expect(recovered.status()).toBe(200);
  expect(await recovered.json()).toEqual(version);
  await layout(page);
});

test('CA-06: two identities on the same date only see their own versions; change identity clears data', async ({ page, browser, identity }) => {
  await control('reference-login');
  await readiness(page);
  const actorA = await interactiveLogin(page, identity);
  await page.getByRole('link', { name: 'Notas', exact: true }).click();
  await chooseDate(page, day19);
  await writeWork(page, day19, 'Version secreta de A');
  const versionA = await saveVersion(page, day19);
  const second = await browser.newContext({ baseURL: 'http://localhost', viewport: page.viewportSize()! });
  try {
    const pageB = await second.newPage();
    const actorB = await interactiveLogin(pageB, randomUUID());
    expect(actorB).not.toBe(actorA);
    expect((await (await page.request.get('/api/v1/auth/me')).json()).id).toBe(actorA);
    await pageB.goto(`/history/${day19}`);
    await expect(pageB.getByText('Sin versión guardada', { exact: false })).toBeVisible();
    const absent = await pageB.request.get(`/api/v1/daily-versions/${day19}`);
    expect(absent.status()).toBe(404);
    expect(JSON.stringify(await absent.json())).not.toContain('Version secreta de A');
    const byForeignId = await pageB.request.get(`/api/v1/daily-versions/${versionA.id}`);
    expect(byForeignId.status()).toBe(400);
    const byMissingId = await pageB.request.get(`/api/v1/daily-versions/${randomUUID()}`);
    expect(byMissingId.status()).toBe(400);
    expect((await byForeignId.json()).detail).toBe((await byMissingId.json()).detail);
    const csrf = await csrfHeaders(pageB);
    expect((await pageB.request.post(`/api/v1/daily-notes/${day19}/version`, { headers: csrf, data: { expectedRevision: versionA.sourceRevision } })).status()).toBe(404);
    expect((await pageB.request.post(`/api/v1/daily-notes/${day19}/version`, { headers: csrf, data: { expectedRevision: versionA.sourceRevision, ownerId: actorA } })).status()).toBe(400);
    await pageB.getByRole('link', { name: 'Notas', exact: true }).click();
    await chooseDate(pageB, day19);
    await writeWork(pageB, day19, 'Version de B');
    const versionB = await saveVersion(pageB, day19);
    expect(versionB.id).not.toBe(versionA.id);
    await readVersion(page, day19, 'Version secreta de A');
    await readVersion(pageB, day19, 'Version de B');
    await page.reload();
    await expect(page.getByRole('textbox', { name: 'Versión de solo lectura' })).toHaveText('Version secreta de A');
    const stillA = await page.request.get(`/api/v1/daily-versions/${day19}`);
    expect(stillA.status()).toBe(200);
    expect(await stillA.json()).toEqual(versionA);
    await logout(pageB);
    await expect(pageB).toHaveURL('http://localhost/login');
    await expect(pageB.locator('.daily-editor-content')).toHaveCount(0);
    expect((await pageB.request.get('/api/v1/auth/me')).status()).toBe(401);
    expect((await pageB.request.get('/api/v1/daily-versions')).status()).toBe(401);
    // El mismo navegador cambia de B a A sin conservar la vista privada anterior.
    expect(await interactiveLogin(pageB, identity)).toBe(actorA);
    await readVersion(pageB, day19, 'Version secreta de A');
    await expect(pageB.getByRole('main')).not.toContainText('Version de B');
    expect((await (await page.request.get('/api/v1/auth/me')).json()).id).toBe(actorA);
    await layout(pageB);
  } finally { await second.close(); }
  await layout(page);
});
