import { chooseDate, saveVersion } from './daily-helpers';
import { csrfHeaders, expect, keyboardActivate, layout, login, savedIndicator, test } from './fixtures';

const sourceDate = '2026-11-13';
const targetDate = '2026-11-16';
const undoDate = '2026-11-17';
const daily = '/api/v1/daily-notes';
const scoped = (path: string, space = 'work') => `${path}?space=${space}`;
const blank = { type: 'doc', content: [{ type: 'paragraph' }] };

test('copy previous: preserves the source and versions and saves one reversible copy', async ({ page, identity, isMobile }) => {
  await login(page, identity);
  const headers = await csrfHeaders(page);
  const refResponse = await page.request.post(scoped('/api/v1/reference-items'), {
    headers,
    data: { title: 'Runbook copiado', description: 'Referencia ficticia' },
  });
  expect(refResponse.status()).toBe(201);
  const reference = await refResponse.json();
  const content = {
    type: 'doc',
    content: [{
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Tarea 1279', marks: [{ type: 'link', attrs: { href: 'https://example.test/1279' } }] },
        { type: 'text', text: ' ' },
        { type: 'reference', attrs: { id: reference.id } },
      ],
    }, { type: 'separator', attrs: { width: 50 } }],
  };
  const put = async (date: string, document: unknown, space = 'work') => {
    const response = await page.request.put(scoped(`${daily}/${date}`, space), {
      headers, data: { content: document, expectedRevision: 0 },
    });
    expect(response.status()).toBe(200);
    return response.json();
  };
  const read = async (path: string) => {
    const response = await page.request.get(scoped(path));
    expect(response.status()).toBe(200);
    return response.json();
  };
  const source = await put(sourceDate, content);
  await put('2026-11-14', { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Solo Personal' }] }] }, 'personal');
  await put('2026-11-15', blank);
  await put('2026-11-20', content);
  await chooseDate(page, sourceDate);
  const sourceVersion = await saveVersion(page, sourceDate);
  await chooseDate(page, targetDate);
  const targetVersion = await saveVersion(page, targetDate);
  const before = await read(`${daily}/${targetDate}`);
  expect(before.content).toEqual(blank);

  const editor = page.getByRole('textbox', { name: 'Editor de nota diaria' });
  const copy = async (date: string, name: string) => {
    const button = page.getByRole('button', { name, exact: true });
    await expect(button).toHaveText('Copiar nota anterior');
    expect((await button.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    const response = page.waitForResponse(result =>
      new URL(result.url()).pathname === `${daily}/${date}/copy-previous` && result.request().method() === 'POST',
    );
    if (isMobile) await button.tap();
    else await keyboardActivate(page, 'button', name);
    const ack = await response;
    expect(ack.status()).toBe(200);
    await expect(savedIndicator(page)).toBeVisible();
    await expect(button).toHaveCount(0);
    return ack.json();
  };

  await expect(page.getByText(/última nota de Trabajo.*13\/11\/2026/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copiar nota', exact: true })).toBeVisible();
  await layout(page);
  const ack = await copy(targetDate, 'Copiar nota del 13/11/2026 a 16/11/2026 en Trabajo');
  expect(ack).toMatchObject({ id: before.id, date: targetDate, revision: before.revision + 1, content });
  expect(ack.id).not.toBe(source.id);
  await expect(page.getByText('Copiada del 13/11/2026')).toBeVisible();
  await expect(editor.getByRole('link', { name: 'Tarea 1279' })).toHaveAttribute('href', 'https://example.test/1279');
  await expect(editor.getByText('Runbook copiado')).toBeVisible();
  await expect(editor.locator('[data-width="50"]')).toHaveCount(1);
  if (!isMobile) await expect(editor).toBeFocused();

  await page.reload();
  await expect(editor.getByText('Runbook copiado')).toBeVisible();
  expect(await read(`${daily}/${targetDate}`)).toEqual(ack);
  await editor.press('Control+z');
  await expect(editor.getByText('Runbook copiado')).toBeVisible();
  expect(await read(`${daily}/${targetDate}`)).toEqual(ack);
  expect(await read(`/api/v1/daily-versions/${targetDate}`)).toEqual(targetVersion);

  await chooseDate(page, undoDate);
  const second = await copy(undoDate, 'Copiar nota del 16/11/2026 a 17/11/2026 en Trabajo');
  expect(second).toMatchObject({ date: undoDate, revision: 1, content });
  expect(second.id).not.toBe(ack.id);
  await expect(editor.getByText('Runbook copiado')).toBeVisible();
  const undo = page.waitForResponse(result =>
    new URL(result.url()).pathname === `${daily}/${undoDate}` && result.request().method() === 'PUT',
  );
  await editor.press('Control+z');
  const saved = await undo;
  expect(saved.status()).toBe(200);
  expect(saved.request().postDataJSON()).toEqual({ expectedRevision: second.revision, content: blank });
  expect(await saved.json()).toMatchObject({ id: second.id, revision: second.revision + 1, content: blank });
  await expect(savedIndicator(page)).toBeVisible();
  await expect(editor).toHaveText('');
  await page.reload();
  await expect(editor).toHaveAttribute('contenteditable', 'true');
  await expect(editor).toHaveText('');
  expect(await read(`${daily}/${sourceDate}`)).toEqual(source);
  expect(await read(`/api/v1/daily-versions/${sourceDate}`)).toEqual(sourceVersion);
  expect((await page.request.get(scoped(`/api/v1/daily-versions/${undoDate}`))).status()).toBe(404);
});

test('copy previous: requires a new click for a changed source and protects a remote destination', async ({ page, identity }) => {
  await login(page, identity);
  const headers = await csrfHeaders(page);
  const put = async (date: string, text: string, expectedRevision: number) => {
    const content = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] };
    const response = await page.request.put(scoped(`${daily}/${date}`), {
      headers, data: { content, expectedRevision },
    });
    expect(response.status()).toBe(200);
    return response.json();
  };
  const original = await put(sourceDate, 'Fuente antes de la sugerencia', 0);
  await chooseDate(page, targetDate);
  const copy = page.getByRole('button', { name: 'Copiar nota del 13/11/2026 a 16/11/2026 en Trabajo' });
  await expect(copy).toBeEnabled();
  const updated = await put(sourceDate, 'Fuente modificada', original.revision);
  const path = `${daily}/${targetDate}/copy-previous`;
  let posts = 0;
  page.on('request', request => {
    if (new URL(request.url()).pathname === path && request.method() === 'POST') posts++;
  });
  const clickAndCheck = async (code: string) => {
    const response = page.waitForResponse(result =>
      new URL(result.url()).pathname === path && result.request().method() === 'POST',
    );
    await copy.click();
    const rejected = await response;
    expect(rejected.status()).toBe(409);
    expect(await rejected.json()).toMatchObject({ code });
    return rejected.request().postDataJSON();
  };
  const refreshed = page.waitForResponse(result =>
    new URL(result.url()).pathname === `${daily}/${targetDate}/previous` && result.status() === 200,
  );
  const first = await clickAndCheck('COPY_SOURCE_CHANGED');
  expect(first).toEqual({ sourceDate, sourceRevision: original.revision, expectedRevision: 0 });
  expect(await (await refreshed).json()).toMatchObject({ sourceRevision: updated.revision });
  await expect(page.getByText(/La nota de origen cambió/)).toBeVisible();
  expect(posts).toBe(1);
  const target = await put(targetDate, 'Texto guardado desde otra sesión', 0);
  const second = await clickAndCheck('COPY_TARGET_CHANGED');
  expect(second).toEqual({ sourceDate, sourceRevision: updated.revision, expectedRevision: 0 });
  await expect(copy).toHaveCount(0);
  await page.getByRole('button', { name: 'Recargar nota' }).click();
  await expect(page.getByRole('textbox', { name: 'Editor de nota diaria' })).toHaveText('Texto guardado desde otra sesión');
  const final = await page.request.get(scoped(`${daily}/${targetDate}`));
  expect(final.status()).toBe(200);
  expect(await final.json()).toEqual(target);
  expect(posts).toBe(2);
});
