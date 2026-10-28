import { test, expect, login, layout } from './fixtures';

test.describe.configure({ timeout: 90_000 });

test('multiline clipboard, persistence, scroll focus and compact layout', async ({ page, context, identity }, testInfo) => {
  await login(page, identity);
  await page.getByRole('link', { name: 'Notas', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Editor de nota diaria' });
  await expect(editor).toHaveAttribute('contenteditable', 'true');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const text = '  ñandú áé <> &\n\n  tareas: --- / #1\n';
  await page.evaluate(value => navigator.clipboard.writeText(value), text);
  await editor.click();
  await page.keyboard.press('Control+V');
  const paragraphs = editor.locator(':scope > p');
  await expect(paragraphs).toHaveCount(4);
  expect(await paragraphs.allTextContents()).toEqual(['  ñandú áé <> &', '', '  tareas: --- / #1', '']);
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Control+C');
  expect((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n')).toBe(text);
  await page.keyboard.press('Control+V');
  await expect(paragraphs).toHaveCount(4);
  expect(await paragraphs.allTextContents()).toEqual(['  ñandú áé <> &', '', '  tareas: --- / #1', '']);
  await expect(page.getByText('Guardado', { exact: true })).toBeVisible();
  await page.reload();
  await expect(editor).toHaveAttribute('contenteditable', 'true');
  await expect(paragraphs).toHaveCount(4);
  expect(await paragraphs.allTextContents()).toEqual(['  ñandú áé <> &', '', '  tareas: --- / #1', '']);
  await editor.click();
  await page.keyboard.press('Control+End');
  for (let i = 0; i < 35; i++) await page.keyboard.press('Enter');
  const viewport = page.locator('.daily-editor-viewport');
  await expect(viewport).toHaveCSS('box-shadow', /rgb\(138, 180, 248\)/);
  expect(await viewport.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  const nav = page.getByRole('navigation', { name: 'Navegación principal' });
  expect(await nav.evaluate(element => Boolean(element.closest('header')))).toBe(true);
  if (testInfo.project.name === 'desktop') {
    const title = (await page.getByRole('heading', { name: 'Notas diarias' }).boundingBox())!;
    const date = (await page.getByLabel('Fecha', { exact: true }).boundingBox())!;
    expect(Math.abs(title.y + title.height / 2 - date.y - date.height / 2)).toBeLessThan(4);
  }
  await layout(page);
});

test('remove a link only from the selected fragment and type beyond its end', async ({ page, identity }) => {
  await login(page, identity);
  await page.getByRole('link', { name: 'Notas', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Editor de nota diaria' });
  await expect(editor).toHaveAttribute('contenteditable', 'true');
  await editor.click();
  await page.keyboard.type('ABC / XYZ');
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Control+K');
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'URL' }).fill('https://ejemplo.test');
  await dialog.getByRole('button', { name: 'Guardar', exact: true }).click();
  const link = editor.locator('a');
  await expect(link).toHaveText('ABC / XYZ');
  await link.evaluate(element => {
    const range = document.createRange();
    range.setStart(element.firstChild!, 3);
    range.setEnd(element.firstChild!, 6);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  });
  await page.getByRole('button', { name: 'Editar enlace' }).click();
  await dialog.getByRole('button', { name: 'Quitar enlace' }).click();
  await expect(editor.locator('a')).toHaveCount(2);
  expect(await editor.locator('a').allTextContents()).toEqual(['ABC', 'XYZ']);
  await editor.focus();
  await page.keyboard.press('Control+End');
  await page.keyboard.type(' siguiente');
  await expect(editor.locator('a').last()).toHaveText('XYZ');
  await expect(editor).toHaveText('ABC / XYZ siguiente');
});
