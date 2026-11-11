import { randomUUID } from 'node:crypto';
import type { Page, Request, Response } from '@playwright/test';
import { control, csrfHeaders, interactiveLogin, keyboardActivate, layout, login, readiness, logout } from './fixtures';
import { expect, fakeMicrophone, origin, providerScenario, test, trackStates } from '../fixtures/voice-fixture';

/**
 * T-037 · S-105 v2 / M2-RC1. Chromium real con micrófono sintético, API/DB/OIDC propios reales y doble externo de
 * Groq en la red privada del proyecto. Sin page.route ni interceptores sobre la API propia; getUserMedia y
 * MediaRecorder son los del navegador (la sonda del fixture solo observa el estado de los tracks).
 * VO-01 captura/tracks · VO-02 texto sin guardar y error del proveedor · VO-03 editar/copiar exacto ·
 * VO-04 varias notas/recarga/corrección · VO-05 borrado confirmado · VO-06 dos actores/logout/respuesta tardía ·
 * VO-07 navegación con guardia, 375 px y teclado.
 */
test.use({ launchOptions: fakeMicrophone });
test.describe.configure({ timeout: 120_000 });

const notes = '/api/v1/voice-notes';
const transcriptions = '/api/v1/voice/transcriptions';
const transcript = /^Hola, esto es una transcripción de prueba con identificador [0-9a-f]{8}\.$/;
// El 200 de transcripción acredita además el contenedor: el backend exige cabecera EBML con DocType «webm».

function on(path: string, method: string) {
  return (message: Request | Response) => {
    const request = 'request' in message ? message.request() : message;
    return new URL(request.url()).pathname === path && request.method() === method;
  };
}

function countPosts(page: Page) {
  const posts = { transcriptions: 0, notes: 0 };
  page.on('request', request => {
    if (on(transcriptions, 'POST')(request)) posts.transcriptions++;
    if (on(notes, 'POST')(request)) posts.notes++;
  });
  return posts;
}

async function openVoice(page: Page) {
  await page.getByRole('link', { name: 'Voz', exact: true }).click();
  await expect(page).toHaveURL(`${origin}/voice`);
  await expect(page.getByRole('heading', { level: 1, name: 'Notas de voz' })).toBeVisible();
}

async function record(page: Page) {
  await page.getByRole('button', { name: 'Grabar', exact: true }).click();
  await expect(page.getByText('Grabando', { exact: true })).toBeVisible();
  // Al menos un segundo de audio real del dispositivo sintético.
  const timer = page.getByRole('timer');
  await expect(timer).toHaveText(/^00:0[1-9]$/);
  // T-050 (UI-08): el botón pasa a «Detener» y cinco barras muestran el nivel del micrófono.
  const stop = page.getByRole('button', { name: 'Detener y transcribir', exact: true });
  await expect(stop).toHaveText('Detener');
  const buttonBox = (await stop.boundingBox())!;
  const timerBox = (await timer.boundingBox())!;
  expect(timerBox.x).toBeGreaterThan(buttonBox.x + buttonBox.width);
  expect(Math.abs(timerBox.y + timerBox.height / 2 - (buttonBox.y + buttonBox.height / 2))).toBeLessThan(1);
  await expect(page.locator('[data-level-bar]')).toHaveCount(5);
  expect((await trackStates(page)).at(-1)).toBe('audio:live');
}

async function total(page: Page) {
  const response = await page.request.get(notes);
  expect(response.status()).toBe(200);
  return (await response.json()).totalElements as number;
}

test('voice: capture, transcribe, edit, copy, save, reload, second note, correct and delete', async ({ page, identity }) => {
  await login(page, identity);
  const posts = countPosts(page);
  await openVoice(page);
  await expect(page.getByText('No hay notas de voz todavía.')).toBeVisible();
  // T-050 (UI-07): el aviso es una línea de texto con el mismo enlace, sin caja.
  await expect(page.getByText(/Al detener, el audio se envía a Groq\./)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ver política de Groq', exact: true })).toHaveAttribute('href', 'https://console.groq.com/docs/your-data');
  const capabilities = await (await page.request.get('/api/v1/voice/capabilities')).json();
  expect(capabilities).toMatchObject({ recordingEnabled: true, reason: null, maxDurationSeconds: 600, language: 'es' });
  const text = page.getByRole('textbox', { name: 'Texto de la nota' });

  // VO-01/VO-02: captura real, stop libera tracks y el texto del doble llega sin guardar.
  await record(page);
  const transcribed = page.waitForResponse(on(transcriptions, 'POST'));
  await page.getByRole('button', { name: 'Detener y transcribir', exact: true }).click();
  const response = await transcribed;
  expect(response.status()).toBe(200);
  expect(response.headers()['cache-control']).toContain('no-store');
  expect(response.request().headers()['content-type']).toMatch(/^multipart\/form-data; boundary=/);
  const body = await response.json();
  expect(Object.keys(body).sort()).toEqual(['language', 'text']);
  expect(body.language).toBe('es');
  expect(body.text).toMatch(transcript);
  await expect(text).toHaveValue(body.text);
  await expect(text).toBeFocused();
  expect(await trackStates(page)).toEqual(['audio:ended']);
  expect(posts).toEqual({ transcriptions: 1, notes: 0 });
  expect(await total(page), 'No row exists before Guardar').toBe(0);

  // VO-03: corregir y copiar exactamente el texto actual, con espacios y salto final.
  const corrected = `${body.text}\nCorrección manual: PostgreSQL y CSRF.  \n`;
  await text.fill(corrected);
  await page.getByRole('button', { name: 'Copiar', exact: true }).click();
  await expect(page.getByText('Texto copiado al portapapeles.', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(corrected);
  expect(posts.notes).toBe(0);

  // VO-04: guardar con ACK, recargar y crear una segunda nota.
  const created = page.waitForResponse(on(notes, 'POST'));
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  const first = await created;
  expect(first.status()).toBe(201);
  const firstNote = await first.json();
  expect(first.headers().location).toBe(`${notes}/${firstNote.id}`);
  expect(firstNote).toMatchObject({ text: corrected, revision: 1 });
  await expect(page.getByText('Nota guardada correctamente.', { exact: true })).toBeVisible();
  await page.reload();
  const firstItem = page.getByRole('button', { name: /Hola, esto es una transcripción de prueba/ });
  await expect(firstItem).toBeVisible();
  await expect(text).toHaveValue('');
  expect(await (await page.request.get(`${notes}/${firstNote.id}`)).json()).toMatchObject({ text: corrected, revision: 1 });

  const secondText = `Segunda nota ${identity.slice(0, 8)} escrita a mano. 🎙️ ${'Texto de prueba '.repeat(10)}Tramo final.`;
  await text.fill(secondText);
  const createdSecond = page.waitForResponse(on(notes, 'POST'));
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  expect((await createdSecond).status()).toBe(201);
  await page.reload();
  const secondItem = page.getByRole('button', { name: /Segunda nota/ });
  await expect(secondItem).toBeVisible();
  await expect(firstItem).toBeVisible();
  const list = await (await page.request.get(notes)).json();
  expect(list.totalElements).toBe(2);
  expect(list.content.map((item: { excerpt: string }) => item.excerpt.startsWith('Segunda nota'))).toEqual([true, false]);
  const secondExcerpt = [...secondText].slice(0, 120).join('');
  expect(list.content[0].excerpt).toBe(secondExcerpt);
  const preview = secondItem.getByText(secondExcerpt, { exact: true });
  await expect(preview).toHaveAttribute('title', secondText);
  await expect(preview).toHaveCSS('white-space', 'nowrap');
  await expect(preview).toHaveCSS('text-overflow', 'ellipsis');
  expect(await preview.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
  expect(posts).toEqual({ transcriptions: 1, notes: 2 });

  // VO-04: corregir la primera con revisión; la recarga conserva el texto exacto.
  const opened = page.waitForResponse(on(`${notes}/${firstNote.id}`, 'GET'));
  await firstItem.click();
  expect((await opened).status()).toBe(200);
  await expect(text).toHaveValue(corrected);
  await expect(page.getByText('Revisión 1', { exact: true })).toBeVisible();
  const revised = `${corrected}Ajuste final.`;
  await text.fill(revised);
  const updated = page.waitForResponse(on(`${notes}/${firstNote.id}`, 'PUT'));
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  const update = await updated;
  expect(update.status()).toBe(200);
  expect(update.request().postDataJSON()).toEqual({ text: revised, expectedRevision: 1 });
  expect(await update.json()).toMatchObject({ id: firstNote.id, text: revised, revision: 2 });
  await expect(page.getByText('Revisión 2', { exact: true })).toBeVisible();
  await page.reload();
  expect(await (await page.request.get(`${notes}/${firstNote.id}`)).json()).toMatchObject({ text: revised, revision: 2 });

  // VO-05: cancelar no borra; confirmar espera 204.
  await firstItem.click();
  await expect(text).toHaveValue(revised);
  await page.getByRole('button', { name: 'Borrar', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect((await page.request.get(`${notes}/${firstNote.id}`)).status()).toBe(200);
  await page.getByRole('button', { name: 'Borrar', exact: true }).click();
  const deleted = page.waitForResponse(on(`${notes}/${firstNote.id}`, 'DELETE'));
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar', exact: true }).click();
  const deletion = await deleted;
  expect(deletion.status()).toBe(204);
  expect(new URL(deletion.url()).searchParams.get('expectedRevision')).toBe('2');
  await expect(firstItem).toHaveCount(0);
  await expect(secondItem).toBeVisible();
  expect((await page.request.get(`${notes}/${firstNote.id}`)).status()).toBe(404);
  expect(await total(page)).toBe(1);

  // VO-07: la guardia conserva el borrador al navegar y no renderiza el destino debajo.
  await keyboardActivate(page, 'button', 'Nueva nota');
  await expect(text).toHaveValue('');
  await text.fill('Borrador pendiente de voz');
  await page.getByRole('link', { name: 'Notas', exact: true }).click();
  await expect(page).toHaveURL(/\/notes/);
  await expect(page.getByText('Hay cambios pendientes en la nota de voz.')).toBeVisible();
  await expect(page.locator('.daily-editor-content')).toHaveCount(0);
  await page.getByRole('button', { name: 'Volver a voz', exact: true }).click();
  await expect(page).toHaveURL(`${origin}/voice`);
  await expect(text).toHaveValue('Borrador pendiente de voz');
  await page.getByRole('link', { name: 'Historial', exact: true }).click();
  await expect(page).toHaveURL(`${origin}/history`);
  await page.getByRole('button', { name: 'Descartar y continuar', exact: true }).click();
  await expect(page.getByText('Hay cambios pendientes en la nota de voz.')).toHaveCount(0);
  await expect(page).toHaveURL(`${origin}/history`);

  // Daily y referencia siguen disponibles; volver a voz muestra un borrador vacío y la nota restante.
  await page.getByRole('link', { name: 'Notas', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Editor de nota diaria' })).toHaveAttribute('contenteditable', 'true');
  await page.getByRole('link', { name: 'Referencia', exact: true }).click();
  await expect(page).toHaveURL(`${origin}/reference`);
  await openVoice(page);
  await expect(text).toHaveValue('');
  await expect(secondItem).toBeVisible();
  await layout(page);
  expect(posts).toEqual({ transcriptions: 1, notes: 2 });
});

test('voice: provider error with explicit retry, private second identity, late response and logout stop the capture', async ({ page, browser, identity }) => {
  await control('reference-login');
  await readiness(page);
  const a = await interactiveLogin(page, identity);
  const posts = countPosts(page);
  await openVoice(page);
  const text = page.getByRole('textbox', { name: 'Texto de la nota' });

  // VO-02/VO-07: 429 del proveedor a través de nginx y backend; sin texto ni reintento automático.
  await record(page);
  await providerScenario('429');
  const rejected = page.waitForResponse(on(transcriptions, 'POST'));
  await page.getByRole('button', { name: 'Detener y transcribir', exact: true }).click();
  const failure = await rejected;
  expect(failure.status()).toBe(429);
  expect(failure.headers()['content-type']).toContain('application/problem+json');
  expect(await failure.json()).toMatchObject({ code: 'VOICE_RATE_LIMITED', retryAfterSeconds: 30 });
  await expect(page.getByText('No se pudo transcribir el audio. Podés reintentar o descartar.')).toBeVisible();
  await expect(text).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Guardar', exact: true })).toBeDisabled();
  expect(await trackStates(page)).toEqual(['audio:ended']);
  expect(posts.transcriptions).toBe(1);
  const retried = page.waitForResponse(on(transcriptions, 'POST'));
  await page.getByRole('button', { name: 'Reintentar transcripción', exact: true }).click();
  expect((await retried).status()).toBe(200);
  await expect(text).toHaveValue(transcript);
  expect(posts.transcriptions).toBe(2);
  const created = page.waitForResponse(on(notes, 'POST'));
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  const note = await (await created).json();
  await expect(page.getByText('Nota guardada correctamente.', { exact: true })).toBeVisible();

  // VO-06: una segunda identidad OIDC simultánea no ve ni modifica la nota de A.
  const second = await browser.newContext({ baseURL: origin, viewport: page.viewportSize()! });
  try {
    const bPage = await second.newPage();
    const b = await interactiveLogin(bPage, randomUUID());
    expect(b).not.toBe(a);
    await openVoice(bPage);
    await expect(bPage.getByText('No hay notas de voz todavía.')).toBeVisible();
    const csrf = await csrfHeaders(bPage);
    const missing = await (await bPage.request.get(`${notes}/${randomUUID()}`)).json();
    for (const [method, url, data] of [
      ['GET', `${notes}/${note.id}`, undefined],
      ['PUT', `${notes}/${note.id}`, { text: 'Ataque', expectedRevision: 1 }],
      ['DELETE', `${notes}/${note.id}?expectedRevision=1`, undefined],
    ] as const) {
      const denied = await bPage.request.fetch(url, { method, headers: csrf, ...(data ? { data } : {}) });
      expect(denied.status()).toBe(404);
      expect((await denied.json()).detail).toBe(missing.detail);
    }
    expect((await bPage.request.post(notes, { headers: csrf, data: { text: 'Privado B' } })).status()).toBe(201);
    expect(await total(bPage)).toBe(1);
    expect(await (await page.request.get(`${notes}/${note.id}`)).json()).toEqual(note);
    expect(await total(page)).toBe(1);

    // VO-06/VO-07: salir durante la transcripción descarta el audio; la respuesta tardía no escribe estado.
    await page.getByRole('button', { name: 'Nueva nota', exact: true }).click();
    await expect(text).toHaveValue('');
    await record(page);
    await providerScenario('timeout');
    const pending = page.waitForRequest(on(transcriptions, 'POST'));
    await page.getByRole('button', { name: 'Detener y transcribir', exact: true }).click();
    const late = await pending;
    await expect(page.getByText('Transcribiendo…', { exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Notas', exact: true }).click();
    await expect(page.getByText('Hay cambios pendientes en la nota de voz.')).toBeVisible();
    await expect(page.locator('.daily-editor-content')).toHaveCount(0);
    await page.getByRole('button', { name: 'Descartar y continuar', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Editor de nota diaria' })).toHaveAttribute('contenteditable', 'true');
    // Abortada por el descarte (null) o cerrada por el deadline del doble (504): nunca un éxito.
    const settled = await late.response();
    expect(settled === null || settled.status() === 504, 'Late transcription never succeeds').toBe(true);
    await openVoice(page);
    await expect(text).toHaveValue('');
    await expect(page.getByText(/No se pudo transcribir/)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Grabar', exact: true })).toBeVisible();
    expect(posts.transcriptions).toBe(3);
    expect(await total(page)).toBe(1);

    // VO-01/VO-06: cerrar sesión con captura activa detiene el micrófono sin subir audio.
    await record(page);
    await logout(page);
    await expect(page).toHaveURL(`${origin}/login`);
    const states = await trackStates(page);
    expect(states.length, 'Three captures: rate limited, discarded and interrupted by logout').toBe(3);
    expect(states.every(state => state === 'audio:ended'), 'Every capture track ended').toBe(true);
    expect(posts.transcriptions).toBe(3);
    expect((await page.request.get(notes)).status()).toBe(401);
    expect(await total(bPage)).toBe(1);
    expect((await (await bPage.request.get(notes)).json()).content[0].excerpt).toBe('Privado B');
  } finally { await second.close(); }
});
