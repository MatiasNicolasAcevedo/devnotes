import { randomUUID } from 'node:crypto';
import type { Browser, Page } from '@playwright/test';
import { control, csrfHeaders, expect, login, readiness, test } from './fixtures';

async function checkFreeNoteRestore(
  page: Page, browser: Browser, sourceUser: string, title: string,
  checkNote: (restored: Page) => Promise<void>,
) {
  const workbook = await page.request.get('/api/v1/portability/export');
  expect(workbook.status()).toBe(200);
  const restoreIdentity = randomUUID();
  await control('identity', restoreIdentity);
  const restore = await browser.newContext({ baseURL: 'http://localhost', viewport: page.viewportSize()! });
  try {
    const restored = await restore.newPage();
    await readiness(restored);
    expect(await login(restored, restoreIdentity)).not.toBe(sourceUser);
    const file = {
      name: 'notas-libres-v4.xlsx',
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
    await restored.getByRole('link', { name: title }).click();
    await checkNote(restored);
  } finally {
    await restore.close();
  }
}

test('free-notes: lists support editing, clipboard, reload and XLSX v4 restore', async ({
  page, context, browser, identity, isMobile,
}) => {
  const sourceUser = await login(page, identity);
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
  await checkFreeNoteRestore(page, browser, sourceUser, 'T-082 listas ficticias', async (restored) => {
    await expectLists(restored.getByRole('textbox', { name: 'Contenido' }));
  });
});

test('free-notes: code blocks preserve clipboard, undo and XLSX v4', async ({
  page, context, browser, identity, isMobile,
}) => {
  const width = isMobile ? 320 : 768;
  await page.setViewportSize({ width, height: 700 });
  const sourceUser = await login(page, identity);
  await page.goto('/free-notes/new?space=work');
  const title = 'T-083 código ficticio';
  await page.getByRole('textbox', { name: 'Título' }).fill(title);
  const editor = page.getByRole('textbox', { name: 'Contenido' });
  const card = editor.locator('.free-note-code');
  const code = card.locator('code');
  const paragraph = editor.locator(':scope > p');
  const exit = card.getByRole('button', { name: 'Salir del bloque' });
  const choose = async (language: string) => {
    await page.getByRole('button', { name: 'Herramientas' }).click();
    await page.getByRole('menuitem', { name: 'Bloque de código' }).click();
    await page.getByRole('menuitem', { name: language, exact: true }).click();
    await expect(editor).toBeFocused();
  };

  await editor.click();
  await choose('JSON');
  await expect(card).toHaveAttribute('data-language', 'json');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const snippet = '\n  SELECT 1, "x" -- ' + 'dato'.repeat(120) + '\n\n\tfin ';
  await page.evaluate((text) => navigator.clipboard.writeText(text), snippet);
  await editor.press('Control+v');
  const expectCode = (target: typeof code, expected: string) =>
    expect.poll(() => target.textContent()).toBe(expected);
  await expectCode(code, snippet);
  await expect(code.locator('.code-string')).toHaveText('"x"');
  await choose('SQL');
  await expect(code.locator('.code-keyword')).toHaveText('SELECT');
  await expect(code.locator('.code-comment')).toHaveCount(1);
  await choose('TXT');
  await expect(code.locator('[class^=code-]')).toHaveCount(0);
  await expectCode(code, snippet);
  await editor.press('Control+z');
  await expect(card).toHaveAttribute('data-language', 'sql');
  await expectCode(code, snippet);
  await expect.poll(() => card.locator('.free-note-code-content').evaluate(
    (element) => element.scrollWidth > element.clientWidth,
  )).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);

  await page.evaluate(() => navigator.clipboard.writeText('valor anterior'));
  const copy = card.getByRole('button', { name: 'Copiar código' });
  if (isMobile) await copy.tap();
  else await copy.click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(snippet);
  await editor.press('Control+a');
  await editor.press('Control+c');
  const clipboard = await page.evaluate(async () => {
    const [item] = await navigator.clipboard.read();
    const html = await (await item.getType('text/html')).text();
    const pre = new DOMParser().parseFromString(html, 'text/html').querySelector('pre');
    return { language: pre?.dataset.language, text: pre?.textContent };
  });
  expect(clipboard).toEqual({ language: 'sql', text: snippet });

  const selectionIn = (target: typeof code) => target.evaluate((element) =>
    element.contains(window.getSelection()?.anchorNode ?? null));
  const codeOffset = () => code.evaluate((element) => {
    const selection = window.getSelection();
    if (!selection?.anchorNode || !element.contains(selection.anchorNode)) return -1;
    const range = document.createRange();
    range.selectNodeContents(element);
    range.setEnd(selection.anchorNode, selection.anchorOffset);
    return range.toString().length;
  });
  const placeCodeCaret = async () => {
    await code.locator('.code-keyword').click();
    await expect.poll(codeOffset).toBeGreaterThan(0);
    return codeOffset();
  };
  const originalOffset = await placeCodeCaret();
  await exit.click();
  await expect(paragraph).toHaveCount(1);
  await expect.poll(() => selectionIn(paragraph)).toBe(true);
  await editor.press('Control+z');
  await expect(paragraph).toHaveCount(0);
  await expect.poll(codeOffset).toBe(originalOffset);
  await exit.click();
  await editor.pressSequentially('Después');
  const existingOffset = await placeCodeCaret();
  await exit.click();
  await expect(paragraph).toHaveText(['Después']);
  await expect.poll(() => selectionIn(paragraph)).toBe(true);
  await editor.press('Control+z');
  await expect.poll(codeOffset).toBe(existingOffset);
  await expect(paragraph).toHaveText(['Después']);

  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Editar nota' })).toBeVisible();
  await page.reload();
  await expect(card).toHaveAttribute('data-language', 'sql');
  await expectCode(code, snippet);

  const response = await page.request.post('/api/spaces/work/free-notes', {
    headers: await csrfHeaders(page),
    data: {
      attemptId: '01918f5e-d001-7000-8000-000000000083',
      title: 'Lenguaje ajeno',
      document: { type: 'doc', content: [{ type: 'codeBlock', attrs: { language: 'javascript' } }] },
    },
  });
  expect(response.status()).toBe(400);
  await checkFreeNoteRestore(page, browser, sourceUser, title, async (restored) => {
    const restoredCard = restored.locator('.free-note-code');
    await expect(restoredCard).toHaveAttribute('data-language', 'sql');
    await expectCode(restoredCard.locator('code'), snippet);
  });
});

test('free-notes: headings preserve selection, lists, code and XLSX v4', async ({
  page, context, browser, identity,
}) => {
  const sourceUser = await login(page, identity);
  await page.goto('/free-notes/new?space=work');
  const title = 'T-084 formato ficticio';
  await page.getByRole('textbox', { name: 'Título' }).fill(title);
  const body = page.getByRole('textbox', { name: 'Contenido' });
  const paragraphs = body.locator(':scope > p');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.evaluate(() => navigator.clipboard.writeText('Alfa beta gamma\nTema\nDetalle\nPunto\nSELECT 1'));
  await body.press('Control+v');
  await expect(paragraphs).toHaveText(['Alfa beta gamma', 'Tema', 'Detalle', 'Punto', 'SELECT 1']);

  const select = async (text: ReturnType<Page['locator']>, start: number, end: number) => {
    await text.click();
    await text.evaluate((element, [start, end]) => {
      const selection = window.getSelection()!;
      selection.setBaseAndExtent(element.firstChild!, end, element.firstChild!, start);
    }, [start, end]);
  };
  const selectedText = () => page.evaluate(() => window.getSelection()?.toString());
  const format = async (name: string) => {
    await page.getByRole('button', { name: 'Formato', exact: true }).click();
    await page.getByRole('menuitem', { name, exact: true }).click();
    await expect(body).toBeFocused();
  };
  const heading = (level: number) => body.getByRole('heading', { level });

  await select(paragraphs.nth(0), 5, 15);
  await format('Título 1');
  await expect(heading(1)).toHaveText('Alfa beta gamma');
  expect(await selectedText()).toBe('beta gamma');
  await format('Negrita');
  await expect(heading(1).locator('strong')).toHaveText('beta gamma');
  await select(heading(1).locator('strong'), 5, 10);
  await format('Quitar formato');
  await expect(paragraphs.nth(0)).toHaveText('Alfa beta gamma');
  await expect(paragraphs.nth(0).locator('strong')).toHaveText('beta');
  expect(await selectedText()).toBe('gamma');
  expect(await paragraphs.nth(0).evaluate((element) => {
    const selection = window.getSelection()!;
    const offsetInParagraph = (node: Node, offset: number) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      range.setEnd(node, offset);
      return range.toString().length;
    };
    return [
      offsetInParagraph(selection.anchorNode!, selection.anchorOffset),
      offsetInParagraph(selection.focusNode!, selection.focusOffset),
    ];
  })).toEqual([15, 10]);
  await format('Título 1');

  await select(paragraphs.nth(0), 0, 4);
  await format('Título 2');
  await page.keyboard.press('Control+b');
  await expect(heading(2).locator('strong')).toHaveText('Tema');
  await format('Párrafo');
  await expect(paragraphs.nth(0).locator('strong')).toHaveText('Tema');
  await format('Título 2');
  await select(paragraphs.nth(0), 0, 7);
  await format('Título 3');

  await select(paragraphs.nth(0), 0, 5);
  await format('Título 3');
  await page.getByRole('button', { name: 'Lista', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Viñetas', exact: true }).click();
  await expect(body.locator('li p')).toHaveText('Punto');
  await format('Título 2');
  await format('Negrita');
  await expect(body.locator('li strong')).toHaveText('Punto');

  await select(paragraphs.nth(0), 0, 8);
  await page.getByRole('button', { name: 'Herramientas' }).click();
  await page.getByRole('menuitem', { name: 'Bloque de código' }).click();
  await page.getByRole('menuitem', { name: 'SQL' }).click();
  await expect(body.locator('code')).toHaveText('SELECT 1');
  await body.locator('code .code-keyword').click();
  await page.keyboard.press('Control+b');
  await format('Quitar formato');
  await expect(body.locator('code')).toHaveText('SELECT 1');
  await expect(body.locator('code strong')).toHaveCount(0);

  const checkFormat = async (note: Page) => {
    const content = note.getByRole('textbox', { name: 'Contenido' });
    await expect(note.getByRole('textbox', { name: 'Título' })).toHaveValue(title);
    await expect(content.locator('h1')).toHaveText('Alfa beta gamma');
    await expect(content.locator('h1 strong')).toHaveText('beta');
    await expect(content.locator('h2 strong')).toHaveText('Tema');
    await expect(content.locator('h3')).toHaveText('Detalle');
    await expect(content.locator('ul li p strong')).toHaveText('Punto');
    await expect(content.locator('[data-language="sql"] code')).toHaveText('SELECT 1');
  };
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Editar nota' })).toBeVisible();
  await page.reload();
  await checkFormat(page);

  const headers = await csrfHeaders(page);
  const invalid = [
    { type: 'heading', attrs: { level: 4 } },
    { type: 'paragraph', content: [{ type: 'text', text: 'Ajeno', marks: [{ type: 'italic' }] }] },
  ];
  for (const block of invalid) {
    const response = await page.request.post('/api/spaces/work/free-notes', {
      headers,
      data: {
        attemptId: '01918f5e-d001-7000-8000-000000000084',
        title: 'Formato ajeno',
        document: { type: 'doc', content: [block] },
      },
    });
    expect(response.status()).toBe(400);
  }
  await checkFreeNoteRestore(page, browser, sourceUser, title, checkFormat);
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
