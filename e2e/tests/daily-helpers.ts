import type { Page } from '@playwright/test';
import { expect, savedIndicator } from './fixtures';

type Space = 'work' | 'personal';

export async function openDailyTools(page: Page) {
  // Con Enlace en la barra (escritorio), abrir Herramientas dejaría la barra con aria-hidden.
  const toolbar = page.getByRole('group', { name: 'Herramientas del editor', exact: true });
  if (await toolbar.getByRole('button', { name: /^(Agregar|Editar) enlace$/ }).isVisible()) return;
  const trigger = page.getByRole('button', { name: 'Herramientas', exact: true });
  if (await trigger.isVisible() && await trigger.getAttribute('aria-expanded') === 'false') {
    await trigger.click();
  }
}

export async function chooseDate(page: Page, date: string, space: Space = 'work') {
  await page.getByLabel('Fecha', { exact: true }).fill(date);
  await expect(page).toHaveURL(`http://localhost/notes/${date}?space=${space}`);
  await expect(page.getByLabel('Fecha', { exact: true })).toHaveValue(date);
  await expect(page.getByRole('textbox', { name: 'Editor de nota diaria' })).toHaveAttribute('contenteditable', 'true');
}

export async function writeWork(page: Page, date: string, text: string) {
  const editor = page.getByRole('textbox', { name: 'Editor de nota diaria' });
  await expect(editor).toHaveAttribute('contenteditable', 'true');
  const saved = page.waitForResponse(response => new URL(response.url()).pathname === `/api/v1/daily-notes/${date}` && response.request().method() === 'PUT');
  await editor.fill(text);
  const response = await saved;
  expect(response.status()).toBe(200);
  const note = await response.json();
  expect(note.date).toBe(date);
  expect(JSON.stringify(note.content)).toContain(text);
  await expect(savedIndicator(page)).toBeVisible();
  return note;
}

export async function saveVersion(page: Page, date: string, replace = false) {
  const saved = page.waitForResponse(response => new URL(response.url()).pathname === `/api/v1/daily-notes/${date}/version` && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Guardar versión', exact: true }).click();
  if (replace) {
    const dialog = page.getByRole('dialog', { name: 'Reemplazar versión existente' });
    await expect(dialog).toContainText(date.split('-').reverse().join('/'));
    await dialog.getByRole('button', { name: 'Reemplazar', exact: true }).click();
  }
  const response = await saved;
  expect(response.status()).toBe(200);
  const version = await response.json();
  expect(version.date).toBe(date);
  expect(version.sourceRevision).toBeGreaterThan(0);
  await expect(page.getByText('Versión guardada correctamente.', { exact: true })).toBeVisible();
  return version;
}

export async function readVersion(page: Page, date: string, text: string, space: Space = 'work') {
  await page.getByRole('link', { name: 'Historial', exact: true }).click();
  await expect(page).toHaveURL(`http://localhost/history?space=${space}`);
  await expect(page.locator('.daily-editor-content')).toHaveCount(0);
  await page.getByRole('link', { name: new RegExp(date.split('-').reverse().join('/')) }).click();
  await expect(page).toHaveURL(`http://localhost/history/${date}?space=${space}`);
  const editor = page.getByRole('textbox', { name: 'Versión de solo lectura' });
  await expect(editor).toHaveText(text);
  await expect(editor).toHaveAttribute('contenteditable', 'false');
  await expect(page.getByRole('button', { name: /Agregar enlace|Editar enlace|Guardar versión/ })).toHaveCount(0);
}
