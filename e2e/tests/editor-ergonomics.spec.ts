import { test, expect, login, layout, savedIndicator } from './fixtures';
import { openDailyTools } from './daily-helpers';

test.describe.configure({ timeout: 90_000 });

test('multiline clipboard, persistence, scroll focus and compact layout', async ({ page, context, identity, isMobile }) => {
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
  await expect(savedIndicator(page)).toBeVisible();
  await page.reload();
  await expect(editor).toHaveAttribute('contenteditable', 'true');
  await expect(paragraphs).toHaveCount(4);
  expect(await paragraphs.allTextContents()).toEqual(['  ñandú áé <> &', '', '  tareas: --- / #1', '']);
  await openDailyTools(page);
  await page.getByRole('button', { name: 'Copiar nota', exact: true }).click();
  await expect(page.getByText('Copiado', { exact: true })).toBeVisible();
  expect((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n')).toBe(text);
  if (isMobile) {
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Herramientas', exact: true })).toBeFocused();
  }
  await editor.click();
  await page.keyboard.press('Control+End');
  for (let i = 0; i < 35; i++) await page.keyboard.press('Enter');
  const viewport = page.locator('.daily-editor-viewport');
  await expect(viewport).toHaveCSS('box-shadow', /rgb\(138, 180, 248\)/);
  expect(await viewport.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  const nav = page.getByRole('navigation', { name: 'Navegación principal' });
  expect(await nav.evaluate(element => Boolean(element.closest('header')))).toBe(!isMobile);
  await expect(page.getByRole('heading', { level: 1, name: 'Notas diarias' })).toHaveCount(1);
  const toolbar = page.getByRole('group', { name: 'Herramientas del editor' });
  const controls = [
    toolbar.getByRole('button', { name: /^Cambiar fecha/ }),
    toolbar.getByRole('link', { name: /^(Hoy|Ir a hoy)$/ }),
    toolbar.getByRole('link', { name: 'Libres', exact: true }),
    toolbar.getByRole('button', { name: 'Guardar versión', exact: true }),
    ...(isMobile
      ? [toolbar.getByRole('button', { name: 'Herramientas', exact: true })]
      : [
          toolbar.getByRole('button', { name: /^(Agregar|Editar) enlace$/ }),
          toolbar.getByRole('button', { name: 'Copiar nota', exact: true }),
        ]),
  ];
  const centers: number[] = [];
  for (const control of controls) {
    const box = (await control.boundingBox())!;
    centers.push(box.y + box.height / 2);
  }
  expect(Math.max(...centers) - Math.min(...centers)).toBeLessThan(4);
  expect((await page.getByRole('banner').boundingBox())!.height).toBe(48);
  await layout(page);
});

test('multiline clipboard, persistence, scroll focus and compact layout: first line and reflow', async ({ page, identity, isMobile }) => {
  await login(page, identity);
  await page.getByRole('link', { name: 'Notas', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Editor de nota diaria' });
  await expect(editor).toHaveAttribute('contenteditable', 'true');
  // Medir el mismo estado estabilizado del diario vacío que se midió sobre main.
  await expect(page.getByText('Todavía no hay una nota anterior en Trabajo')).toBeVisible();
  const sizes = isMobile
    ? [{ width: 320, height: 559 }, { width: 375, height: 559 }]
    : [{ width: 768, height: 559 }, { width: 1280, height: 800 }];
  for (const size of sizes) {
    await page.setViewportSize(size);
    await editor.locator('p').first().scrollIntoViewIfNeeded();
    const lineTop = (await editor.locator('p').first().boundingBox())!.y;
    console.log(`T081_LINE_TOP ${size.width}x${size.height}: ${lineTop}px`);
    if (size.width === 768) {
      expect(lineTop).toBeLessThanOrEqual(110);
      expect(159.765625 - lineTop).toBeGreaterThanOrEqual(12);
    }
    const toolbar = page.getByRole('group', { name: 'Herramientas del editor' });
    const controls = toolbar.getByRole('button').or(toolbar.getByRole('link'));
    let previousRight = 0;
    for (const control of await controls.all()) {
      const box = (await control.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(size.width);
      // El orden visual coincide con el teclado y todos están en una fila al zoom base.
      expect(box.x).toBeGreaterThanOrEqual(previousRight);
      previousRight = box.x + box.width;
    }
    await layout(page);
  }
  await editor.focus();
  await expect(editor).toBeFocused();
  const viewport = page.locator('.daily-editor-viewport');
  await expect(viewport).toHaveCSS('box-shadow', /rgb\(138, 180, 248\)/);
  if (isMobile) {
    await page.setViewportSize({ width: 320, height: 380 });
    await editor.press('End');
    const firstLine = (await editor.locator('p').first().boundingBox())!;
    const nav = (await page.getByRole('navigation', { name: 'Navegación principal' }).boundingBox())!;
    expect(firstLine.y + firstLine.height).toBeLessThan(nav.y);
    await expect(editor).toBeFocused();
  }
});

test('compact daily notes: tools stay closed after crossing the breakpoint', async ({ page, identity, isMobile }) => {
  test.skip(!isMobile, 'Exercises the mobile tools dialog');
  await page.setViewportSize({ width: 375, height: 559 });
  await login(page, identity);
  await page.getByRole('link', { name: 'Notas', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Editor de nota diaria' });
  await expect(editor).toHaveAttribute('contenteditable', 'true');
  const tools = page.getByRole('button', { name: 'Herramientas', exact: true });
  const dialog = page.getByRole('dialog', { name: 'Herramientas' });
  await tools.click();
  await expect(dialog).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 559 });
  await expect(tools).toHaveCount(0);
  await expect(dialog).toHaveCount(0);
  await editor.focus();
  await expect(editor).toBeFocused();

  await page.setViewportSize({ width: 320, height: 559 });
  await expect(tools).toBeVisible();
  await expect(dialog).toHaveCount(0);
  await expect(editor).toBeFocused();

  await tools.click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(tools).toBeFocused();
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
  await openDailyTools(page);
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
