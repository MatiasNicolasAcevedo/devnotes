import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import { control, csrfHeaders, expect, login, logout, test } from './fixtures';

const date = '2026-11-20';
const writingDate = '2026-11-21';
const title = 'Guía de Trabajo ficticia';
const freePath = '/api/spaces/work/free-notes';
const paragraph = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] });
const document = (...lines: string[]) => ({ type: 'doc', content: lines.map(paragraph) });

async function openTools(page: Page, action: 'Abrir al lado' | 'Ver consulta') {
  const tools = page.getByRole('button', { name: 'Herramientas', exact: true });
  await tools.press('Enter');
  const choices = page.getByRole('dialog', { name: 'Herramientas' }).or(
    page.getByRole('menu', { name: 'Herramientas' }),
  );
  const option = choices.getByText(action, { exact: true });
  await expect(option).toBeVisible();
  await option.press('Enter');
}

async function seedVersion(page: Page) {
  const headers = await csrfHeaders(page);
  const stored = await page.request.put(`/api/v1/daily-notes/${date}?space=work`, {
    headers, data: { expectedRevision: 0, content: document('Versión manual ficticia') },
  });
  expect(stored.status()).toBe(200);
  const { revision } = await stored.json();
  const save = await page.request.post(`/api/v1/daily-notes/${date}/version?space=work`, {
    headers, data: { expectedRevision: revision },
  });
  expect(save.status()).toBe(200);
}

async function seedSources(page: Page) {
  await seedVersion(page);
  const created = await page.request.post(freePath, {
    headers: await csrfHeaders(page),
    data: {
      attemptId: randomUUID().replace(/^(.{14})./, (_, prefix: string) => `${prefix}7`),
      title,
      document: {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Encabezado de consulta' }] },
          { type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: true }, content: [paragraph('Paso hecho')] }] },
          ...Array.from({ length: 60 }, (_, index) => paragraph(`Renglón ficticio ${index + 1}`)),
        ],
      },
    },
  });
  expect(created.status()).toBe(201);
  return created.json();
}

test('side reading: preserves the editor, restores consultation on reflow and respects the draft guard', async ({
  page, context, identity, isMobile,
}) => {
  await login(page, identity);
  const source = await seedSources(page);
  const viewport = page.viewportSize()!;
  await page.goto(`/notes/${writingDate}?space=work`);
  const dailyEditor = page.getByRole('textbox', { name: 'Editor de nota diaria' });
  await expect(dailyEditor).toHaveAttribute('contenteditable', 'true');
  if (isMobile) {
    await page.getByRole('button', { name: 'Herramientas', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Herramientas' }).getByText('Abrir al lado')).toHaveCount(0);
    await expect(page.getByRole('dialog', { name: 'Herramientas' }).getByText('Ver consulta')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 1280, height: viewport.height });
  }
  const saved = page.waitForResponse(response =>
    new URL(response.url()).pathname === `/api/v1/daily-notes/${writingDate}`
    && response.request().method() === 'PUT',
  );
  await dailyEditor.fill('Borrador independiente');
  expect((await saved).status()).toBe(200);
  await dailyEditor.press('End');
  await dailyEditor.press('Shift+Home');
  const selection = await page.evaluate(() => getSelection()?.toString());
  expect(selection).toBe('Borrador independiente');
  await openTools(page, 'Abrir al lado');
  const selector = page.getByRole('dialog', { name: 'Elegir una consulta' });
  await expect(selector.getByRole('region', { name: 'Versiones guardadas' })).toBeVisible();
  await expect(selector.getByRole('region', { name: 'Notas libres' })).toBeVisible();
  await selector.getByRole('button', { name: title }).press('Enter');
  const reader = page.getByRole('complementary', { name: title });
  await expect(reader.getByRole('heading', { name: title })).toBeFocused();
  await expect(reader.getByRole('heading', { name: 'Encabezado de consulta', level: 2 })).toBeVisible();
  const checkbox = reader.getByRole('checkbox', { name: 'Casilla: Paso hecho' });
  await expect(checkbox).toBeChecked();
  await expect(checkbox).toBeDisabled();
  const writingViewport = page.getByLabel('Área de escritura', { exact: true });
  const writingScroll = await writingViewport.evaluate(element => element.scrollTop);
  const readingViewport = reader.getByRole('region', { name: 'Contenido de consulta' });
  await readingViewport.evaluate(element => { element.scrollTop = 200; });
  await expect.poll(() => readingViewport.evaluate(element => element.scrollTop)).toBe(200);
  expect(await writingViewport.evaluate(element => element.scrollTop)).toBe(writingScroll);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await reader.getByRole('button', { name: 'Copiar texto' }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain('Paso hecho');
  await reader.getByRole('button', { name: 'Volver a escribir' }).press('Enter');
  await expect(dailyEditor).toBeFocused();
  expect(await page.evaluate(() => getSelection()?.toString())).toBe(selection);
  const editorWidth = (await dailyEditor.boundingBox())!.width;
  const readerWidth = (await reader.boundingBox())!.width;
  expect(editorWidth).toBeGreaterThanOrEqual(440);
  expect(readerWidth).toBeGreaterThanOrEqual(320);
  expect(editorWidth / readerWidth).toBeCloseTo(1.5, 1);

  await page.setViewportSize({ width: isMobile ? viewport.width : 1120, height: viewport.height });
  await expect(reader).toHaveCount(0);
  await expect(dailyEditor).toBeFocused();
  await expect(dailyEditor).toHaveText('Borrador independiente');
  await page.setViewportSize({ width: 1280, height: viewport.height });
  await expect(reader.getByRole('document', { name: 'Nota libre en consulta' })).toBeVisible();
  await reader.getByRole('button', { name: 'Cerrar consulta' }).press('Enter');
  await expect(page.getByRole('button', { name: 'Herramientas', exact: true })).toBeFocused();

  await page.goto(`/free-notes/${source.id}?space=work`);
  const editor = page.getByRole('textbox', { name: 'Contenido' });
  await expect(editor).toContainText('Renglón ficticio 60');
  await openTools(page, 'Abrir al lado');
  await expect(selector.getByRole('button', { name: title })).toHaveCount(0);
  await selector.getByRole('button', { name: 'Versión del 20/11/2026' }).press('Enter');
  const savedReader = page.getByRole('complementary', { name: 'Versión del 20/11/2026' });
  await expect(savedReader.getByRole('textbox', { name: 'Versión en consulta' })).toHaveText('Versión manual ficticia');
  const draft = page.getByRole('textbox', { name: 'Título' });
  await draft.fill('Borrador sin guardar');
  const form = page.locator('form').filter({ has: editor });
  await form.evaluate(element => { element.scrollTop = 250; });
  await expect.poll(() => form.evaluate(element => element.scrollTop)).toBe(250);
  const anchor = editor.getByText('Renglón ficticio 10', { exact: true });
  const offsetInForm = () => anchor.evaluate(element =>
    element.getBoundingClientRect().top - element.closest('form')!.getBoundingClientRect().top,
  );
  await expect(anchor).toBeInViewport();
  const scrollAnchor = await offsetInForm();
  await page.setViewportSize({ width: isMobile ? viewport.width : 1120, height: viewport.height });
  await expect(savedReader).toHaveCount(0);
  // The mobile toolbar can wrap. Keep the same part of the draft in view through the reflow.
  await expect.poll(async () => Math.abs(await offsetInForm() - scrollAnchor)).toBeLessThanOrEqual(1);
  await openTools(page, 'Ver consulta');
  const guard = page.getByRole('dialog', { name: /Guardar los cambios/ });
  await guard.getByRole('button', { name: 'Seguir editando' }).click();
  await expect(draft).toHaveValue('Borrador sin guardar');
  await page.setViewportSize({ width: 1280, height: viewport.height });
  await expect(savedReader).toBeVisible();
  await form.evaluate(element => { element.scrollTop = 250; });
  await savedReader.getByRole('button', { name: 'Cerrar consulta' }).press('Enter');
  await expect.poll(() => form.evaluate(element => element.scrollTop)).toBe(250);
  await expect(draft).toHaveValue('Borrador sin guardar');
});

test('side reading: a deleted source can be replaced and consultations never cross spaces', async ({
  page, identity,
}) => {
  await login(page, identity);
  const source = await seedSources(page);
  await page.setViewportSize({ width: 1280, height: 812 });
  await page.goto(`/notes/${writingDate}?space=work`);
  await expect(page.getByRole('heading', { name: 'Notas diarias' })).toBeAttached();
  const selector = page.getByRole('dialog', { name: 'Elegir una consulta' });
  const reader = page.getByRole('complementary', { name: title });
  await openTools(page, 'Abrir al lado');
  await selector.getByRole('button', { name: title }).click();
  await expect(reader.getByRole('document', { name: 'Nota libre en consulta' })).toBeVisible();
  await page.setViewportSize({ width: 1120, height: 812 });
  await expect(reader).toHaveCount(0);
  const deleted = await page.request.delete(`${freePath}/${source.id}?expectedRevision=${source.revision}`, {
    headers: await csrfHeaders(page),
  });
  expect(deleted.status()).toBe(204);
  await page.setViewportSize({ width: 1280, height: 812 });
  await reader.getByRole('button', { name: 'Elegir otra nota' }).click();
  await expect(selector.getByText('No hay otras notas libres.')).toBeVisible();
  await selector.getByRole('button', { name: 'Versión del 20/11/2026' }).click();
  const savedReader = page.getByRole('complementary', { name: 'Versión del 20/11/2026' });
  await expect(savedReader).toBeVisible();

  const switchSpace = async (from: string, to: string) => {
    await page.getByRole('button', { name: `Espacio: ${from}` }).click();
    await page.getByRole('menuitemradio', { name: to }).click();
    await expect(page.getByRole('button', { name: `Espacio: ${to}` })).toBeVisible();
  };
  await switchSpace('Trabajo', 'Personal');
  await expect(savedReader).toHaveCount(0);
  await openTools(page, 'Abrir al lado');
  await expect(selector.getByText('No hay versiones guardadas.')).toBeVisible();
  const personalRead = await page.request.get(`/api/v1/daily-versions/${date}?space=personal`);
  expect(personalRead.status()).toBe(404);
  await page.keyboard.press('Escape');
  await switchSpace('Personal', 'Trabajo');
  await expect(savedReader).toHaveCount(0);
  await openTools(page, 'Abrir al lado');
  await selector.getByRole('button', { name: 'Versión del 20/11/2026' }).click();
  await expect(savedReader).toBeVisible();
});

test('side reading: signing out discards the consultation before a second account signs in', async ({
  page, identity,
}) => {
  const account = await login(page, identity);
  await seedVersion(page);
  await page.setViewportSize({ width: 1280, height: 812 });
  await page.goto(`/notes/${writingDate}?space=work`);
  const selector = page.getByRole('dialog', { name: 'Elegir una consulta' });
  await openTools(page, 'Abrir al lado');
  await selector.getByRole('button', { name: 'Versión del 20/11/2026' }).click();
  const savedReader = page.getByRole('complementary', { name: 'Versión del 20/11/2026' });
  await expect(savedReader.getByRole('textbox', { name: 'Versión en consulta' })).toHaveText('Versión manual ficticia');
  await logout(page);
  await expect(page).toHaveURL('http://localhost/login');
  await expect(savedReader).toHaveCount(0);
  expect((await page.request.get(`/api/v1/daily-versions/${date}?space=work`)).status()).toBe(401);
  const secondIdentity = randomUUID();
  await control('identity', secondIdentity);
  expect(await login(page, secondIdentity)).not.toBe(account);
  await page.goto(`/notes/${writingDate}?space=work`);
  await expect(savedReader).toHaveCount(0);
  await openTools(page, 'Abrir al lado');
  await expect(selector.getByText('No hay versiones guardadas.')).toBeVisible();
  expect((await page.request.get(`/api/v1/daily-versions/${date}?space=work`)).status()).toBe(404);
});
