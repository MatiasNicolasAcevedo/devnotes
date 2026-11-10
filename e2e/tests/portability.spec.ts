import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Locator, Page, Request, Response } from '@playwright/test';
import { control, csrfHeaders, expect, interactiveLogin, layout, readiness, test } from './fixtures';
import { saveVersion } from './daily-helpers';

/**
 * T-045 · S-107 / XL-06. Recorrido real de ida y vuelta: A crea datos en las cuatro colecciones y exporta su
 * Excel; B, cuenta vacía y simultánea, lo previsualiza, confirma e importa, y ve lo mismo con IDs propios.
 * Reimportar en B se rechaza y A queda intacta. Chromium real con API/DB/OIDC propios reales, sin page.route ni
 * interceptores sobre la API propia. El archivo se descarga con el evento download a un directorio temporal del
 * test, fuera de los artefactos exportados, y se borra al terminar.
 */
test.describe.configure({ timeout: 180_000 });

const origin = 'http://localhost';
const references = '/api/v1/reference-items';
const dailyNotes = '/api/v1/daily-notes';
const dailyVersions = '/api/v1/daily-versions';
const voiceNotes = '/api/v1/voice-notes';
const exportPath = '/api/v1/portability/export';
const previewPath = '/api/v1/portability/import-preview';
const importsPath = '/api/v1/portability/imports';
const xlsx = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const href = 'https://jira.ejemplo.test/browse/ABC-1279';
const counts = { references: 1, dailyNotes: 1, dailyVersions: 1, voiceNotes: 1 };
const countLines = ['Notas diarias: 1', 'Versiones guardadas: 1', 'Notas de voz: 1', 'Referencias: 1'];

function on(path: string, method: string) {
  return (message: Request | Response) => {
    const request = 'request' in message ? message.request() : message;
    return new URL(request.url()).pathname === path && request.method() === method;
  };
}

async function json(page: Page, path: string) {
  const response = await page.request.get(path);
  expect(response.status(), `GET ${path}`).toBe(200);
  return response.json();
}

/** Estado completo de una cuenta por la API propia real, con la sesión de esa página. */
async function account(page: Page, date: string) {
  const referenceList = await json(page, references);
  const voiceList = await json(page, voiceNotes);
  const versionList = await json(page, dailyVersions);
  const noteList = await json(page, dailyNotes);
  expect(referenceList.totalElements).toBe(1);
  expect(voiceList.totalElements).toBe(1);
  expect(versionList.totalElements).toBe(1);
  expect(noteList.totalElements).toBe(1);
  return {
    reference: referenceList.content[0],
    note: await json(page, `${dailyNotes}/${date}`),
    version: await json(page, `${dailyVersions}/${date}`),
    voice: await json(page, `${voiceNotes}/${voiceList.content[0].id}`),
  };
}

async function openData(page: Page) {
  await page.getByRole('link', { name: 'Datos', exact: true }).click();
  await expect(page).toHaveURL(`${origin}/data`);
  await expect(page.getByRole('heading', { level: 1, name: 'Datos' })).toBeVisible();
}

/** La nota visible: marca, enlace, separador de 50 % y átomo resuelto a la referencia de esa cuenta. */
async function expectNote(editor: Locator, marker: string, title: string, referenceId: string) {
  await expect(editor).toContainText(marker);
  await expect(editor).toContainText('Ticket 1279');
  await expect(editor.locator(`a[href="${href}"]`)).toHaveText('1279');
  await expect(editor.locator('hr[data-type="separator"][data-width="50"]')).toHaveCount(1);
  const atom = editor.locator('[data-reference-id]');
  await expect(atom).toHaveCount(1);
  await expect(atom).toHaveAttribute('data-reference-id', referenceId);
  await expect(atom).toHaveText(`@${title}`);
  await expect(editor.getByText('Referencia no disponible')).toHaveCount(0);
}

async function expectPreview(page: Page) {
  const region = page.getByRole('region', { name: 'Contenido del archivo' });
  await expect(region).toBeVisible();
  for (const line of countLines) await expect(region.getByText(line, { exact: true })).toBeVisible();
  return region;
}

test('portability: A exports, empty B previews and imports the same data, reimport is rejected and A stays intact', async ({ page, browser, identity }) => {
  await control('reference-login');
  await readiness(page);
  const a = await interactiveLogin(page, identity);
  const tag = identity.slice(0, 8);
  const title = `Runbook ${tag}`;
  const description = `Pasos ficticios ${tag}`;
  const marker = `Recorrido ${tag}`;
  const voiceText = `Idea ficticia ${tag} escrita a mano.`;

  /* 1. A crea la referencia. */
  await page.getByRole('link', { name: 'Referencia', exact: true }).click();
  await expect(page.getByText('No tenés elementos en esta página.')).toBeVisible();
  await page.getByRole('button', { name: 'Crear elemento', exact: true }).click();
  await page.getByRole('textbox', { name: 'Título', exact: false }).fill(title);
  await page.getByRole('textbox', { name: 'Descripción', exact: true }).fill(description);
  const creation = page.waitForResponse(on(references, 'POST'));
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  const created = await creation;
  expect(created.status()).toBe(201);
  const reference = await created.json();

  /* 1. A escribe la nota diaria: texto, separador de 50 %, átomo de la referencia y enlace. */
  await page.getByRole('link', { name: 'Notas', exact: true }).click();
  await expect(page).toHaveURL(/\/notes/);
  const editor = page.getByRole('textbox', { name: 'Editor de nota diaria' });
  await expect(editor).toHaveAttribute('contenteditable', 'true');
  const date = await page.getByLabel('Fecha', { exact: true }).inputValue();
  expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  await editor.click();
  await page.keyboard.type(marker);
  await page.keyboard.press('Enter');
  await page.keyboard.type('--50');
  await page.keyboard.press('Enter');
  await expect(editor.locator('hr[data-type="separator"][data-width="50"]')).toBeVisible();
  await page.keyboard.type('Ver ');
  await page.keyboard.type('@');
  const picker = page.locator('[data-reference-picker]');
  await expect(picker).toBeVisible();
  await page.keyboard.type('Runbook', { delay: 100 });
  await picker.getByRole('button', { name: new RegExp(title) }).click();
  await expect(picker).toBeHidden();
  await expect(editor.locator('[data-reference-id]')).toHaveText(`@${title}`);
  await editor.press('Control+End');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Ticket 1279');
  await page.keyboard.down('Shift');
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowLeft');
  await page.keyboard.up('Shift');
  await page.getByRole('button', { name: 'Agregar enlace', exact: true }).click();
  const linkDialog = page.getByRole('dialog');
  await linkDialog.getByRole('textbox', { name: 'URL', exact: true }).fill(href);
  await linkDialog.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(linkDialog).toBeHidden();
  await expectNote(editor, marker, title, reference.id);
  // El autosave real persiste el último cambio (el enlace) junto con el átomo; sin esperas fijas.
  await expect.poll(async () => {
    const response = await page.request.get(`${dailyNotes}/${date}`);
    if (response.status() !== 200) return false;
    const content = JSON.stringify((await response.json()).content);
    return content.includes(href) && content.includes(reference.id) && content.includes(marker);
  }, { timeout: 15_000, message: 'Autosave persisted the complete daily note' }).toBe(true);
  await expect(page.getByText('Guardado', { exact: true })).toBeVisible();
  await saveVersion(page, date);

  /* 1. A crea una nota de voz escribiendo texto, sin micrófono. */
  await page.getByRole('link', { name: 'Voz', exact: true }).click();
  await expect(page).toHaveURL(`${origin}/voice`);
  await page.getByRole('textbox', { name: 'Texto de la nota' }).fill(voiceText);
  const voiceCreation = page.waitForResponse(on(voiceNotes, 'POST'));
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  expect((await voiceCreation).status()).toBe(201);
  await expect(page.getByText('Nota guardada correctamente.', { exact: true })).toBeVisible();

  const before = await account(page, date);
  expect(before.reference).toEqual(reference);
  expect(before.voice.text).toBe(voiceText);

  const directory = await mkdtemp(join(tmpdir(), 'portability-'));
  const second = await browser.newContext({ baseURL: origin, viewport: page.viewportSize()! });
  try {
    /* 2. A exporta: descarga real del navegador con las cabeceras del contrato. */
    await openData(page);
    const exported = page.waitForResponse(on(exportPath, 'GET'));
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Descargar Excel', exact: true }).click();
    const exportResponse = await exported;
    expect(exportResponse.status()).toBe(200);
    expect(exportResponse.headers()['content-type']).toContain(xlsx);
    expect(exportResponse.headers()['cache-control']).toContain('no-store');
    expect(exportResponse.headers()['x-content-type-options']).toBe('nosniff');
    const download = await downloading;
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/^devnotes-\d{4}-\d{2}-\d{2}\.xlsx$/);
    expect(exportResponse.headers()['content-disposition']).toBe(`attachment; filename="${filename}"`);
    const file = join(directory, filename);
    await download.saveAs(file);
    const bytes = await readFile(file);
    expect(bytes.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])), 'Downloaded file is a ZIP container').toBe(true);
    await expect(page.getByText(`Descarga lista: ${filename}`)).toBeVisible();
    await layout(page);

    /* 3. B, vacía y simultánea, previsualiza sin escribir, confirma e importa. */
    const bPage = await second.newPage();
    const b = await interactiveLogin(bPage, randomUUID());
    expect(b).not.toBe(a);
    for (const path of [references, voiceNotes, dailyNotes, dailyVersions]) {
      expect((await json(bPage, path)).totalElements, `B starts empty: ${path}`).toBe(0);
    }
    await openData(bPage);
    const input = bPage.getByLabel('Archivo de respaldo (.xlsx)', { exact: true });
    const previewed = bPage.waitForResponse(on(previewPath, 'POST'));
    await input.setInputFiles(file);
    const previewResponse = await previewed;
    expect(previewResponse.status()).toBe(200);
    expect(previewResponse.request().headers()['content-type']).toMatch(/^multipart\/form-data; boundary=/);
    expect(await previewResponse.json()).toMatchObject({ format: 'devnotes-xlsx', version: 1, counts, accountEmpty: true });
    await expectPreview(bPage);
    for (const path of [references, voiceNotes, dailyNotes, dailyVersions]) {
      expect((await json(bPage, path)).totalElements, `Preview wrote nothing: ${path}`).toBe(0);
    }
    await layout(bPage);
    await bPage.getByRole('button', { name: 'Importar', exact: true }).click();
    const confirm = bPage.getByRole('dialog', { name: '¿Importar este archivo?' });
    await expect(confirm).toBeVisible();
    for (const line of countLines) await expect(confirm.getByText(line, { exact: true })).toBeVisible();
    const confirmButton = confirm.getByRole('button', { name: 'Confirmar importación', exact: true });
    const bounds = await confirmButton.boundingBox();
    expect(bounds !== null && bounds.x >= 0 && bounds.x + bounds.width <= bPage.viewportSize()!.width,
      'Confirm action fits within the viewport').toBe(true);
    const imported = bPage.waitForResponse(on(importsPath, 'POST'));
    await confirmButton.click();
    const importResponse = await imported;
    expect(importResponse.status()).toBe(201);
    expect(await importResponse.json()).toEqual({ counts });
    await expect(bPage.getByText('Importación completa', { exact: true })).toBeVisible();
    for (const name of ['Ver en Notas', 'Ver en Historial', 'Ver en Voz', 'Ver en Referencias']) {
      await expect(bPage.getByRole('link', { name, exact: true })).toBeVisible();
    }
    await layout(bPage);

    /* 3. B tiene los mismos datos con IDs propios, átomo reescrito y marcas de tiempo conservadas. */
    const copy = await account(bPage, date);
    expect(copy.reference.id).not.toBe(reference.id);
    expect(copy.reference).toEqual({ ...reference, id: copy.reference.id });
    const rewritten = (content: unknown) => JSON.parse(JSON.stringify(content).replaceAll(reference.id, copy.reference.id));
    expect(JSON.stringify(before.note.content)).toContain(reference.id);
    expect(copy.note.id).not.toBe(before.note.id);
    expect(copy.note).toEqual({ ...before.note, id: copy.note.id, content: rewritten(before.note.content), revision: 1 });
    expect(copy.version.id).not.toBe(before.version.id);
    expect(copy.version).toEqual({ ...before.version, id: copy.version.id, content: rewritten(before.version.content), sourceRevision: 1 });
    expect(copy.voice.id).not.toBe(before.voice.id);
    expect(copy.voice).toEqual({ ...before.voice, id: copy.voice.id, revision: 1 });

    /* 3. B lo ve en pantalla: referencia, nota con enlace/separador/átomo resuelto, historial y voz. */
    await bPage.getByRole('link', { name: 'Ver en Referencias', exact: true }).click();
    await expect(bPage).toHaveURL(`${origin}/reference`);
    await expect(bPage.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(bPage.getByText(description, { exact: true })).toBeVisible();
    await bPage.goto(`/notes/${date}`);
    const bEditor = bPage.getByRole('textbox', { name: 'Editor de nota diaria' });
    await expect(bEditor).toHaveAttribute('contenteditable', 'true');
    await expectNote(bEditor, marker, title, copy.reference.id);
    const bAtom = bEditor.locator('[data-reference-id]');
    await bAtom.focus();
    await bPage.keyboard.press('Enter');
    await expect(bPage.getByText(description, { exact: true })).toBeVisible();
    await bPage.keyboard.press('Escape');
    await layout(bPage);
    await bPage.getByRole('link', { name: 'Historial', exact: true }).click();
    await expect(bPage).toHaveURL(`${origin}/history`);
    await bPage.getByRole('link', { name: new RegExp(date.split('-').reverse().join('/')) }).click();
    await expect(bPage).toHaveURL(`${origin}/history/${date}`);
    const bVersion = bPage.getByRole('textbox', { name: 'Versión de solo lectura' });
    await expect(bVersion).toHaveAttribute('contenteditable', 'false');
    await expectNote(bVersion, marker, title, copy.reference.id);
    await bPage.getByRole('link', { name: 'Voz', exact: true }).click();
    await expect(bPage).toHaveURL(`${origin}/voice`);
    const bVoice = bPage.getByRole('button', { name: new RegExp(`Idea ficticia ${tag}`) });
    await expect(bVoice).toBeVisible();
    await bVoice.click();
    await expect(bPage.getByRole('textbox', { name: 'Texto de la nota' })).toHaveValue(voiceText);

    /* 4. B vuelve a importar: la pantalla explica la cuenta no vacía sin botón, y la API responde 409. */
    await openData(bPage);
    const previewedAgain = bPage.waitForResponse(on(previewPath, 'POST'));
    await input.setInputFiles(file);
    const again = await previewedAgain;
    expect(again.status()).toBe(200);
    expect(await again.json()).toMatchObject({ counts, accountEmpty: false });
    const region = await expectPreview(bPage);
    await expect(region.getByText('Solo se puede importar en una cuenta sin datos.', { exact: true })).toBeVisible();
    await expect(bPage.getByRole('button', { name: 'Importar', exact: true })).toHaveCount(0);
    await expect(bPage.getByRole('dialog')).toHaveCount(0);
    await layout(bPage);
    const rejected = await bPage.request.post(importsPath, {
      headers: await csrfHeaders(bPage),
      multipart: { file: { name: filename, mimeType: xlsx, buffer: bytes } },
    });
    expect(rejected.status()).toBe(409);
    expect(rejected.headers()['content-type']).toContain('application/problem+json');
    expect(rejected.headers()['cache-control']).toContain('no-store');
    expect((await rejected.json()).code).toBe('IMPORT_ACCOUNT_NOT_EMPTY');
    expect(await account(bPage, date), 'Rejected reimport wrote nothing in B').toEqual(copy);

    /* 5. A sigue con sus datos intactos, por la API y en pantalla tras recargar. */
    expect(await account(page, date)).toEqual(before);
    await page.goto(`/notes/${date}`);
    await expect(editor).toHaveAttribute('contenteditable', 'true');
    await expectNote(editor, marker, title, reference.id);
    await layout(page);
  } finally {
    await second.close();
    await rm(directory, { recursive: true, force: true });
  }
});
