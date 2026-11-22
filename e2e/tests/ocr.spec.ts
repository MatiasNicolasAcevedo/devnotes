import type { BrowserContext, CDPSession, Locator, Page } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { writeWork } from './daily-helpers';
import { expect, keyboardActivate, login, savedIndicator, test } from './fixtures';

const title = 'Imagen a texto';
const fixtureText = 'T-070\nERR_CONNECTION_RESET\n/src/api/fixture.ts';
const correctedText = 'T-070 corregida\nERR_CONNECTION_RESET\n/src/api/fixture.ts';
const date = '2026-11-18';
const notePath = `/api/v1/daily-notes/${date}`;
const extractionPath = '/api/v1/ocr/extractions';

function fixture(name: string) {
  return fileURLToPath(new URL(`../fixtures/ocr/${name}`, import.meta.url));
}

function result(image: Locator) {
  return image.getByRole('textbox', { name: 'Texto extraído' });
}

async function openImage(page: Page, mobile: boolean, space: string) {
  await expect(page.getByRole('button', { name: 'Herramientas', exact: true })).toHaveCount(0);
  const link = page.getByRole('link', { name: 'Imagen', exact: true });
  await expect(link).toHaveAttribute('href', `/image?space=${space}`);
  if (mobile) await link.tap();
  else await keyboardActivate(page, 'link', 'Imagen');
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await expect(link).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('button', { name: `Espacio: ${space === 'work' ? 'Trabajo' : 'Personal'}` })).toBeVisible();
  return page.getByRole('main');
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

async function expectPreview(image: Locator) {
  const preview = image.getByRole('img', { name: 'Vista previa de la captura' });
  await expect(preview).toBeVisible();
  await expect.poll(() => preview.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(440);
  await expect(image.getByText('Se enviará la imagen completa a OCR.space.')).toBeVisible();
}

function extractionResponse(page: Page, space: string) {
  return page.waitForResponse(response => {
    const url = new URL(response.url());
    return url.origin === 'http://localhost' && url.pathname === extractionPath &&
      url.searchParams.get('space') === space && response.request().method() === 'POST';
  });
}

async function expectExtracted(response: Awaited<ReturnType<typeof extractionResponse>>, image: Locator) {
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ text: fixtureText });
  await expect(result(image)).toHaveValue(fixtureText);
}

async function captureLayout(
  page: Page, image: Locator, width: number, height: number, name: string, cdp?: CDPSession,
) {
  if (!cdp) await page.setViewportSize({ width, height });
  const wide = width >= 912;
  const narrowNavigation = width < 768;
  const nav = page.getByRole('navigation', { name: 'Navegación principal' });
  const links = nav.getByRole('link');
  await expect(links).toHaveText([
    ...(narrowNavigation ? ['Notas', 'Voz'] : ['Voz', 'Notas']),
    'Referencias', 'Imagen', 'Historial',
  ]);
  await expect(page.getByRole('link', { name: 'Imagen', exact: true })).toHaveCSS('color', 'rgb(255, 183, 77)');
  await expect.poll(() => page.evaluate(() => {
    const main = document.querySelector('main')!;
    const banner = document.querySelector('header')!;
    return document.documentElement.scrollWidth <= innerWidth &&
      main.scrollWidth <= main.clientWidth && banner.scrollWidth <= banner.clientWidth;
  })).toBe(true);
  const tabBounds = await links.evaluateAll(elements => elements.map(element => {
    const { width, height, top, bottom, left, right } = element.getBoundingClientRect();
    return { width, height, top, bottom, left, right };
  }));
  for (const tab of tabBounds) {
    expect(tab.left).toBeGreaterThanOrEqual(0);
    expect(tab.right).toBeLessThanOrEqual(width);
    expect(tab.bottom).toBeLessThanOrEqual(height);
    expect(tab.top).toBe(tabBounds[0].top);
    if (narrowNavigation) {
      expect(Math.abs(tab.width - tabBounds[0].width)).toBeLessThanOrEqual(0.05);
      expect(tab.height).toBeGreaterThanOrEqual(48);
    }
  }
  if (narrowNavigation) {
    const reference = links.filter({ hasText: 'Referencias' });
    expect(await reference.evaluate(element => {
      const label = [...element.childNodes].find(node => node.nodeType === Node.TEXT_NODE)!;
      const range = document.createRange();
      range.selectNodeContents(label);
      return range.getClientRects().length;
    })).toBe(1);
  }
  const field = result(image);
  const preview = image.getByAltText('Vista previa de la captura');
  const copy = image.getByRole('button', { name: 'Copiar texto', exact: true });
  expect((await copy.boundingBox())!.height).toBeGreaterThanOrEqual(width < 768 ? 48 : 44);
  await expect(field).toHaveCSS('font-size', '16px');
  const capture = (await image.getByRole('heading', { name: 'Captura', exact: true }).boundingBox())!;
  const textHeading = (await image.getByText('Texto extraído', { exact: true }).boundingBox())!;
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
  const path = `/artifacts/ocr-layout/${name}.png`;
  if (cdp) {
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
    await writeFile(path, Buffer.from(data, 'base64'));
  } else {
    await page.screenshot({ path, animations: 'disabled' });
  }
}

async function dispatchDrop(
  zone: Locator, kind: string, bytes: number[], extra?: { type: string; value: string },
) {
  return zone.evaluate((node, { kind, bytes, extra }) => {
    const dataTransfer = new DataTransfer();
    if (kind === 'url') dataTransfer.setData('text/uri-list', 'https://fixture.invalid/demo.png');
    else if (kind === 'text') dataTransfer.setData('text/plain', 'Texto ficticio');
    else if (kind === 'invalid') dataTransfer.items.add(new File(['fixture'], 'captura.gif', { type: 'image/gif' }));
    else if (kind === 'large') dataTransfer.items.add(new File([new Uint8Array(1_000_001)], 'grande.png', { type: 'image/png' }));
    else {
      dataTransfer.items.add(new File([new Uint8Array(bytes)], 'terminal.png', { type: 'image/png' }));
      if (kind === 'multiple') dataTransfer.items.add(new File(['fixture'], 'otra.png', { type: 'image/png' }));
    }
    if (extra) dataTransfer.items.add(extra.value, extra.type);
    const dragover = new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer });
    node.dispatchEvent(dragover);
    const drop = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer });
    node.dispatchEvent(drop);
    return dragover.defaultPrevented && drop.defaultPrevented;
  }, { kind, bytes, extra });
}

async function checkDrops(zone: Locator, image: Locator) {
  const bytes = [...await readFile(fixture('terminal.png'))];
  const original = image.getByAltText('Vista previa de la captura');
  const previousUrl = await original.getAttribute('src');
  for (const [kind, message] of [
    ['multiple', 'Soltá un solo archivo PNG o JPG.'],
    ['url', 'Soltá un solo archivo PNG o JPG.'],
    ['text', 'Soltá un solo archivo PNG o JPG.'],
    ['invalid', 'Elegí una imagen PNG o JPG.'],
    ['large', 'Elegí una imagen de hasta 1 MB.'],
    ['valid', null],
  ] as const) {
    const prevented = await dispatchDrop(zone, kind, bytes);
    expect(prevented).toBe(true);
    if (message) {
      await expect(image.getByRole('alert')).toHaveText(message);
      await expect(original).toHaveAttribute('src', previousUrl!);
    }
  }
  await expect(original).not.toHaveAttribute('src', previousUrl!);
  await expect(image.getByRole('alert')).toHaveCount(0);
}

async function desktopJourney(page: Page, context: BrowserContext, identity: string) {
  await page.setViewportSize({ width: 400, height: 768 });
  await login(page, identity);
  await page.goto(`/notes/${date}?space=work`);
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost' });
  const editor = page.getByRole('textbox', { name: 'Editor de nota diaria' });
  const note = 'Borrador ficticio';
  await writeWork(page, date, note);
  const traffic = observeOcr(page);
  const saveEdit = page.waitForResponse(response =>
    new URL(response.url()).pathname === notePath && response.request().method() === 'PUT');
  await editor.press('End');
  await page.keyboard.insertText(' pendiente');
  const image = await openImage(page, false, 'work');
  // Ir a Imagen mientras está pendiente la edición deja que el diario guarde antes de salir.
  const saved = await saveEdit;
  expect(saved.status()).toBe(200);
  const savedNote = await saved.json();
  const paste = image.getByRole('group', { name: 'Zona para pegar una captura' });
  const choose = image.getByRole('button', { name: /^Elegir.*imagen$/ });
  await expect(paste).toBeFocused();
  const hint = paste.getByText('Pegá tu imagen acá', { exact: true });
  await expect(hint).toBeVisible();
  await expect(result(image)).toHaveCount(0);
  const bounds = (await hint.boundingBox())!;
  const middle = bounds.y + bounds.height / 2;
  await page.mouse.move(bounds.x + 1, middle);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width - 1, middle, { steps: 8 });
  await page.mouse.up();
  expect(await page.evaluate(() => getSelection()?.toString())).toBe('');
  await expect(paste).toBeFocused();
  await page.keyboard.press('Tab');
  const pasteButton = image.getByRole('button', { name: 'Pegar', exact: true });
  await expect(pasteButton).toBeFocused();
  const fixtureBytes = [...await readFile(fixture('terminal.png'))];
  await page.evaluate(async bytes => {
    const blob = new Blob([new Uint8Array(bytes)], { type: 'image/png' });
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
  }, fixtureBytes);
  await page.keyboard.press('Enter');
  await expectPreview(image);
  await page.keyboard.press('Tab');
  await expect(choose).toBeFocused();
  // Chromium can re-encode OS clipboard images. Deliver the exact fixture at the browser paste boundary.
  await choose.evaluate((node, bytes) => {
    const clipboardData = new DataTransfer();
    clipboardData.items.add(new File([new Uint8Array(bytes)], 'image', { type: 'image/png' }));
    node.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData }));
  }, [...await readFile(fixture('terminal.png'))]);
  await expectPreview(image);
  await expect(hint).toHaveCount(0);
  await checkDrops(paste, image);
  await expectPreview(image);
  expect(traffic.extractions).toEqual([]);
  const extract = image.getByRole('button', { name: 'Extraer texto', exact: true });
  await expect(choose).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(extract).toBeFocused();
  const extraction = extractionResponse(page, 'work');
  await page.keyboard.press('Enter');
  await expectExtracted(await extraction, image);
  await expect(result(image)).toBeFocused();
  expect(traffic.extractions).toEqual(['work']);

  await result(image).fill(correctedText);
  await page.keyboard.press('Tab');
  const copy = image.getByRole('button', { name: 'Copiar texto', exact: true });
  await expect(copy).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(image.getByRole('status').filter({ hasText: 'Texto copiado' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(correctedText);

  for (const width of [400, 480, 640, 768, 1280]) {
    await captureLayout(page, image, width, 768, `desktop-${width}`);
  }
  await page.setViewportSize({ width: 640, height: 384 });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 640, height: 384, deviceScaleFactor: 2, mobile: false,
  });
  await expect.poll(() => page.evaluate(() => [innerWidth, innerHeight, devicePixelRatio])).toEqual([640, 384, 2]);
  await captureLayout(page, image, 640, 384, 'desktop-zoom-200-simulado', cdp);
  await cdp.send('Emulation.clearDeviceMetricsOverride');
  await cdp.detach();
  await page.setViewportSize({ width: 1280, height: 800 });
  await result(image).fill('Edición ficticia sin copiar');
  await page.getByRole('link', { name: 'Notas', exact: true }).click();
  const confirmation = page.getByRole('dialog', { name: '¿Descartar los cambios del texto?' });
  await confirmation.getByRole('button', { name: 'Seguir editando' }).click();
  await expect(result(image)).toHaveValue('Edición ficticia sin copiar');
  await page.evaluate(() => history.back());
  await confirmation.getByRole('button', { name: 'Descartar cambios' }).click();
  await expect(page.getByRole('heading', { name: title, exact: true })).toHaveCount(0);
  await expect(editor).toHaveText(`${note} pendiente`);
  await expect(savedIndicator(page)).toBeVisible();
  expect(traffic.writes).toEqual([notePath]);
  const persisted = await page.request.get(`${notePath}?space=work`);
  expect(persisted.status()).toBe(200);
  expect(await persisted.json()).toEqual(savedNote);

  const quotaImage = await openImage(page, false, 'work');
  await quotaImage.getByLabel('Archivo de la captura').setInputFiles(fixture('quota.png'));
  await expectPreview(quotaImage);
  expect(traffic.extractions).toEqual(['work']);
  const quotaResponse = extractionResponse(page, 'work');
  await quotaImage.getByRole('button', { name: 'Extraer texto', exact: true }).click();
  const quota = await quotaResponse;
  expect(quota.status()).toBe(429);
  expect(await quota.json()).toMatchObject({ code: 'OCR_QUOTA_EXHAUSTED' });
  await expect(quotaImage.getByRole('alert')).toHaveText('Se alcanzó el límite de OCR.space. Probá más tarde.');
  await expect(result(quotaImage)).toHaveCount(0);
  expect(traffic.extractions).toEqual(['work', 'work']);
}

async function mobileJourney(page: Page, context: BrowserContext, identity: string) {
  await login(page, identity);
  await page.goto(`/notes/${date}?space=personal`);
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost' });
  const note = 'Borrador Personal ficticio';
  const savedNote = await writeWork(page, date, note);
  const traffic = observeOcr(page);
  const image = await openImage(page, true, 'personal');
  const chooser = page.waitForEvent('filechooser');
  await image.getByRole('button', { name: 'Elegir imagen', exact: true }).tap();
  await (await chooser).setFiles(fixture('terminal.jpg'));
  await expectPreview(image);
  expect(traffic.extractions).toEqual([]);

  const extraction = extractionResponse(page, 'personal');
  await image.getByRole('button', { name: 'Extraer texto', exact: true }).tap();
  await expectExtracted(await extraction, image);
  const field = result(image);
  await expect(field).not.toBeFocused();
  expect(traffic.extractions).toEqual(['personal']);
  for (const width of [320, 360, 375, 390]) {
    await captureLayout(page, image, width, 812, `mobile-${width}`);
  }
  await image.getByRole('button', { name: 'Ver captura', exact: true }).tap();
  await expect(image.getByAltText('Vista previa de la captura')).toBeVisible();
  await image.getByRole('button', { name: 'Ocultar captura', exact: true }).tap();
  await expect(image.getByAltText('Vista previa de la captura')).toBeHidden();
  await page.setViewportSize({ width: 640, height: 280 });
  const cdp = await context.newCDPSession(page);
  const insets = { top: 12, right: 24, bottom: 16, left: 24 };
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets });
  const nav = page.getByRole('navigation', { name: 'Navegación principal' });
  const banner = page.getByRole('banner');
  await expect(banner).toHaveCSS('padding-top', '12px');
  for (const edge of ['left', 'right', 'bottom'] as const) {
    await expect(nav).toHaveCSS(`padding-${edge}`, `${insets[edge]}px`);
  }
  await field.tap();
  await expect(field).toBeFocused();
  await expect(field).toBeInViewport();
  await field.fill(correctedText);
  const copy = image.getByRole('button', { name: 'Copiar texto', exact: true });
  await copy.tap();
  await expect(copy).toBeInViewport();
  await expect(image.getByRole('status').filter({ hasText: 'Texto copiado' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(correctedText);
  await captureLayout(page, image, 640, 280, 'mobile-640x280');
  await cdp.detach();
  await page.goBack();
  await expect(page.getByRole('heading', { name: title, exact: true })).toHaveCount(0);
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

test('image-text-library: save two texts, copy a saved text, delete and reload', async ({
  page, context, identity,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost' });
  await login(page, identity);
  const traffic = observeOcr(page);
  const saves: string[] = [];
  page.on('request', request => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/spaces/work/image-texts') {
      saves.push(request.postDataJSON().text);
    }
  });
  const image = await openImage(page, false, 'work');
  const library = image.getByRole('region', { name: 'Textos guardados' });
  await expect(library.getByText('Todavía no hay textos guardados en este espacio.')).toBeVisible();
  await image.getByLabel('Archivo de la captura').setInputFiles(fixture('terminal.png'));
  const extraction = extractionResponse(page, 'work');
  await image.getByRole('button', { name: 'Extraer texto', exact: true }).click();
  await expectExtracted(await extraction, image);

  const draft = result(image);
  const first = 'T-077 texto primero';
  const second = 'T-077 texto segundo';
  const save = image.getByRole('button', { name: 'Guardar', exact: true });
  await draft.fill(first);
  await save.dblclick();
  const firstRow = library.getByRole('button', { name: `Abrir ${first}` });
  await expect(firstRow).toBeVisible();
  await draft.fill(second);
  await save.click();
  const secondRow = library.getByRole('button', { name: `Abrir ${second}` });
  await expect(secondRow).toBeVisible();

  await firstRow.click();
  const saved = page.getByRole('dialog', { name: 'Texto guardado', exact: true });
  await expect(saved.getByText(first, { exact: true })).toBeVisible();
  await saved.getByRole('button', { name: 'Copiar texto guardado' }).click();
  await expect(saved.getByRole('status')).toHaveText('Texto copiado');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(first);
  await saved.getByRole('button', { name: 'Cerrar' }).click();
  await expect(draft).toHaveValue(second);

  await library.getByRole('button', { name: `Borrar ${first}` }).click();
  const confirm = page.getByRole('dialog', { name: 'Borrar texto guardado' });
  await expect(confirm.getByRole('button', { name: 'Cancelar' })).toBeFocused();
  await confirm.getByRole('button', { name: 'Confirmar' }).click();
  await expect(firstRow).toHaveCount(0);
  await expect(secondRow).toBeFocused();
  await page.reload();
  await expect(secondRow).toBeVisible();
  await expect(firstRow).toHaveCount(0);

  await page.getByRole('button', { name: 'Espacio: Trabajo' }).click();
  await page.getByRole('menuitemradio', { name: 'Personal' }).click();
  await expect(page.getByRole('button', { name: 'Espacio: Personal' })).toBeVisible();
  await expect(library.getByText('Todavía no hay textos guardados en este espacio.')).toBeVisible();
  await expect(secondRow).toHaveCount(0);
  expect(saves).toEqual([first, second]);
  expect(traffic.extractions).toEqual(['work']);
});

for (const extra of [
  { type: 'text/uri-list', value: 'https://fixture.invalid/demo.png' },
  { type: 'text/plain', value: 'Texto ficticio' },
]) {
  test(`screenshot OCR: reject a mixed PNG drop with ${extra.type}`, async ({
    page, identity, isMobile,
  }) => {
    test.skip(isMobile, 'Desktop file drag and drop');
    await login(page, identity);
    const image = await openImage(page, false, 'work');
    await image.getByLabel('Archivo de la captura').setInputFiles(fixture('terminal.jpg'));
    await expectPreview(image);

    const extraction = extractionResponse(page, 'work');
    await image.getByRole('button', { name: 'Extraer texto', exact: true }).click();
    await expectExtracted(await extraction, image);

    const traffic = observeOcr(page);
    const previousLocation = page.url();
    const preview = image.getByRole('img', { name: 'Vista previa de la captura' });
    const previousSource = await preview.evaluate((element: HTMLImageElement) => element.src);
    const zone = image.getByRole('group', { name: 'Zona para pegar una captura' });
    const bytes = [...await readFile(fixture('terminal.png'))];

    expect(await dispatchDrop(zone, 'valid', bytes, extra)).toBe(true);
    await expect(image.getByRole('alert')).toHaveText('Soltá un solo archivo PNG o JPG.');
    await expect(preview).toHaveAttribute('src', previousSource);
    await expect(result(image)).toHaveValue(fixtureText);
    await expect(page).toHaveURL(previousLocation);
    expect(traffic.extractions).toEqual([]);
  });
}
