import type { BrowserContext, CDPSession, Locator, Page } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { writeWork } from './daily-helpers';
import { expect, keyboardActivate, login, savedIndicator, test } from './fixtures';

const title = 'Copiar texto de una captura';
const fixtureText = 'T-070\nERR_CONNECTION_RESET\n/src/api/fixture.ts';
const correctedText = 'T-070 corregida\nERR_CONNECTION_RESET\n/src/api/fixture.ts';
const date = '2026-11-18';
const notePath = `/api/v1/daily-notes/${date}`;
const extractionPath = '/api/v1/ocr/extractions';

function fixture(name: string) {
  return fileURLToPath(new URL(`../fixtures/ocr/${name}`, import.meta.url));
}

function tools(page: Page) {
  return page.getByRole('button', { name: 'Herramientas', exact: true });
}

function result(dialog: Locator) {
  return dialog.getByRole('textbox', { name: 'Texto extraído' });
}

async function openOcr(page: Page, mobile: boolean) {
  if (mobile) {
    await tools(page).tap();
  } else {
    await keyboardActivate(page, 'button', 'Herramientas');
  }
  const item = page.getByRole('menuitem', { name: title, exact: true });
  await expect(item).toBeEnabled();
  if (mobile) {
    await item.tap();
  } else {
    if (!await item.evaluate(node => node === document.activeElement)) {
      await page.keyboard.press('ArrowDown');
    }
    await expect(item).toBeFocused();
    await page.keyboard.press('Enter');
  }
  const dialog = page.getByRole('dialog', { name: title, exact: true });
  await expect(dialog).toBeVisible();
  return dialog;
}

function observeOcr(page: Page) {
  const extractions: string[] = [];
  const writes: string[] = [];
  page.on('request', request => {
    const url = new URL(request.url());
    if (request.method() === 'POST' && url.pathname === extractionPath) {
      extractions.push(url.searchParams.get('space') ?? '');
    }
    if (['PUT', 'POST', 'PATCH', 'DELETE'].includes(request.method()) &&
        url.pathname.startsWith('/api/v1/daily-')) {
      writes.push(url.pathname);
    }
  });
  return { extractions, writes };
}

async function expectPreview(dialog: Locator) {
  const preview = dialog.getByRole('img', { name: 'Vista previa de la captura' });
  await expect(preview).toBeVisible();
  await expect.poll(() => preview.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(440);
  await expect(dialog.getByText('Se enviará la imagen completa a OCR.space.')).toBeVisible();
}

function extractionResponse(page: Page, space: string) {
  return page.waitForResponse(response => {
    const url = new URL(response.url());
    return url.origin === 'http://localhost' && url.pathname === extractionPath &&
      url.searchParams.get('space') === space && response.request().method() === 'POST';
  });
}

async function expectExtracted(response: Awaited<ReturnType<typeof extractionResponse>>, dialog: Locator) {
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ text: fixtureText });
  await expect(result(dialog)).toHaveValue(fixtureText);
}

async function captureLayout(
  dialog: Locator, width: number, height: number, mobile: boolean, name: string, cdp?: CDPSession,
) {
  const wide = width === 1280;
  const field = result(dialog);
  const preview = dialog.getByAltText('Vista previa de la captura');
  const close = dialog.getByRole('button', { name: 'Cerrar', exact: true });
  const copy = dialog.getByRole('button', { name: 'Copiar texto', exact: true });
  await expect.poll(() => dialog.evaluate(element => {
    const body = element.querySelector('.ocr-dialog-content')!;
    const bounds = element.getBoundingClientRect();
    return document.documentElement.scrollWidth <= innerWidth &&
      bounds.left >= 0 && bounds.right <= innerWidth &&
      bounds.top >= 0 && bounds.bottom <= innerHeight &&
      body.scrollWidth <= body.clientWidth;
  })).toBe(true);
  const bounds = (await dialog.boundingBox())!;
  const capture = (await dialog.getByRole('heading', { name: 'Captura', exact: true }).boundingBox())!;
  const textHeading = (await dialog.getByText('Texto extraído', { exact: true }).boundingBox())!;
  expect(bounds.width).toBe(mobile ? width : Math.min(1120, width - 24));
  if (mobile) expect(bounds.height).toBe(height);
  expect((await close.boundingBox())!.height).toBeGreaterThanOrEqual(mobile ? 48 : 44);
  expect((await copy.boundingBox())!.height).toBeGreaterThanOrEqual(mobile ? 48 : 44);
  await expect(field).toHaveCSS('font-size', '16px');
  if (wide) {
    await expect(preview).toBeVisible();
    expect(textHeading.x).toBeGreaterThan(capture.x);
    expect((await field.boundingBox())!.width).toBeGreaterThanOrEqual(400);
    expect(textHeading.y).toBeCloseTo(capture.y);
  } else {
    await expect(preview).toBeHidden();
    expect(textHeading.x).toBeCloseTo(capture.x);
    expect(textHeading.y).toBeGreaterThan(capture.y);
  }
  // Only the known dialog is captured. Its contents are the synthetic image and text.
  const path = `/artifacts/ocr-layout/${name}.png`;
  if (cdp) {
    // The Playwright screenshot helper can restore its own viewport during a CDP metrics override.
    const { data } = await cdp.send('Page.captureScreenshot', {
      format: 'png', clip: { ...bounds, scale: 1 },
    });
    await writeFile(path, Buffer.from(data, 'base64'));
  } else {
    await dialog.screenshot({ path, animations: 'disabled' });
  }
}

async function desktopJourney(page: Page, context: BrowserContext, identity: string) {
  await page.setViewportSize({ width: 400, height: 768 });
  await login(page, identity);
  await page.goto(`/notes/${date}?space=work`);
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost' });
  const editor = page.getByRole('textbox', { name: 'Editor de nota diaria' });
  const note = 'Borrador ficticio';
  await writeWork(page, date, note);
  // Start with a saved baseline and an independent edit in the same editor's history.
  const saveEdit = page.waitForResponse(response =>
    new URL(response.url()).pathname === notePath && response.request().method() === 'PUT');
  await editor.press('End');
  await page.keyboard.insertText(' pendiente');
  const saved = await saveEdit;
  expect(saved.status()).toBe(200);
  const savedNote = await saved.json();
  await expect(savedIndicator(page)).toBeVisible();
  await editor.press('ArrowLeft');
  const originalEditor = await editor.elementHandle();
  const cursor = await editor.evaluate(node => node.ownerDocument.getSelection()?.anchorOffset);
  expect(cursor).toBe(`${note} pendiente`.length - 1);

  const traffic = observeOcr(page);
  const dialog = await openOcr(page, false);
  const paste = dialog.getByRole('group', { name: 'Zona para pegar una captura' });
  const choose = dialog.getByRole('button', { name: /^Elegir.*imagen$/ });
  await expect(paste).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Cerrar', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(paste).toBeFocused();
  const hint = paste.getByText('Pegá tu imagen acá', { exact: true });
  await expect(hint).toBeVisible();
  await expect(result(dialog)).toHaveCount(0);
  const bounds = (await hint.boundingBox())!;
  const middle = bounds.y + bounds.height / 2;
  await page.mouse.move(bounds.x + 1, middle);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width - 1, middle, { steps: 8 });
  await page.mouse.up();
  expect(await page.evaluate(() => getSelection()?.toString())).toBe('');
  await expect(paste).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(choose).toBeFocused();
  // Chromium can re-encode OS clipboard images. Deliver the exact fixture at the browser paste boundary.
  await choose.evaluate((node, bytes) => {
    const clipboardData = new DataTransfer();
    clipboardData.items.add(new File([new Uint8Array(bytes)], 'image', { type: 'image/png' }));
    node.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData }));
  }, [...await readFile(fixture('terminal.png'))]);
  await expectPreview(dialog);
  await expect(hint).toHaveCount(0);
  expect(traffic.extractions).toEqual([]);
  const extract = dialog.getByRole('button', { name: 'Extraer texto', exact: true });
  await expect(choose).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(extract).toBeFocused();
  const extraction = extractionResponse(page, 'work');
  await page.keyboard.press('Enter');
  await expectExtracted(await extraction, dialog);
  await expect(result(dialog)).toBeFocused();
  expect(traffic.extractions).toEqual(['work']);

  await result(dialog).fill(correctedText);
  await page.keyboard.press('Tab');
  const copy = dialog.getByRole('button', { name: 'Copiar texto', exact: true });
  await expect(copy).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(dialog.getByRole('status').filter({ hasText: 'Texto copiado' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(correctedText);

  for (const width of [400, 480, 640, 1280]) {
    await page.setViewportSize({ width, height: 768 });
    await captureLayout(dialog, width, 768, false, `desktop-${width}`);
  }
  await page.setViewportSize({ width: 640, height: 384 });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 640, height: 384, deviceScaleFactor: 2, mobile: false,
  });
  await expect.poll(() => page.evaluate(() => [innerWidth, innerHeight, devicePixelRatio])).toEqual([640, 384, 2]);
  await captureLayout(dialog, 640, 384, false, 'desktop-zoom-200-simulado', cdp);
  await cdp.send('Emulation.clearDeviceMetricsOverride');
  await cdp.detach();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(tools(page)).toBeFocused();
  await expect(editor).toHaveText(`${note} pendiente`);
  await editor.focus();
  expect(await editor.evaluate((node, before) => node === before, originalEditor)).toBe(true);
  expect(await editor.evaluate(node => node.ownerDocument.getSelection()?.anchorOffset)).toBe(cursor);
  expect(traffic.writes).toEqual([]);
  const persisted = await page.request.get(`${notePath}?space=work`);
  expect(persisted.status()).toBe(200);
  expect(await persisted.json()).toEqual(savedNote);
  await editor.press('Control+z');
  await expect(editor).toHaveText(note);
  await expect(savedIndicator(page)).toBeVisible();

  const quotaDialog = await openOcr(page, false);
  await quotaDialog.getByLabel('Archivo de la captura').setInputFiles(fixture('quota.png'));
  await expectPreview(quotaDialog);
  expect(traffic.extractions).toEqual(['work']);
  const quotaResponse = extractionResponse(page, 'work');
  await quotaDialog.getByRole('button', { name: 'Extraer texto', exact: true }).click();
  const quota = await quotaResponse;
  expect(quota.status()).toBe(429);
  expect(await quota.json()).toMatchObject({ code: 'OCR_QUOTA_EXHAUSTED' });
  await expect(quotaDialog.getByRole('alert')).toHaveText('Se alcanzó el límite de OCR.space. Probá más tarde.');
  await expect(result(quotaDialog)).toHaveCount(0);
  expect(traffic.extractions).toEqual(['work', 'work']);
}

async function mobileJourney(page: Page, context: BrowserContext, identity: string) {
  await login(page, identity);
  await page.goto(`/notes/${date}?space=personal`);
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost' });
  const note = 'Borrador Personal ficticio';
  const savedNote = await writeWork(page, date, note);
  const traffic = observeOcr(page);
  const dialog = await openOcr(page, true);
  const chooser = page.waitForEvent('filechooser');
  await dialog.getByRole('button', { name: 'Elegir imagen', exact: true }).tap();
  await (await chooser).setFiles(fixture('terminal.jpg'));
  await expectPreview(dialog);
  expect(traffic.extractions).toEqual([]);

  const extraction = extractionResponse(page, 'personal');
  await dialog.getByRole('button', { name: 'Extraer texto', exact: true }).tap();
  await expectExtracted(await extraction, dialog);
  const field = result(dialog);
  await expect(field).not.toBeFocused();
  expect(traffic.extractions).toEqual(['personal']);
  for (const width of [360, 375, 390]) {
    await page.setViewportSize({ width, height: 812 });
    await captureLayout(dialog, width, 812, true, `mobile-${width}`);
  }
  await dialog.getByRole('button', { name: 'Ver captura', exact: true }).tap();
  await expect(dialog.getByAltText('Vista previa de la captura')).toBeVisible();
  await dialog.getByRole('button', { name: 'Ocultar captura', exact: true }).tap();
  await expect(dialog.getByAltText('Vista previa de la captura')).toBeHidden();
  await page.setViewportSize({ width: 640, height: 280 });
  const cdp = await context.newCDPSession(page);
  const insets = { top: 12, right: 24, bottom: 16, left: 24 };
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets });
  for (const [edge, pixels] of Object.entries(insets)) {
    await expect(dialog).toHaveCSS(`padding-${edge}`, `${pixels}px`);
  }
  await field.tap();
  await expect(field).toBeFocused();
  await expect(field).toBeInViewport();
  await field.fill(correctedText);
  const copy = dialog.getByRole('button', { name: 'Copiar texto', exact: true });
  await copy.tap();
  await expect(copy).toBeInViewport();
  await expect(dialog.getByRole('status').filter({ hasText: 'Texto copiado' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(correctedText);
  await captureLayout(dialog, 640, 280, true, 'mobile-640x280');
  const close = dialog.getByRole('button', { name: 'Cerrar', exact: true });
  await expect(close).toBeInViewport();
  const closeBounds = (await close.boundingBox())!;
  expect(closeBounds.y).toBeGreaterThanOrEqual(insets.top);
  expect(closeBounds.x + closeBounds.width).toBeLessThanOrEqual(640 - insets.right);
  await close.tap();
  await cdp.detach();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Editor de nota diaria' })).toHaveText(note);
  expect(traffic.writes).toEqual([]);
  const persisted = await page.request.get(`${notePath}?space=personal`);
  expect(persisted.status()).toBe(200);
  expect(await persisted.json()).toEqual(savedNote);
}

test('screenshot OCR: extract through the proxy, edit and return to the daily note', async ({
  page, context, identity, isMobile,
}) => {
  await (isMobile ? mobileJourney : desktopJourney)(page, context, identity);
});
