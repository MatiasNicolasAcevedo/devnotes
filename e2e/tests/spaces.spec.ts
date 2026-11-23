import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import type { Page, Request } from '@playwright/test';
import { readVersion, saveVersion, writeWork } from './daily-helpers';
import { accountButton, control, csrfHeaders, expect, interactiveLogin, keyboardActivate, layout, login, logout, readiness, test } from './fixtures';
import { fakeMicrophone, prepareVoiceContext, trackStates } from '../fixtures/voice-fixture';

test.use({ launchOptions: fakeMicrophone });
test.describe.configure({ timeout: 120_000 });

const origin = 'http://localhost';
const date = '2026-11-06';
const daily = '/api/v1/daily-notes';
const versions = '/api/v1/daily-versions';
const refs = '/api/v1/reference-items';
const voice = '/api/v1/voice-notes';
const previewPath = '/api/v1/portability/import-preview';
const imports = '/api/v1/portability/imports';
const collections = [refs, daily, versions, voice];
const names = { work: 'Trabajo', personal: 'Personal' };
type Space = keyof typeof names;
const spaces = ['work', 'personal'] as const;
const none = { references: 0, dailyNotes: 0, dailyVersions: 0, voiceNotes: 0 };
const one = { references: 1, dailyNotes: 1, dailyVersions: 1, voiceNotes: 1 };
const two = { references: 2, dailyNotes: 2, dailyVersions: 2, voiceNotes: 2 };

function scoped(path: string, space: Space) {
  return path + (path.includes('?') ? '&' : '?') + 'space=' + space;
}

function matches(request: Request, path: string, method: string, space?: Space) {
  const url = new URL(request.url());
  return url.pathname === path && request.method() === method
    && (space === undefined || url.searchParams.get('space') === space);
}

function response(page: Page, path: string, method: string, space?: Space) {
  return page.waitForResponse(result => matches(result.request(), path, method, space));
}

function editor(page: Page) {
  return page.getByRole('textbox', { name: 'Editor de nota diaria' });
}

function voiceText(page: Page) {
  return page.getByRole('textbox', { name: 'Texto de la nota' });
}

function selector(page: Page, space: Space) {
  return page.getByRole('button', { name: 'Espacio: ' + names[space], exact: true });
}

async function switchSpace(page: Page, from: Space, to: Space) {
  await selector(page, from).click();
  await page.getByRole('menuitemradio', { name: names[to], exact: true }).click();
}

async function openNote(page: Page, space: Space) {
  await page.goto(scoped('/notes/' + date, space));
  await expect(editor(page)).toHaveAttribute('contenteditable', 'true');
}

async function json(page: Page, path: string) {
  const result = await page.request.get(path);
  expect(result.status(), 'GET ' + path).toBe(200);
  return result.json();
}

function noteContent(text: string, ...ids: string[]) {
  return {
    type: 'doc',
    content: [{
      type: 'paragraph',
      content: [{ type: 'text', text }, ...ids.map(id => ({ type: 'reference', attrs: { id } }))],
    }],
  };
}

async function putNote(page: Page, space: Space, text: string, expectedRevision = 0, ids: string[] = []) {
  return page.request.put(scoped(daily + '/' + date, space), {
    headers: await csrfHeaders(page),
    data: { content: noteContent(text, ...ids), expectedRevision },
  });
}

async function counts(page: Page, space: Space) {
  const [references, dailyNotes, dailyVersions, voiceNotes] = await Promise.all(
    collections.map(async path => (await json(page, scoped(path, space))).totalElements),
  );
  return { references, dailyNotes, dailyVersions, voiceNotes };
}

async function createItem(page: Page, resource: string, space: Space, data: Record<string, string>) {
  const result = await page.request.post(scoped(resource, space), { headers: await csrfHeaders(page), data });
  expect(result.status()).toBe(201);
  return result.json();
}

async function openData(page: Page) {
  await accountButton(page).click();
  await page.getByRole('menuitem', { name: 'Datos de la cuenta', exact: true }).click();
  await expect(page).toHaveURL(origin + '/data');
  await expect(page.getByRole('heading', { name: 'Datos de la cuenta', exact: true })).toBeVisible();
}

function workbook(buffer: Buffer) {
  return {
    name: 'respaldo-ficticio.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer,
  };
}

async function selectWorkbook(page: Page, bytes: Buffer) {
  const preview = response(page, previewPath, 'POST');
  await page.getByLabel('Archivo de respaldo (.xlsx)', { exact: true }).setInputFiles(workbook(bytes));
  const result = await preview;
  expect(result.status()).toBe(200);
  return result.json();
}

async function confirmImport(page: Page) {
  await page.getByRole('button', { name: 'Importar', exact: true }).click();
  await page.getByRole('dialog', { name: '¿Importar este archivo?' })
    .getByRole('button', { name: 'Confirmar importación' }).click();
}

async function loginForTwoActors(page: Page, identity: string) {
  await control('reference-login');
  await readiness(page);
  return interactiveLogin(page, identity);
}

test('spaces: SP-01/SP-04/SP-10 same day, independent snapshots and legacy API', async ({ page, identity }) => {
  await login(page, identity);
  const writes: Request[] = [];
  page.on('request', request => {
    if (matches(request, daily + '/' + date, 'PUT') || matches(request, daily + '/' + date + '/version', 'POST')) {
      writes.push(request);
    }
  });

  for (const space of spaces) {
    await openNote(page, space);
    await expect(editor(page)).toHaveText('');
    expect((await counts(page, space)).dailyNotes).toBe(0);
    expect(writes).toHaveLength(space === 'work' ? 0 : 2);
    await writeWork(page, date, 'Copia de ' + names[space]);
    await saveVersion(page, date);
  }
  await writeWork(page, date, 'Personal actualizado');
  await saveVersion(page, date, true);
  await writeWork(page, date, 'Borrador Personal posterior');
  expect(writes.map(request => new URL(request.url()).searchParams.getAll('space')))
    .toEqual([['work'], ['work'], ['personal'], ['personal'], ['personal'], ['personal'], ['personal']]);

  await page.reload();
  await expect(editor(page)).toHaveText('Borrador Personal posterior');
  await switchSpace(page, 'personal', 'work');
  await expect(page).toHaveURL(origin + scoped('/notes/' + date, 'work'));
  await page.reload();
  await expect(editor(page)).toHaveText('Copia de Trabajo');
  const legacy = await json(page, daily + '/' + date);
  expect(legacy).toEqual(await json(page, scoped(daily + '/' + date, 'work')));
  const headers = await csrfHeaders(page);
  expect((await page.request.put(daily + '/' + date, {
    headers, data: { content: noteContent('Cliente anterior'), expectedRevision: legacy.revision },
  })).status()).toBe(200);
  expect((await json(page, scoped(daily + '/' + date, 'personal'))).content)
    .toEqual(noteContent('Borrador Personal posterior'));
  await readVersion(page, date, 'Copia de Trabajo');
  await switchSpace(page, 'work', 'personal');
  await expect(page).toHaveURL(origin + scoped('/history/' + date, 'personal'));
  await expect(page.getByRole('textbox', { name: 'Versión de solo lectura' })).toHaveText('Personal actualizado');
  expect(await json(page, versions + '/' + date)).toEqual(await json(page, scoped(versions + '/' + date, 'work')));
  for (const bad of ['space=', 'space=WORK', 'space=work&space=personal']) {
    expect((await page.request.put(daily + '/' + date + '?' + bad, {
      headers, data: { content: noteContent('Cambio inválido'), expectedRevision: legacy.revision + 1 },
    })).status()).toBe(400);
  }
  expect((await json(page, scoped(daily + '/' + date, 'work'))).content).toEqual(noteContent('Cliente anterior'));
});

test('spaces: SP-03/SP-04/SP-10 reference picker, voice and second actor stay isolated', async ({ page, browser, identity }) => {
  const owner = await loginForTwoActors(page, identity);
  const uiRequests: Request[] = [];
  page.on('request', request => {
    const path = new URL(request.url()).pathname;
    if ([refs, voice].some(collection => path === collection || path.startsWith(collection + '/'))) uiRequests.push(request);
  });
  const workRef = await createItem(page, refs, 'work', { title: 'Runbook Trabajo', description: 'Solo Trabajo' });
  const personalRef = await createItem(page, refs, 'personal', { title: 'Runbook Personal', description: 'Solo Personal' });
  const workVoice = await createItem(page, voice, 'work', { text: 'Voz de Trabajo' });
  const personalVoice = await createItem(page, voice, 'personal', { text: 'Voz de Personal' });
  await openNote(page, 'personal');
  await editor(page).click();
  await page.keyboard.type('@Runbook');
  const picker = page.locator('[data-reference-picker]');
  await expect(picker.getByRole('button', { name: /Runbook Personal/ })).toBeVisible();
  await expect(picker.getByRole('button', { name: /Runbook Trabajo/ })).toHaveCount(0);
  const saved = response(page, daily + '/' + date, 'PUT', 'personal');
  await picker.getByRole('button', { name: /Runbook Personal/ }).click();
  expect((await saved).status()).toBe(200);
  await expect(editor(page).locator('[data-reference-id]')).toHaveText('@Runbook Personal');

  const stored = await json(page, scoped(daily + '/' + date, 'personal'));
  expect((await putNote(page, 'personal', 'Átomos en Personal', stored.revision, [personalRef.id, workRef.id])).status()).toBe(200);
  await page.reload();
  await expect(editor(page).locator('[data-reference-id]').nth(0)).toHaveText('@Runbook Personal');
  await expect(editor(page).locator('[data-reference-id]').nth(1)).toHaveText('Referencia no disponible');
  await saveVersion(page, date);
  await page.getByRole('link', { name: 'Referencias', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Runbook Personal' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Runbook Trabajo' })).toHaveCount(0);
  const refUpdate = response(page, refs + '/' + personalRef.id, 'PUT', 'personal');
  await page.getByRole('button', { name: 'Editar Runbook Personal' }).click();
  await page.getByRole('textbox', { name: /Título/ }).fill('Runbook Personal editado');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  expect((await refUpdate).status()).toBe(200);
  expect((await json(page, scoped(refs + '?q=editado', 'personal'))).totalElements).toBe(1);
  expect((await json(page, scoped(refs + '?q=editado', 'work'))).totalElements).toBe(0);

  await page.getByRole('link', { name: 'Voz', exact: true }).click();
  await page.getByRole('button', { name: /Voz de Personal/ }).click();
  await expect(page.getByRole('button', { name: /Voz de Trabajo/ })).toHaveCount(0);
  await expect(voiceText(page)).toHaveValue(personalVoice.text);
  await voiceText(page).fill('Voz Personal editada');
  const voiceUpdate = response(page, voice + '/' + personalVoice.id, 'PUT', 'personal');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  expect((await voiceUpdate).status()).toBe(200);
  await expect(page.getByText('Nota guardada correctamente.')).toBeVisible();
  expect((await counts(page, 'personal')).voiceNotes).toBe(1);
  expect((await counts(page, 'work')).voiceNotes).toBe(1);

  const second = await browser.newContext({ baseURL: origin, viewport: page.viewportSize()! });
  try {
    const other = await second.newPage();
    expect(await interactiveLogin(other, randomUUID())).not.toBe(owner);
    for (const space of spaces) expect(await counts(other, space)).toEqual(none);

    const targets = [
      { path: refs, id: personalRef.id, data: { title: 'Referencia ficticia', description: '' } },
      { path: voice, id: personalVoice.id, data: { text: 'Voz ficticia', expectedRevision: 2 } },
    ];
    for (const [actor, space] of [[page, 'work'], [other, 'personal']] as const) {
      const headers = await csrfHeaders(actor);
      for (const { path, id, data } of targets) {
        const missing = await actor.request.get(scoped(path + '/' + randomUUID(), space));
        expect(missing.status()).toBe(404);
        const problem = await missing.json();
        for (const method of ['GET', 'PUT', 'DELETE']) {
          const revision = method === 'DELETE' && path === voice ? '?expectedRevision=2' : '';
          const denied = await actor.request.fetch(scoped(path + '/' + id + revision, space), {
            method, headers, data: method === 'PUT' ? data : undefined,
          });
          expect(denied.status(), method + ' ' + space).toBe(404);
          expect((await denied.json()).detail).toBe(problem.detail);
        }
      }
    }
    await other.goto(scoped('/history/' + date, 'personal'));
    await expect(other.getByText(/No hay una versión guardada/)).toBeVisible();
    const absent = await other.request.get(scoped(daily + '/' + date, 'personal'));
    expect(absent.status()).toBe(404);
    expect(await absent.json()).not.toHaveProperty('content');
    expect((await counts(other, 'personal')).dailyNotes).toBe(0);
    expect((await other.request.post(scoped(daily + '/' + date + '/version', 'personal'), {
      headers: await csrfHeaders(other), data: { expectedRevision: stored.revision + 1 },
    })).status()).toBe(404);

    const deletedVoice = response(page, voice + '/' + personalVoice.id, 'DELETE', 'personal');
    await page.getByRole('button', { name: 'Borrar', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar', exact: true }).click();
    expect((await deletedVoice).status()).toBe(204);
    await page.getByRole('link', { name: 'Referencias', exact: true }).click();
    const deletedRef = response(page, refs + '/' + personalRef.id, 'DELETE', 'personal');
    await page.getByRole('button', { name: 'Eliminar Runbook Personal editado' }).click();
    await page.getByRole('button', { name: 'Confirmar eliminación' }).click();
    expect((await deletedRef).status()).toBe(204);
    expect(await counts(page, 'personal')).toEqual({ ...none, dailyNotes: 1, dailyVersions: 1 });
    expect(await json(page, scoped(refs + '/' + workRef.id, 'work'))).toEqual(workRef);
    expect(await json(page, scoped(voice + '/' + workVoice.id, 'work'))).toEqual(workVoice);
    expect((await page.request.post(scoped(refs, 'personal'), { data: { title: 'Sin CSRF', description: '' } })).status()).toBe(403);
    expect(uiRequests.length).toBeGreaterThan(4);
    for (const request of uiRequests) expect(new URL(request.url()).searchParams.getAll('space')).toEqual(['personal']);
  } finally {
    await second.close();
  }
});

test('spaces: SP-05 daily flush waits for the real acknowledgement and a stale write stays in origin', async ({ page, identity }) => {
  await login(page, identity);
  await openNote(page, 'work');
  const destinationReads: Request[] = [];
  page.on('request', request => {
    if (matches(request, daily + '/' + date, 'GET', 'personal')) destinationReads.push(request);
  });
  const cdp = await page.context().newCDPSession(page);
  let paused: { requestId: string; responseStatusCode?: number } | undefined;
  await cdp.send('Fetch.enable', {
    patterns: [{ urlPattern: origin + daily + '/' + date + '*', requestStage: 'Response' }],
  });
  cdp.on('Fetch.requestPaused', event => { paused = event; });
  try {
    const saved = response(page, daily + '/' + date, 'PUT', 'work');
    await editor(page).fill('Trabajo antes del ACK');
    await switchSpace(page, 'work', 'personal');
    await expect.poll(() => paused?.responseStatusCode).toBe(200);
    await expect(selector(page, 'work')).toBeVisible();
    await expect(page).toHaveURL(origin + scoped('/notes/' + date, 'work'));
    await expect(editor(page)).toHaveText('Trabajo antes del ACK');
    expect(destinationReads).toHaveLength(0);
    await cdp.send('Fetch.disable');
    expect((await saved).status()).toBe(200);
    await expect(page).toHaveURL(origin + scoped('/notes/' + date, 'personal'));
    await expect(editor(page)).toHaveText('');
    await expect.poll(() => destinationReads.length).toBeGreaterThan(0);
  } finally {
    await cdp.detach();
  }

  await writeWork(page, date, 'Personal confirmado');
  expect((await putNote(page, 'personal', 'Edición simultánea de Personal', 1)).status()).toBe(200);
  const rejected = response(page, daily + '/' + date, 'PUT', 'personal');
  await editor(page).fill('Borrador Personal sin perder');
  await switchSpace(page, 'personal', 'work');
  expect((await rejected).status()).toBe(409);
  await expect(page.getByText(/El borrador se conserva en Personal/)).toBeVisible();
  await expect(selector(page, 'personal')).toBeVisible();
  await expect(page).toHaveURL(origin + scoped('/notes/' + date, 'personal'));
  await expect(editor(page)).toHaveText('Borrador Personal sin perder');
  expect((await json(page, scoped(daily + '/' + date, 'personal'))).content).toEqual(noteContent('Edición simultánea de Personal'));
  expect((await json(page, scoped(daily + '/' + date, 'work'))).content).toEqual(noteContent('Trabajo antes del ACK'));
});

test('spaces: SP-05 cancel, discard and save voice drafts before switching', async ({ page, identity }) => {
  await login(page, identity);
  await page.getByRole('link', { name: 'Voz', exact: true }).click();
  await voiceText(page).fill('Texto de Trabajo sin guardar');
  await switchSpace(page, 'work', 'personal');
  const guard = page.getByRole('alert').filter({ hasText: 'Hay cambios sin guardar en la nota de voz' });
  await expect(guard).toBeVisible();
  await guard.getByRole('button', { name: 'Seguir aquí' }).click();
  await expect(guard).toBeHidden();
  await expect(page).toHaveURL(origin + '/voice?space=work');
  await expect(voiceText(page)).toHaveValue('Texto de Trabajo sin guardar');
  expect(await counts(page, 'work')).toEqual(none);
  await switchSpace(page, 'work', 'personal');
  const saved = response(page, voice, 'POST', 'work');
  await guard.getByRole('button', { name: 'Guardar y cambiar' }).click();
  expect((await saved).status()).toBe(201);
  await expect(page).toHaveURL(origin + '/voice?space=personal');
  await expect(voiceText(page)).toHaveValue('');
  const savedId = (await json(page, scoped(voice, 'work'))).content[0].id;
  expect((await json(page, scoped(voice + '/' + savedId, 'work'))).text).toBe('Texto de Trabajo sin guardar');
  await voiceText(page).fill('Borrador Personal descartado');
  await switchSpace(page, 'personal', 'work');
  await guard.getByRole('button', { name: 'Descartar y cambiar' }).click();
  await expect(page).toHaveURL(origin + '/voice?space=work');
  await expect(page.getByRole('button', { name: /Texto de Trabajo sin guardar/ })).toBeVisible();
  await expect(voiceText(page)).toHaveValue('');
  expect(await counts(page, 'personal')).toEqual(none);
});

test('spaces: SP-06/SP-07 responsive navigation, history, tabs and logout preference', async ({ page, context, identity, isMobile }, testInfo) => {
  const owner = await login(page, identity);
  const preference = 'devnotes:last-space:' + owner;
  await openNote(page, 'work');
  const nav = page.getByRole('navigation', { name: 'Navegación principal' });
  const banner = page.getByRole('banner');
  for (const width of [360, 375, 390, 767, 768, 1280, 640]) {
    await page.setViewportSize({ width, height: width === 640 ? 400 : 800 });
    await expect(banner.getByRole('link', { name: 'DevNotes', exact: true })).toHaveCount(0);
    await expect(selector(page, 'work')).toHaveText('Trabajo');
    await expect(selector(page, 'work')).toHaveCSS('color', 'rgb(134, 239, 172)');
    expect((await selector(page, 'work').boundingBox())!.height).toBeGreaterThanOrEqual(!isMobile && width < 768 ? 28 : 44);
    await expect(banner.getByRole('navigation')).toHaveCount(width >= 768 ? 1 : 0);
    for (const name of ['Notas', 'Voz', 'Referencias', 'Historial']) {
      const link = nav.getByRole('link', { name, exact: true });
      await expect(link).toHaveText(name);
      if (width < 768) expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(48);
    }
    await layout(page);
  }
  await page.setViewportSize(testInfo.project.name === 'mobile' ? { width: 375, height: 812 } : { width: 1280, height: 800 });
  await keyboardActivate(page, 'button', 'Espacio: Trabajo');
  const selected = page.getByRole('menuitemradio', { name: 'Trabajo', checked: true });
  await expect(selected).toBeFocused();
  expect((await selected.boundingBox())!.height).toBeGreaterThanOrEqual(48);
  await page.keyboard.press('Escape');
  await expect(selector(page, 'work')).toBeFocused();
  await expect(selector(page, 'work')).toHaveCSS('outline-width', '2px');
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(origin + scoped('/notes/' + date, 'personal'));
  await expect(selector(page, 'personal')).toHaveCSS('color', 'rgb(196, 181, 253)');
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), preference)).toBe('personal');

  // Known empty fixture screen. Mask the account label before authorizing the screenshot export.
  await expect(editor(page)).toHaveText('');
  await page.screenshot({ path: testInfo.outputPath('safe-failure.png'), mask: [accountButton(page)] });
  await writeFile(testInfo.outputPath('safe-screenshot.json'), JSON.stringify({ safe: true }));

  const otherTab = await context.newPage();
  try {
    await otherTab.goto('/notes/' + date);
    await expect(otherTab).toHaveURL(origin + scoped('/notes/' + date, 'personal'));
    await openNote(otherTab, 'work');
    await expect(selector(page, 'personal')).toBeVisible();
  } finally {
    await otherTab.close();
  }
  await page.goBack();
  await expect(page).toHaveURL(origin + scoped('/notes/' + date, 'work'));
  await page.goForward();
  await expect(page).toHaveURL(origin + scoped('/notes/' + date, 'personal'));
  for (const invalid of ['space=unknown', 'space=work&space=personal']) {
    // Un refetch de la nota válida restaurada por el historial no pertenece a la URL inválida.
    const invalidPage = await context.newPage();
    try {
      const privateRequests: Request[] = [];
      invalidPage.on('request', request => {
        if (collections.some(path => new URL(request.url()).pathname.startsWith(path))) privateRequests.push(request);
      });
      await invalidPage.goto('/notes/' + date + '?' + invalid);
      await expect(invalidPage.getByRole('heading', { name: 'Espacio no válido' })).toBeVisible();
      expect(privateRequests).toHaveLength(0);
    } finally {
      await invalidPage.close();
    }
  }
  await openNote(page, 'personal');
  await logout(page);
  await expect(page).toHaveURL(origin + '/login');
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), preference)).toBeNull();
  expect((await page.request.get(scoped(daily + '/' + date, 'personal'))).status()).toBe(401);
});

test('spaces: SP-08 XLSX round trip preserves both spaces and the import guard', async ({ page, browser, identity }) => {
  const owner = await loginForTwoActors(page, identity);
  const workRef = await createItem(page, refs, 'work', { title: 'Runbook Trabajo', description: '' });
  const original = { work: workRef, personal: await createItem(page, refs, 'personal', { title: 'Runbook Personal', description: '' }) };
  for (const space of spaces) {
    const ids = space === 'work' ? [workRef.id] : [original.personal.id, workRef.id];
    expect((await putNote(page, space, names[space] + ' antes de exportar', 0, ids)).status()).toBe(200);
    expect((await page.request.post(scoped(daily + '/' + date + '/version', space), {
      headers: await csrfHeaders(page), data: { expectedRevision: 1 },
    })).status()).toBe(200);
    await createItem(page, voice, space, { text: 'Voz de ' + names[space] });
  }
  await openData(page);
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar Excel', exact: true }).click();
  const bytes = await readFile((await (await downloading).path())!);
  const second = await browser.newContext({ baseURL: origin, viewport: page.viewportSize()! });
  try {
    const target = await second.newPage();
    expect(await interactiveLogin(target, randomUUID())).not.toBe(owner);
    await switchSpace(target, 'work', 'personal');
    await expect(selector(target, 'personal')).toBeVisible();
    await openData(target);
    const backupCounts = { ...two, imageTexts: 0, freeNotes: 0 };
    const spaceBackupCounts = { ...one, imageTexts: 0, freeNotes: 0 };
    const bySpace = { work: spaceBackupCounts, personal: spaceBackupCounts };
    expect(await selectWorkbook(target, bytes)).toMatchObject({ version: 4, counts: backupCounts, countsBySpace: bySpace, accountEmpty: true });
    expect(await counts(target, 'work')).toEqual(none);
    expect(await counts(target, 'personal')).toEqual(none);
    const cdp = await second.newCDPSession(target);
    let paused: { requestId: string; responseStatusCode?: number } | undefined;
    await cdp.send('Fetch.enable', { patterns: [{ urlPattern: origin + imports, requestStage: 'Response' }] });
    cdp.on('Fetch.requestPaused', event => { paused = event; });
    try {
      const imported = response(target, imports, 'POST');
      await confirmImport(target);
      await expect.poll(() => paused?.responseStatusCode).toBe(201);
      await target.getByRole('link', { name: 'Notas', exact: true }).click();
      await expect(target).toHaveURL(origin + '/data');
      await expect(target.getByText(/No se puede salir de Datos/)).toBeVisible();
      await selector(target, 'personal').click();
      await expect(target.getByRole('menuitemradio', { name: 'Trabajo', exact: true })).toBeDisabled();
      await target.keyboard.press('Escape');
      await expect(target.getByText('Importación completa', { exact: true })).toHaveCount(0);
      await cdp.send('Fetch.continueResponse', { requestId: paused!.requestId });
      const result = await imported;
      expect(result.status()).toBe(201);
      expect(await result.json()).toEqual({ counts: backupCounts, countsBySpace: bySpace });
      await expect(target.getByText('Importación completa', { exact: true })).toBeVisible();
      await expect(selector(target, 'personal')).toBeVisible();
    } finally {
      await cdp.detach();
    }

    for (const space of spaces) {
      expect(await counts(target, space)).toEqual(one);
      const targetRef = (await json(target, scoped(refs, space))).content[0];
      expect(targetRef.id).not.toBe(original[space].id);
      expect(targetRef.title).toBe(original[space].title);
      const ids = space === 'work' ? [targetRef.id] : [targetRef.id, workRef.id];
      const expected = noteContent(names[space] + ' antes de exportar', ...ids);
      for (const collection of [daily, versions]) {
        expect((await json(target, scoped(collection + '/' + date, space))).content).toEqual(expected);
      }
      const targetVoiceId = (await json(target, scoped(voice, space))).content[0].id;
      expect((await json(target, scoped(voice + '/' + targetVoiceId, space))).text).toBe('Voz de ' + names[space]);
      expect((await page.request.get(scoped(refs + '/' + targetRef.id, space))).status()).toBe(404);
      expect(await counts(page, space)).toEqual(one);
    }
    await openNote(target, 'personal');
    await expect(editor(target).getByText('Referencia no disponible')).toBeVisible();
    await openData(target);
    expect(await selectWorkbook(target, bytes)).toMatchObject({ accountEmpty: false });
    await expect(target.getByRole('button', { name: 'Importar', exact: true })).toHaveCount(0);
    const denied = await target.request.post(imports, { headers: await csrfHeaders(target), multipart: { file: workbook(bytes) } });
    expect(denied.status()).toBe(409);
    expect((await denied.json()).code).toBe('IMPORT_ACCOUNT_NOT_EMPTY');
    expect(await counts(target, 'personal')).toEqual(one);
  } finally {
    await second.close();
  }
});

test('spaces: SP-08 legacy v1 imports only into Trabajo from Personal', async ({ page, identity }) => {
  await login(page, identity);
  await switchSpace(page, 'work', 'personal');
  await expect(selector(page, 'personal')).toBeVisible();
  await openData(page);
  // Immutable copy of the pre-spaces server test fixture (see T-065).
  const bytes = await readFile(new URL('../fixtures/devnotes-v1.xlsx', import.meta.url));
  const preview = await selectWorkbook(page, bytes);
  const emptyBackupCounts = { ...none, imageTexts: 0, freeNotes: 0 };
  expect(preview).toMatchObject({ version: 1, accountEmpty: true, counts: { imageTexts: 0, freeNotes: 0 }, countsBySpace: { work: preview.counts, personal: emptyBackupCounts } });
  expect(preview.counts).not.toEqual(emptyBackupCounts);
  await expect(page.getByText('Los respaldos de versión 1 se importan en Trabajo.')).toBeVisible();
  expect(await counts(page, 'work')).toEqual(none);
  expect(await counts(page, 'personal')).toEqual(none);
  const imported = response(page, imports, 'POST');
  await confirmImport(page);
  const result = await imported;
  expect(result.status()).toBe(201);
  expect(await result.json()).toEqual({ counts: preview.counts, countsBySpace: { work: preview.counts, personal: emptyBackupCounts } });
  await expect(page.getByText('Importación completa', { exact: true })).toBeVisible();
  await expect(selector(page, 'personal')).toBeVisible();
  expect({ ...await counts(page, 'work'), imageTexts: 0, freeNotes: 0 }).toEqual(preview.counts);
  expect(await counts(page, 'personal')).toEqual(none);
});

for (const space of spaces) {
  test('spaces: SP-09 import competing with a same-date write in ' + names[space], async ({ page, browser, identity }) => {
    const owner = await loginForTwoActors(page, identity);
    for (const sourceSpace of spaces) {
      expect((await putNote(page, sourceSpace, 'Respaldo de ' + names[sourceSpace])).status()).toBe(200);
      await createItem(page, refs, sourceSpace, { title: 'Referencia ' + names[sourceSpace], description: '' });
    }
    const exported = await page.request.get('/api/v1/portability/export');
    expect(exported.status()).toBe(200);
    const file = workbook(await exported.body());
    const second = await browser.newContext({ baseURL: origin, viewport: page.viewportSize()! });
    try {
      const target = await second.newPage();
      expect(await interactiveLogin(target, randomUUID())).not.toBe(owner);
      const headers = await csrfHeaders(target);
      const preview = await target.request.post(previewPath, { headers, multipart: { file } });
      expect(preview.status()).toBe(200);
      expect((await preview.json()).accountEmpty).toBe(true);
      const [imported, written] = await Promise.all([
        target.request.post(imports, { headers, multipart: { file } }),
        target.request.put(scoped(daily + '/' + date, space), {
          headers, data: { content: noteContent('Escritura concurrente'), expectedRevision: 0 },
        }),
      ]);
      if (imported.status() === 201) {
        expect(written.status()).toBe(409);
        for (const targetSpace of spaces) {
          expect(await counts(target, targetSpace)).toEqual({ ...none, dailyNotes: 1, references: 1 });
          expect((await json(target, scoped(daily + '/' + date, targetSpace))).content)
            .toEqual(noteContent('Respaldo de ' + names[targetSpace]));
        }
      } else {
        expect(imported.status()).toBe(409);
        expect((await imported.json()).code).toBe('IMPORT_ACCOUNT_NOT_EMPTY');
        expect(written.status()).toBe(200);
        expect(await counts(target, space)).toEqual({ ...none, dailyNotes: 1 });
        expect(await counts(target, space === 'work' ? 'personal' : 'work')).toEqual(none);
        expect((await json(target, scoped(daily + '/' + date, space))).content).toEqual(noteContent('Escritura concurrente'));
      }
      const stale = await target.request.post(previewPath, { headers, multipart: { file } });
      expect(stale.status()).toBe(200);
      expect((await stale.json()).accountEmpty).toBe(false);
      const rejected = await target.request.post(imports, { headers, multipart: { file } });
      expect(rejected.status()).toBe(409);
      expect((await rejected.json()).code).toBe('IMPORT_ACCOUNT_NOT_EMPTY');
    } finally {
      await second.close();
    }
  });
}

test('spaces: SP-08/SP-09 Personal-only data blocks a stale import confirmation', async ({ page, identity }) => {
  await login(page, identity);
  await openData(page);
  const bytes = await readFile(new URL('../fixtures/devnotes-v1.xlsx', import.meta.url));
  expect(await selectWorkbook(page, bytes)).toMatchObject({ accountEmpty: true });
  const personalVoice = await createItem(page, voice, 'personal', { text: 'Único dato de Personal' });
  const failed = response(page, imports, 'POST');
  await confirmImport(page);
  const denied = await failed;
  expect(denied.status()).toBe(409);
  expect((await denied.json()).code).toBe('IMPORT_ACCOUNT_NOT_EMPTY');
  await expect(page.getByRole('alert').filter({ hasText: 'No se pudo importar el archivo' }))
    .toContainText('Solo se puede importar en una cuenta sin datos.');
  await expect(page.getByText('Importación completa', { exact: true })).toHaveCount(0);
  expect(await counts(page, 'work')).toEqual(none);
  expect(await counts(page, 'personal')).toEqual({ ...none, voiceNotes: 1 });
  expect(await json(page, scoped(voice + '/' + personalVoice.id, 'personal'))).toEqual(personalVoice);
});


test('spaces: SP-05 a late transcription cannot populate the destination', async ({ page, context, identity }) => {
  await prepareVoiceContext(context);
  await login(page, identity);
  await page.getByRole('link', { name: 'Voz', exact: true }).click();
  const transcriptions = '/api/v1/voice/transcriptions';
  const calls: Request[] = [];
  page.on('request', request => {
    if (matches(request, transcriptions, 'POST')) calls.push(request);
  });
  const cdp = await context.newCDPSession(page);
  let pausedStatus: number | undefined;
  await cdp.send('Fetch.enable', {
    patterns: [{ urlPattern: origin + transcriptions, requestStage: 'Response' }],
  });
  cdp.on('Fetch.requestPaused', event => { pausedStatus = event.responseStatusCode; });
  try {
    await page.getByRole('button', { name: 'Grabar', exact: true }).click();
    await expect(page.getByRole('timer')).toHaveText(/^00:0[1-9]$/);
    await page.getByRole('button', { name: 'Detener y transcribir' }).click();
    await expect.poll(() => pausedStatus).toBe(200);
    expect(await trackStates(page)).toEqual(['audio:ended']);
    await switchSpace(page, 'work', 'personal');
    const guard = page.getByRole('alert').filter({ hasText: 'El audio pendiente se perderá si descartás' });
    await expect(guard).toBeVisible();
    await expect(guard.getByRole('button', { name: 'Guardar y cambiar' })).toBeDisabled();
    await guard.getByRole('button', { name: 'Descartar y cambiar' }).click();
    await expect(page).toHaveURL(origin + '/voice?space=personal');
    await cdp.send('Fetch.disable');
    await expect(voiceText(page)).toHaveValue('');
    expect(calls).toHaveLength(1);
    expect(await counts(page, 'work')).toEqual(none);
    expect(await counts(page, 'personal')).toEqual(none);
    await switchSpace(page, 'personal', 'work');
    await expect(page).toHaveURL(origin + '/voice?space=work');
    await expect(voiceText(page)).toHaveValue('');
  } finally {
    await cdp.detach();
  }
});
