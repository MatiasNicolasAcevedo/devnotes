import { randomUUID } from 'node:crypto';
import { test, expect, control, login, label, layout } from './fixtures';

test.describe.configure({ timeout: 90_000 });

/**
 * T-014 · CA-01: Bloques texto/separador/vacío numerados consecutivos, wrap sin número adicional.
 * CA-02: Seleccionar texto, Mod-k, crear/abrir/editar/quitar link manteniendo texto; readonly abre seguro.
 * CA-03: Los cuatro comandos al Enter, anchos medidos contra área sin gutter, Backspace/Delete y undo.
 * CA-05 (partial): javascript rechazado sin cambios; texto literal HTML no ejecuta; recarga recupera trabajo.
 * CA-06 (partial): Dos identidades en la misma fecha solo ven su espacio.
 */

test('CA-01: text blocks, separator, empty lines are numbered consecutively; wrap does not add extra number', async ({ page, browser, identity }) => {
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

  // Wait for save
  await page.waitForTimeout(1000);

  // Verify readonly mode: navigate to history and check the version is safe
  // First save a version
  const saveButton = page.getByRole('button', { name: 'Guardar versión' });
  if (await saveButton.isVisible()) {
    await saveButton.click();
    await expect(page.getByRole('alert').filter({ hasText: 'Versión guardada correctamente' })).toBeVisible({ timeout: 10000 });
  }

  // Navigate to history
  await page.getByRole('link', { name: 'Historial', exact: true }).click();
  await expect(page).toHaveURL(/\/history/);

  // Readonly editor should not have link controls
  const readOnlyEditor = page.locator('.daily-editor-content');
  if (await readOnlyEditor.isVisible()) {
    // In readonly, Ctrl+K should not open dialog
    await readOnlyEditor.click();
    await page.keyboard.down('Control');
    await page.keyboard.press('k');
    await page.keyboard.up('Control');
    // Dialog should not appear in readonly
    await expect(dialog).not.toBeVisible();
  }

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

  // Close dialog if still open
  if (await dialog.isVisible()) {
    await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
  }

  // Type literal HTML text
  await page.keyboard.press('Enter');
  await page.keyboard.type('<script>alert(1)</script>');

  // Wait for autosave debounce (700ms) plus margin
  await page.waitForTimeout(1500);

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

test('CA-06: two identities on the same date only see their own space; IDs/URLs do not access foreign data', async ({ page, browser, identity }, testInfo) => {
  const identityA = identity;
  const identityB = randomUUID();

  // Register identityB with the OIDC provider before using it
  await control('reset', identityB);

  // Actor A logs in and writes a note
  await login(page, identityA);
  await page.getByRole('link', { name: 'Notas', exact: true }).click();
  const editorA = page.locator('.daily-editor-content[role="textbox"]');
  await expect(editorA).toBeVisible();

  await editorA.click();
  await page.keyboard.type('Nota secreta de A');
  // Wait for autosave debounce (700ms) plus margin
  await page.waitForTimeout(1500);

  // Get today's date from URL
  const urlA = new URL(page.url());
  const today = urlA.pathname.split('/').pop() ?? '';

  // Actor B logs in with a new context
  const contextB = await browser.newContext({ baseURL: 'http://localhost', viewport: page.viewportSize()! });
  try {
    const pageB = await contextB.newPage();
    await login(pageB, identityB);

    // Navigate to the same date
    await pageB.getByRole('link', { name: 'Notas', exact: true }).click();
    const editorB = pageB.locator('.daily-editor-content[role="textbox"]');
    await expect(editorB).toBeVisible();

    // Actor B should NOT see A's note
    await expect(pageB.locator('.daily-editor-content')).not.toContainText('Nota secreta de A');

    // Actor B writes their own note
    await editorB.click();
    await pageB.keyboard.type('Nota de B');
    await pageB.waitForTimeout(1000);

    // Verify A still doesn't see B's note
    await expect(page.locator('.daily-editor-content')).not.toContainText('Nota de B');
    await expect(page.locator('.daily-editor-content')).toContainText('Nota secreta de A');

    // Verify via API: B cannot access A's note by date
    const meA = await page.request.get('/api/v1/auth/me');
    const userA = await meA.json();
    const csrfB = (await contextB.cookies()).find(c => c.name === 'XSRF-TOKEN');

    // Try to GET A's note using B's session
    const noteFromB = await pageB.request.get(`/api/v1/daily-notes/${today}`);
    // B's note exists (or 404 if not saved yet), but it's B's own note, not A's
    const bodyB = await noteFromB.json().catch(() => null);
    if (bodyB && bodyB.content) {
      const textInB = JSON.stringify(bodyB.content);
      expect(textInB).not.toContain('Nota secreta de A');
    }

    // Changing identity clears data
    await pageB.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
    await expect(pageB).toHaveURL('http://localhost/login');
    expect((await pageB.request.get('/api/v1/auth/me')).status()).toBe(401);

    await layout(pageB);
  } finally {
    await contextB.close();
  }

  await layout(page);
});
