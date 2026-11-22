import { randomUUID } from 'node:crypto';
import { control, csrfHeaders, expect, interactiveLogin, login, test } from './fixtures';

test('free-notes: lists support editing, clipboard, reload and XLSX v4 restore', async ({
  page, context, browser, identity, isMobile,
}) => {
  await login(page, identity);
  await page.goto('/free-notes/new?space=work');
  const title = page.getByRole('textbox', { name: 'Título' });
  const body = page.getByRole('textbox', { name: 'Contenido' });
  const format = async (name: string) => {
    await page.getByRole('button', { name: 'Lista', exact: true }).click();
    await page.getByRole('menuitem', { name, exact: true }).click();
    await expect(body).toBeFocused();
  };
  await title.fill('T-082 listas ficticias');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.evaluate(() => navigator.clipboard.writeText('Preparar\nComprobar'));
  await body.press('Control+v');
  await expect(body.locator(':scope > p')).toHaveText(['Preparar', 'Comprobar']);
  await body.press('Control+a');
  await format('Casillas');

  const first = body.getByRole('checkbox', { name: 'Casilla: Preparar' });
  const second = body.getByRole('checkbox', { name: 'Casilla: Comprobar' });
  if (isMobile) await first.tap();
  else {
    await body.press('Tab');
    await expect(first).toBeFocused();
    await page.keyboard.press('Space');
  }
  await expect(first).toBeChecked();
  await expect(second).not.toBeChecked();

  await body.locator('li p').first().click();
  await format('Viñetas');
  await expect(body.locator('ul:not([data-type]) > li p')).toHaveText(['Preparar']);
  await expect(second).not.toBeChecked();
  await expect(first).toHaveCount(0);
  await body.press('Control+z');
  await expect(first).toBeChecked();
  await expect(body.locator('ul[data-type=taskList] li p')).toHaveText(['Preparar', 'Comprobar']);

  const readClipboard = () => page.evaluate(async () => {
    const [item] = await navigator.clipboard.read();
    const html = await (await item.getType('text/html')).text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return {
      text: (await (await item.getType('text/plain')).text()).replace(/\r\n/g, '\n'),
      checked: [...doc.querySelectorAll<HTMLInputElement>('li input[type=checkbox]')].map(input => input.checked),
    };
  });
  await body.press('Control+a');
  await body.press('Control+c');
  const clipboard = await readClipboard();
  expect(clipboard.text).toBe('Preparar\nComprobar');
  expect(clipboard.checked).toEqual([true, false]);

  await body.locator('li p').first().click();
  await body.press('Home');
  await body.press('Shift+End');
  await body.press('Control+c');
  expect(await readClipboard()).toEqual({ text: 'Preparar', checked: [true] });

  await body.press('Control+End');
  await body.press('Enter');
  await expect(body.getByRole('checkbox', { name: 'Casilla sin texto' })).not.toBeChecked();
  await body.press('Enter');
  await expect(body.locator(':scope > p')).toHaveCount(1);

  await body.pressSequentially('Revisar');
  await format('Viñetas');
  await body.press('Enter');
  await body.press('Enter');
  await body.pressSequentially('Primero');
  await format('Numerada');
  await body.press('Enter');
  await body.pressSequentially('Segundo');
  await format('Sin lista');
  await expect(body.locator(':scope > p')).toHaveText(['Segundo']);
  await body.press('Control+z');

  const expectLists = async (editor: typeof body) => {
    await expect(editor.locator(':scope > ul[data-type=taskList] li p')).toHaveText(['Preparar', 'Comprobar']);
    await expect(editor.getByRole('checkbox', { name: 'Casilla: Preparar' })).toBeChecked();
    await expect(editor.getByRole('checkbox', { name: 'Casilla: Comprobar' })).not.toBeChecked();
    await expect(editor.locator(':scope > ul:not([data-type]) li p')).toHaveText(['Revisar']);
    await expect(editor.locator(':scope > ol li p')).toHaveText(['Primero', 'Segundo']);
    await expect(editor.locator(':scope > ol[start]')).toHaveCount(0);
    await expect(editor.locator('li ul, li ol')).toHaveCount(0);
  };
  await expectLists(body);
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Editar nota' })).toBeVisible();
  await page.reload();
  await expectLists(body);

  const paragraph = { type: 'paragraph' };
  const nestedItem = { type: 'listItem', content: [paragraph] };
  const nestedList = { type: 'bulletList', content: [nestedItem] };
  const response = await page.request.post('/api/spaces/work/free-notes', {
    headers: await csrfHeaders(page),
    data: {
      attemptId: '01918f5e-d001-7000-8000-000000000082',
      title: 'Anidada ficticia',
      document: { type: 'doc', content: [
        { type: 'bulletList', content: [{ type: 'listItem', content: [paragraph, nestedList] }] },
      ] },
    },
  });
  expect(response.status()).toBe(400);
  const workbook = await page.request.get('/api/v1/portability/export');
  expect(workbook.status()).toBe(200);

  await control('reference-login');
  const restore = await browser.newContext({ baseURL: 'http://localhost', viewport: page.viewportSize()! });
  try {
    const restored = await restore.newPage();
    await interactiveLogin(restored, randomUUID());
    const file = {
      name: 'listas-v4.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: await workbook.body(),
    };
    const headers = await csrfHeaders(restored);
    const preview = await restored.request.post('/api/v1/portability/import-preview', {
      headers, multipart: { file },
    });
    expect(preview.status()).toBe(200);
    expect(await preview.json()).toMatchObject({ version: 4, accountEmpty: true, counts: { freeNotes: 1 } });
    const result = await restored.request.post('/api/v1/portability/imports', {
      headers, multipart: { file },
    });
    expect(result.status()).toBe(201);
    await restored.goto('/free-notes?space=work');
    await restored.getByRole('link', { name: /T-082 listas ficticias/ }).click();
    await expectLists(restored.getByRole('textbox', { name: 'Contenido' }));
  } finally {
    await restore.close();
  }
});

test('free-notes: lifecycle with draft guard, space and diary date', async ({ page, identity, isMobile }) => {
  await page.setViewportSize({ width: isMobile ? 320 : 768, height: 700 });
  await login(page, identity);
  await page.goto('/notes/2025-06-17?space=work');
  await page.getByRole('link', { name: 'Libres', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Navegación principal' })
    .getByRole('link', { name: 'Notas' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByText('Todavía no hay notas libres')).toBeVisible();
  const fresh = page.getByRole('link', { name: 'Nueva nota' });
  await fresh.click();

  const title = page.getByRole('textbox', { name: 'Título' });
  const body = page.getByRole('textbox', { name: 'Contenido' });
  await expect(title).toBeFocused();
  await title.fill('T-080 borrador');
  await body.pressSequentially('Primer parrafo');
  await body.press('Enter');
  await body.pressSequentially('Segundo parrafo');
  await page.getByRole('link', { name: 'Libres', exact: true }).click();
  const guard = page.getByRole('dialog', { name: /Guardar los cambios/ });
  await guard.getByRole('button', { name: 'Seguir editando' }).click();
  await expect(title).toHaveValue('T-080 borrador');
  await page.getByRole('link', { name: 'Libres', exact: true }).click();
  await guard.getByRole('button', { name: 'Guardar', exact: true }).click();

  await page.getByRole('link', { name: /T-080 borrador/ }).click();
  await title.fill('T-080 renombrada');
  await body.locator('p').last().click();
  await body.press('End');
  await body.pressSequentially(' guardado');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByText('Guardada', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Libres', exact: true }).click();
  await page.getByRole('link', { name: /T-080 renombrada/ }).click();
  await expect(title).toHaveValue('T-080 renombrada');
  await expect(body.locator('p')).toHaveText(['Primer parrafo', 'Segundo parrafo guardado']);
  await title.fill('T-080 segunda edición');
  await body.locator('p').last().click();
  await body.press('End');
  await body.pressSequentially(' otra vez');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByText('Guardada', { exact: true })).toBeVisible();
  const savedUrl = page.url();
  await page.reload();
  await expect(title).toHaveValue('T-080 segunda edición');
  await expect(body.locator('p')).toHaveText(['Primer parrafo', 'Segundo parrafo guardado otra vez']);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(isMobile ? 320 : 768);

  await title.fill('Cambio que se descarta');
  await page.getByRole('button', { name: 'Espacio: Trabajo' }).click();
  await page.getByRole('menuitemradio', { name: 'Personal' }).click();
  await guard.getByRole('button', { name: 'Descartar' }).click();
  await expect(page.getByText('Todavía no hay notas libres')).toBeVisible();
  const personalUrl = new URL(savedUrl);
  personalUrl.searchParams.set('space', 'personal');
  await page.goto(personalUrl.href);
  await expect(page.getByText('La nota libre no está disponible.')).toBeVisible();
  await page.goto(savedUrl);
  await expect(title).toHaveValue('T-080 segunda edición');
  await page.getByRole('link', { name: 'Libres', exact: true }).click();

  await fresh.click();
  await title.fill('T-080 posterior');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Editar nota' })).toBeVisible();
  await page.getByRole('link', { name: 'Libres', exact: true }).click();

  await page.getByRole('button', { name: 'Borrar T-080 segunda edición' }).click();
  const deletion = page.getByRole('dialog', { name: '¿Borrar la nota libre?' });
  await deletion.getByRole('button', { name: 'Borrar', exact: true }).click();
  await expect(fresh).toBeFocused();
  await expect(page.getByRole('link', { name: /T-080 posterior/ })).toBeVisible();
  await page.getByRole('button', { name: 'Borrar T-080 posterior' }).click();
  await deletion.getByRole('button', { name: 'Borrar', exact: true }).click();
  await expect(page.getByText('Todavía no hay notas libres')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Todavía no hay notas libres')).toBeVisible();
});

test('free-notes: lifecycle returns to the original diary date', async ({ page, identity }) => {
  await login(page, identity);
  await page.goto('/notes/2025-06-17?space=work');
  await page.getByRole('link', { name: 'Libres', exact: true }).click();
  await page.reload();
  await page.getByRole('link', { name: 'Diario' }).click();
  await expect(page.getByLabel('Fecha', { exact: true })).toHaveValue('2025-06-17');
});

test('free-notes: lifecycle recovers from a conflicting revision', async ({ page, context, identity, isMobile }) => {
  test.skip(isMobile, 'La recuperación en dos pestañas se verifica en desktop.');
  await login(page, identity);
  await page.goto('/free-notes/new?space=work');
  const title = page.getByRole('textbox', { name: 'Título' });
  const body = page.getByRole('textbox', { name: 'Contenido' });
  const save = page.getByRole('button', { name: 'Guardar', exact: true });
  await title.fill('Nota inicial');
  await body.fill('Cuerpo inicial');
  await save.click();
  await expect(page.getByRole('heading', { name: 'Editar nota' })).toBeVisible();
  const notePath = `/api/spaces/work/free-notes/${new URL(page.url()).pathname.split('/').at(-1)}`;

  const remote = await context.newPage();
  try {
    await remote.goto(page.url());
    await remote.getByRole('textbox', { name: 'Título' }).fill('Nota remota');
    await remote.getByRole('textbox', { name: 'Contenido' }).fill('Cuerpo remoto');
    await remote.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(remote.getByText('Guardada', { exact: true })).toBeVisible();
  } finally {
    await remote.close();
  }

  const waitForSave = () => page.waitForResponse(response =>
    response.request().method() === 'PUT' && new URL(response.url()).pathname === notePath);
  await title.fill('Nota local');
  await body.fill('Cuerpo local');
  const conflict = waitForSave();
  await save.click();
  expect((await conflict).status()).toBe(409);
  await expect(page.getByText('La nota cambió en otra sesión.')).toBeVisible();

  const openLatest = page.getByRole('button', { name: 'Abrir versión reciente' });
  const confirmation = page.getByRole('dialog');
  await openLatest.click();
  await confirmation.getByRole('button', { name: 'Seguir editando' }).click();
  await expect(title).toHaveValue('Nota local');
  await expect(body).toHaveText('Cuerpo local');
  await openLatest.click();
  await confirmation.getByRole('button', { name: 'Descartar y abrir' }).click();
  await expect(title).toHaveValue('Nota remota');
  await expect(body).toHaveText('Cuerpo remoto');

  await body.fill('Cuerpo reconciliado');
  const saved = waitForSave();
  await save.click();
  const response = await saved;
  expect(response.status()).toBe(200);
  expect(response.request().postDataJSON()).toMatchObject({ expectedRevision: 2 });
  await expect(page.getByText('Guardada', { exact: true })).toBeVisible();
  await page.reload();
  await expect(title).toHaveValue('Nota remota');
  await expect(body).toHaveText('Cuerpo reconciliado');
});
