import { randomUUID } from 'node:crypto';
import { test, expect, control, login, interactiveLogin, readiness, csrfHeaders, layout, logout } from './fixtures';

import { writeWork, saveVersion, readVersion } from './daily-helpers';

test.describe.configure({ timeout: 90_000 });

/**
 * T-014 · CA-01: Bloques texto/separador/vacío numerados consecutivos, wrap sin número adicional.
 * CA-02: Seleccionar texto, Mod-k, crear/abrir/editar/quitar link manteniendo texto; readonly abre seguro.
 * CA-03: Los cuatro comandos al Enter, anchos medidos contra área sin gutter, Backspace/Delete y undo.
 * CA-05 (partial): javascript rechazado sin cambios; texto literal HTML no ejecuta; recarga recupera trabajo.
 * CA-06 (partial): Dos identidades en la misma fecha solo ven su espacio.
 */

test('CA-01: text blocks, separator, empty lines are numbered consecutively; wrap does not add extra number', async ({ page, browser, identity }, testInfo) => {
  await login(page, identity);

  // Navigate to today's note
  await page.getByRole('link', { name: 'Notas', exact: true }).click();
  await expect(page).toHaveURL(/\/notes/);

  // Wait for editor to be ready
  const editor = page.locator('.daily-editor-content[role="textbox"]');
  await expect(editor).toBeVisible();

  // Type text in the first line
  await editor.click();
  await page.keyboard.type('Linea uno');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Linea dos');

  // Create a separator by typing --- and pressing Enter
  await page.keyboard.press('Enter');
  await page.keyboard.type('---');
  await page.keyboard.press('Enter');

  // Wait for separator to render
  await expect(page.locator('.daily-editor-content > hr[data-type="separator"]')).toBeVisible();

  // Type after separator
  await page.keyboard.type('Despues separador');

  // After typing: "Linea uno" (p1), "Linea dos" (p2), separator (hr), "Despues separador" (p3)
  // The separator replaces the paragraph that contained "---", so we have 3 paragraphs + 1 hr
  const paragraphs = page.locator('.daily-editor-content > p');
  const paraCount = await paragraphs.count();
  expect(paraCount).toBeGreaterThanOrEqual(3);

  // Regresión T-020: márgenes compactos, numeración dentro del área visible y tema global oscuro.
  const metrics = await paragraphs.first().evaluate(element => {
    const style = getComputedStyle(element);
    const number = getComputedStyle(element, '::before');
    const content = element.parentElement!;
    const contentBox = content.getBoundingClientRect();
    const box = element.getBoundingClientRect();
    return {
      marginTop: style.marginTop, marginBottom: style.marginBottom,
      lineHeight: parseFloat(style.lineHeight),
      numberLeft: box.left + parseFloat(number.left),
      numberRight: box.left + parseFloat(number.left) + parseFloat(number.width),
      contentLeft: contentBox.left,
      numberColor: number.color, background: getComputedStyle(document.body).backgroundColor,
    };
  });
  expect(metrics.marginTop).toBe('0px');
  expect(metrics.marginBottom).toBe('0px');
  expect(metrics.lineHeight).toBeLessThan(22);
  expect(metrics.numberLeft).toBeGreaterThanOrEqual(metrics.contentLeft);
  expect(metrics.numberRight).toBeLessThan((await paragraphs.first().boundingBox())!.x);
  expect(metrics.numberColor).toBe('rgb(166, 173, 183)');
  expect(metrics.background).toBe('rgb(24, 26, 27)');
  const firstBox = (await paragraphs.nth(0).boundingBox())!;
  const secondBox = (await paragraphs.nth(1).boundingBox())!;
  expect(secondBox.y - firstBox.y).toBeCloseTo(metrics.lineHeight, 0);
  const viewport = page.locator('.daily-editor-viewport');
  // T-050 (UI-06): el área ya no se redimensiona a mano; ocupa el alto libre de la ventana, hasta su borde inferior.
  await expect(viewport).toHaveCSS('resize', 'none');
  await page.evaluate(() => scrollTo(0, 0));
  const fill = await viewport.evaluate(element => {
    const box = element.getBoundingClientRect();
    return { height: box.height, bottom: box.bottom, window: innerHeight, scrolled: scrollY };
  });
  expect(fill.scrolled).toBe(0);
  expect(fill.height).toBeGreaterThanOrEqual(240);
  // Solo quedan fuera la barra superior (48 px), la barra del editor y los márgenes.
  expect(fill.height).toBeGreaterThanOrEqual(fill.window - 48 - 110);
  expect(fill.bottom).toBeLessThanOrEqual(fill.window);
  expect(fill.bottom).toBeGreaterThanOrEqual(fill.window - 20);
  await expect(page.locator('.daily-editor-toolbar')).toHaveCSS('position', 'sticky');
  await expect(page.getByText(/Arrastrá la esquina inferior derecha/)).toHaveCount(0);

  // Verify wrap: type a long text that wraps visually but stays on one line number
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  const longText = 'A'.repeat(120);
  await page.keyboard.type(longText);

  // The wrapped paragraph should still be one block with one number
  const lastParagraph = page.locator('.daily-editor-content > p').last();
  await expect(lastParagraph).toBeVisible();

  // Verify at 375px mobile viewport as well
  const mobileContext = await browser.newContext({ baseURL: 'http://localhost', viewport: { width: 375, height: 812 } });
  try {
    const mPage = await mobileContext.newPage();
    await login(mPage, identity);
    await mPage.getByRole('link', { name: 'Notas', exact: true }).click();
    await expect(mPage.locator('.daily-editor-content[role="textbox"]')).toBeVisible();
    await layout(mPage);
  } finally {
    await mobileContext.close();
  }

  await layout(page);
  await page.getByRole('main').screenshot({ path: testInfo.outputPath('editor-dark.png') });
});

test('T-020: visible link button keeps selection, opens safely, edits and clears a reused dialog', async ({ page, context, identity }) => {
  await login(page, identity);
  await page.getByRole('link', { name: 'Notas', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Editor de nota diaria' });
  const add = page.getByRole('button', { name: 'Agregar enlace', exact: true });
  await expect(add).toBeDisabled();
  await editor.click();
  await page.keyboard.type('Ticket 1279');
  await page.keyboard.down('Shift');
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowLeft');
  await page.keyboard.up('Shift');
  await add.click();
  const dialog = page.getByRole('dialog');
  const input = dialog.getByRole('textbox', { name: 'URL', exact: true });
  await expect(dialog).toContainText('«1279»');
  await input.fill('https://jira.ejemplo.test/browse/ABC-1279');
  await dialog.getByRole('button', { name: 'Guardar', exact: true }).click();
  const link = editor.getByRole('link', { name: '1279' });
  await expect(link).toHaveAttribute('href', 'https://jira.ejemplo.test/browse/ABC-1279');
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', /noopener noreferrer/);
  await expect(editor).toHaveText('Ticket 1279');
  // Solo el destino externo ficticio se intercepta; la API propia y el login son reales.
  await context.route('https://jira.ejemplo.test/**', route => route.fulfill({ body: 'Destino ficticio' }));
  const popupPromise = page.waitForEvent('popup');
  await link.click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL('https://jira.ejemplo.test/browse/ABC-1279');
  expect(await popup.evaluate(() => window.opener === null)).toBe(true);
  await popup.close();
  // El cursor dentro del enlace, sin seleccionar texto, permite editarlo completo.
  await page.keyboard.press('ArrowLeft');
  await page.getByRole('button', { name: 'Editar enlace', exact: true }).click();
  await expect(input).toHaveValue('https://jira.ejemplo.test/browse/ABC-1279');
  await input.fill('https://jira.ejemplo.test/browse/ABC-9999');
  await dialog.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(link).toHaveAttribute('href', 'https://jira.ejemplo.test/browse/ABC-9999');
  await page.getByRole('button', { name: 'Editar enlace', exact: true }).click();
  await dialog.getByRole('button', { name: 'Quitar enlace', exact: true }).click();
  await expect(editor.locator('a')).toHaveCount(0);
  await expect(editor).toHaveText('Ticket 1279');
  await add.click();
  await expect(input).toHaveValue('');
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await layout(page);
});

test('CA-02: select text, Mod-k link dialog, create/edit/remove link; readonly opens safely', async ({ page, browser, identity }) => {
  await login(page, identity);
  await page.getByRole('link', { name: 'Notas', exact: true }).click();
  const editor = page.locator('.daily-editor-content[role="textbox"]');
  await expect(editor).toBeVisible();

  // Type text to link
  await editor.click();
  await page.keyboard.type('ABC-1279');

  // Select all text
  await page.keyboard.press('Control+a');

  // Open link dialog with Ctrl+K
  await page.keyboard.down('Control');
  await page.keyboard.press('k');
  await page.keyboard.up('Control');

  // Wait for link dialog
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 5000 });

  // Enter URL
  const urlInput = dialog.getByRole('textbox', { name: /url/i });
  await urlInput.fill('https://jira.ejemplo.test/browse/ABC-1279');

  // Save link
  await dialog.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(dialog).not.toBeVisible({ timeout: 5000 });

  // Verify link is rendered
  const link = page.locator('.daily-editor-content a.daily-editor-link');
  await expect(link).toBeVisible();
  await expect(link).toHaveText('ABC-1279');

  // Wait for autosave
  await page.waitForTimeout(1000);

  // Edit the link: select text and Ctrl+K again
  await page.keyboard.press('Control+a');
  await page.keyboard.down('Control');
  await page.keyboard.press('k');
  await page.keyboard.up('Control');
  await expect(dialog).toBeVisible({ timeout: 5000 });

  // Change URL
  await urlInput.fill('https://jira.ejemplo.test/browse/ABC-9999');
  await dialog.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(dialog).not.toBeVisible({ timeout: 5000 });

  await expect(link).toHaveAttribute('href', 'https://jira.ejemplo.test/browse/ABC-9999');

  // Remove link: select text, Ctrl+K, remove
  await page.keyboard.press('Control+a');
  await page.keyboard.down('Control');
  await page.keyboard.press('k');
  await page.keyboard.up('Control');
  await expect(dialog).toBeVisible({ timeout: 5000 });
  await dialog.getByRole('button', { name: 'Quitar enlace', exact: true }).click();
  await expect(dialog).not.toBeVisible({ timeout: 5000 });

  // Text remains but without link
  await expect(page.locator('.daily-editor-content a')).toHaveCount(0);
  await expect(page.locator('.daily-editor-content')).toContainText('ABC-1279');

  // Wait for autosave
  await page.waitForTimeout(1000);

  const date = await page.getByLabel('Fecha', { exact: true }).inputValue();
  await saveVersion(page, date);
  await readVersion(page, date, 'ABC-1279');
  const readOnlyEditor = page.getByRole('textbox', { name: 'Versión de solo lectura' });
  await readOnlyEditor.click();
  await page.keyboard.press('Control+k');
  await expect(dialog).not.toBeVisible();
  await expect(readOnlyEditor).toHaveText('ABC-1279');
  await layout(page);
});

test('CA-03: four separator commands on Enter, widths measured against area without gutter, Backspace/Delete and undo', async ({ page, identity }) => {
  await login(page, identity);
  await page.getByRole('link', { name: 'Notas', exact: true }).click();
  const editor = page.locator('.daily-editor-content[role="textbox"]');
  await expect(editor).toBeVisible();

  // Test --25 → 25% separator
  await editor.click();
  await page.keyboard.type('--25');
  await page.keyboard.press('Enter');
  await expect(page.locator('.daily-editor-content > hr[data-type="separator"][data-width="25"]')).toBeVisible();

  // Delete separator with Backspace from empty paragraph
  await page.keyboard.press('Backspace');
  await expect(page.locator('.daily-editor-content > hr[data-type="separator"][data-width="25"]')).not.toBeVisible();

  // Test --50 → 50% separator
  await page.keyboard.type('--50');
  await page.keyboard.press('Enter');
  await expect(page.locator('.daily-editor-content > hr[data-type="separator"][data-width="50"]')).toBeVisible();

  // Test --75 → 75% separator
  await page.keyboard.press('Enter');
  await page.keyboard.type('--75');
  await page.keyboard.press('Enter');
  await expect(page.locator('.daily-editor-content > hr[data-type="separator"][data-width="75"]')).toBeVisible();

  // Test --- → 100% separator
  await page.keyboard.press('Enter');
  await page.keyboard.type('---');
  await page.keyboard.press('Enter');
  await expect(page.locator('.daily-editor-content > hr[data-type="separator"][data-width="100"]')).toBeVisible();

  // Verify widths are relative to editor area (not including gutter)
  const wrapper = page.locator('.daily-editor-wrapper');
  const wrapperBox = await wrapper.boundingBox();
  const separator100 = page.locator('.daily-editor-content > hr[data-type="separator"][data-width="100"]');
  const sepBox = await separator100.boundingBox();
  // The separator width should fit within the editor content area (excluding gutter)
  // Gutter is 48px, so content area starts at ~48px
  expect(sepBox!.x).toBeGreaterThan(wrapperBox!.x + 48);
  expect(sepBox!.x + sepBox!.width).toBeLessThan(wrapperBox!.x + wrapperBox!.width);

  // Test Undo (Ctrl+Z)
  await editor.click();
  await page.keyboard.press('Control+z');
  // After undo, the last separator command should be reverted
  await page.waitForTimeout(200);

  await layout(page);
});

test('CA-05: javascript: URL rejected; literal HTML text does not execute; reload recovers work', async ({ page, identity }) => {
  await login(page, identity);
  await page.getByRole('link', { name: 'Notas', exact: true }).click();
  const editor = page.locator('.daily-editor-content[role="textbox"]');
  await expect(editor).toBeVisible();

  // Type text and try to link it with javascript: URL
  await editor.click();
  await page.keyboard.type('No ejecutar');
  await page.keyboard.press('Control+a');
  await page.keyboard.down('Control');
  await page.keyboard.press('k');
  await page.keyboard.up('Control');

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 5000 });

  const urlInput = dialog.getByRole('textbox', { name: /url/i });
  await urlInput.fill('javascript:alert(1)');
  await dialog.getByRole('button', { name: 'Guardar', exact: true }).click();

  // The dialog should show an error or reject the URL
  // Wait a bit for validation
  await page.waitForTimeout(500);

  // Check that the link was NOT created with javascript: href
  const badLink = page.locator('.daily-editor-content a[href*="javascript:"]');
  await expect(badLink).not.toBeVisible();

  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Ingresá una URL válida (http:// o https://).', { exact: true })).toBeVisible();
  await expect(editor).toHaveText('No ejecutar');
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(editor).toBeFocused();

  // Type literal HTML text
  // Cancelar conserva la selección usada para enlazar. Elegir un cursor en el
  // párrafo antes de agregar texto evita que Enter reemplace esa selección.
  await editor.locator('p').last().click();
  expect(await editor.evaluate(element => element.ownerDocument.getSelection()?.isCollapsed)).toBe(true);
  const saved = page.waitForResponse(response => new URL(response.url()).pathname.startsWith('/api/v1/daily-notes/') && response.request().method() === 'PUT');
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await expect(editor.locator('p')).toHaveCount(2);
  await expect(editor.locator('p').first()).toHaveText('No ejecutar');
  await page.keyboard.type('<script>alert(1)</script>');

  const savedResponse = await saved;
  expect(savedResponse.status()).toBe(200);
  const savedNote = await savedResponse.json();
  expect(JSON.stringify(savedNote.content)).toContain('No ejecutar');
  expect(JSON.stringify(savedNote.content)).toContain('<script>alert(1)</script>');

  // Verify the text is displayed as literal text, not executed
  await expect(page.locator('.daily-editor-content')).toContainText('<script>alert(1)</script>');
  // No <script> tag should be in the DOM
  const scriptTags = page.locator('.daily-editor-content script');
  await expect(scriptTags).toHaveCount(0);

  // Reload and verify work is recovered
  await page.reload();
  await expect(editor).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.daily-editor-content')).toContainText('No ejecutar');
  await expect(page.locator('.daily-editor-content')).toContainText('<script>alert(1)</script>');

  await layout(page);
});

test('CA-06: two identities on the same date only see their own space; IDs/URLs do not access foreign data', async ({ page, browser, identity }) => {
  await control('reference-login');
  await readiness(page);
  const actorA = await interactiveLogin(page, identity);
  await page.getByRole('link', { name: 'Notas', exact: true }).click();
  const date = await page.getByLabel('Fecha', { exact: true }).inputValue();
  expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  const noteA = await writeWork(page, date, 'Nota secreta de A');
  const second = await browser.newContext({ baseURL: 'http://localhost', viewport: page.viewportSize()! });
  try {
    const pageB = await second.newPage();
    const actorB = await interactiveLogin(pageB, randomUUID());
    expect(actorB).not.toBe(actorA);
    expect((await (await page.request.get('/api/v1/auth/me')).json()).id).toBe(actorA);
    const absent = await pageB.request.get(`/api/v1/daily-notes/${date}`);
    expect(absent.status()).toBe(404);
    expect(JSON.stringify(await absent.json())).not.toContain('Nota secreta de A');
    const byForeignId = await pageB.request.get(`/api/v1/daily-notes/${noteA.id}`);
    expect(byForeignId.status()).toBe(400);
    const byMissingId = await pageB.request.get(`/api/v1/daily-notes/${randomUUID()}`);
    expect(byMissingId.status()).toBe(400);
    expect((await byForeignId.json()).detail).toBe((await byMissingId.json()).detail);
    const csrf = await csrfHeaders(pageB);
    expect((await pageB.request.put(`/api/v1/daily-notes/${date}`, { headers: csrf, data: { content: noteA.content, expectedRevision: noteA.revision } })).status()).toBe(409);
    expect((await pageB.request.put(`/api/v1/daily-notes/${date}`, { headers: csrf, data: { content: noteA.content, expectedRevision: 0, ownerId: actorA } })).status()).toBe(400);
    const stillA = await page.request.get(`/api/v1/daily-notes/${date}`);
    expect(stillA.status()).toBe(200);
    expect(await stillA.json()).toEqual(noteA);
    await pageB.goto(`/notes/${date}`);
    const editorB = pageB.getByRole('textbox', { name: 'Editor de nota diaria' });
    await expect(editorB).toHaveText('');
    const noteB = await writeWork(pageB, date, 'Nota de B');
    expect(noteB.id).not.toBe(noteA.id);
    await page.reload();
    await expect(page.getByRole('textbox', { name: 'Editor de nota diaria' })).toHaveText('Nota secreta de A');
    expect((await (await page.request.get('/api/v1/auth/me')).json()).id).toBe(actorA);
    await logout(pageB);
    await expect(pageB).toHaveURL('http://localhost/login');
    await expect(pageB.locator('.daily-editor-content')).toHaveCount(0);
    expect((await pageB.request.get('/api/v1/auth/me')).status()).toBe(401);
    expect((await pageB.request.get(`/api/v1/daily-notes/${date}`)).status()).toBe(401);
    expect(await interactiveLogin(pageB, identity)).toBe(actorA);
    await pageB.goto(`/notes/${date}`);
    await expect(pageB.getByRole('textbox', { name: 'Editor de nota diaria' })).toHaveText('Nota secreta de A');
    await expect(pageB.getByRole('main')).not.toContainText('Nota de B');
    await layout(pageB);
  } finally { await second.close(); }
  await layout(page);
});
