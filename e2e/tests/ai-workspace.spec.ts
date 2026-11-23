import type { Locator, Page } from '@playwright/test';
import { writeWork } from './daily-helpers';
import { control, csrfHeaders, expect, interactiveLogin, readiness, test as base } from './fixtures';

const OPTIONS = '/api/ai/options';
const MESSAGES = '/api/spaces/work/ai/messages';
const fixture = '🧪 Texto seleccionado';
const date = '2026-11-22';

const test = base.extend<{ pilotSession: void }>({
  pilotSession: [async ({ page, identity }, use) => {
    await control('reference-login');
    await readiness(page);
    await interactiveLogin(page, `ai-${identity}`);
    await use();
  }, { auto: true, timeout: 180_000 }],
});

function aiRequests(page: Page) {
  const turns: string[] = [];
  page.on('request', request => {
    if (request.method() === 'POST' && request.url().endsWith(MESSAGES)) turns.push(request.postData() ?? '');
  });
  return turns;
}

async function openSelector(page: Page) {
  const toggle = page.getByRole('button', { name: 'Elegir proveedor y modelo', exact: true }).first();
  await toggle.click();
  return page.getByRole('dialog', { name: 'Proveedor y modelo' });
}

async function selectEditorLine(editor: Locator) {
  await expect(editor).toHaveAttribute('contenteditable', 'true');
  await editor.evaluate(element => {
    element.focus();
    const paragraph = element.querySelector('p');
    if (!paragraph) throw new Error('Expected a paragraph in the fixture document');
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await expect.poll(() => editor.evaluate(() => window.getSelection()?.toString())).toBe(fixture);
}

test('ai workspace: navbar keeps its keyboard and narrow layout contract', async ({ page, context, isMobile }) => {
  if (isMobile) await page.setViewportSize({ width: 360, height: 700 });
  const turns = aiRequests(page);
  const toggle = page.getByRole('button', { name: 'Elegir proveedor y modelo', exact: true });
  await expect(toggle).toBeVisible();
  await toggle.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Proveedor y modelo' });
  await expect(dialog.getByLabel('Proveedor', { exact: true })).toBeFocused();
  await expect(dialog.getByLabel('Modelo', { exact: true })).toHaveValue('openai/gpt-oss-20b');
  await page.keyboard.press('Escape');
  await expect(toggle).toBeFocused();
  await expect(page).toHaveURL(/\/notes/);
  const choice = await openSelector(page);
  await choice.getByLabel('Proveedor', { exact: true }).selectOption('workers');
  await expect(choice.getByLabel('Modelo', { exact: true })).toHaveValue('@cf/openai/gpt-oss-20b');
  await choice.getByRole('button', { name: 'Aplicar' }).click();
  await page.getByRole('link', { name: 'IA', exact: true }).click();
  await expect(page.getByRole('link', { name: 'IA', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByText('Se enviará a Cloudflare Workers AI · GPT OSS 20B')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await expect(page.getByRole('link', { name: 'Historial' })).toBeVisible();
  if (!isMobile) {
    await page.setViewportSize({ width: 480, height: 720 });
    const compact = await openSelector(page);
    await expect(compact.getByLabel('Proveedor', { exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(480);
    await page.setViewportSize({ width: 640, height: 384 });
    const cdp = await context.newCDPSession(page);
    try {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: 640, height: 384, deviceScaleFactor: 2, mobile: false,
      });
      await expect.poll(() => page.evaluate(() => [innerWidth, devicePixelRatio])).toEqual([640, 2]);
      await expect(await openSelector(page)).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(640);
      await page.keyboard.press('Escape');
    } finally {
      await cdp.send('Emulation.clearDeviceMetricsOverride');
      await cdp.detach();
    }
  }
  expect(turns).toEqual([]);
});

test('ai workspace: sends one confirmed turn to each pilot destination and blocks deferred destinations', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const turns = aiRequests(page);
  await page.getByRole('link', { name: 'IA', exact: true }).click();
  const options = await page.request.get(OPTIONS);
  expect(options.status()).toBe(200);
  const api = await (await page.request.get('/api/docs/openapi')).json();
  expect(api.paths[OPTIONS].get.security).toEqual([{ sessionCookie: [] }]);
  expect(api.paths['/api/spaces/{space}/ai/messages'].post.security).toEqual([{ sessionCookie: [], csrfHeader: [] }]);
  const destinations = [
    ['groq', 'openai/gpt-oss-20b'],
    ['groq', 'openai/gpt-oss-120b'],
    ['workers', '@cf/openai/gpt-oss-20b'],
    ['workers', '@cf/openai/gpt-oss-120b'],
    ['gemini', 'gemini-3.1-flash-lite'],
  ];
  const catalog: { id: string; models: { id: string; available: boolean }[] }[] = await options.json();
  const available = catalog.flatMap(({ id, models }) =>
    models.filter(({ available }) => available).map(model => [id, model.id]));
  expect(available).toEqual(destinations);
  for (const [provider, model] of [
    ['gemini', 'gemini-3.8-flash'],
    ['openrouter', 'openai/gpt-oss-20b:free'],
  ]) {
    const dialog = await openSelector(page);
    await dialog.getByLabel('Proveedor', { exact: true }).selectOption(provider);
    await expect(dialog.getByRole('status')).toContainText('Diferido en este piloto');
    if (provider === 'gemini') {
      await expect(dialog.getByRole('option', { name: 'Gemini 3.8 Flash' })).toBeDisabled();
    } else {
      await expect(dialog.getByRole('button', { name: 'Aplicar' })).toBeDisabled();
    }
    await page.keyboard.press('Escape');
    const rejected = await page.request.post(MESSAGES, {
      headers: await csrfHeaders(page),
      data: { provider, model, message: fixture },
    });
    expect(rejected.status()).toBe(409);
    expect(await rejected.json()).toMatchObject({ code: 'ai-model' });
  }
  for (const [provider, model] of destinations) {
    const dialog = await openSelector(page);
    await dialog.getByLabel('Proveedor', { exact: true }).selectOption(provider);
    await dialog.getByLabel('Modelo', { exact: true }).selectOption(model);
    await dialog.getByRole('button', { name: 'Aplicar' }).click();
    await page.getByRole('textbox', { name: 'Mensaje' }).fill(fixture);
    await page.getByRole('button', { name: 'Enviar', exact: true }).click();
    const answer = `Resultado ficticio ${model}: ${fixture}`;
    await expect(page.getByText(answer, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Copiar texto' }).last().click();
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(answer);
  }
  expect(turns).toHaveLength(5);
  const observations = page.getByText(/Cuota observada a las/);
  await expect(observations).toHaveCount(2);
  await expect(observations.nth(0)).toContainText('12 solicitudes restantes por día. 500 tokens restantes por minuto.');
  await expect(observations.nth(1)).toContainText('0 solicitudes restantes por día.');
  await expect(observations.nth(1)).not.toContainText('tokens restantes');
  await expect(observations.nth(0).locator('time')).toHaveAttribute('datetime', /T.*Z$/);
});

test('ai workspace: announces provider failures and resumes only after deliberate confirmation', async ({ page }) => {
  await page.clock.install();
  const turns = aiRequests(page);
  await page.getByRole('link', { name: 'IA', exact: true }).click();
  const draft = page.getByRole('textbox', { name: 'Mensaje' });
  const send = page.getByRole('button', { name: 'Enviar', exact: true });
  const state = page.locator('form').getByRole('status');
  await expect(state).toContainText('Disponible para intentar');
  await draft.fill('[sin-respuesta] borrador ficticio');
  await send.click();
  await expect(state).toContainText('No responde');
  await expect(send).toBeDisabled();
  await expect(draft).toHaveValue('[sin-respuesta] borrador ficticio');
  const change = page.getByRole('button', { name: 'Elegir otro modelo' });
  await change.focus();
  await page.keyboard.press('Enter');
  const selector = page.getByRole('dialog', { name: 'Proveedor y modelo' });
  await expect(selector.getByRole('status')).toContainText('No responde');
  await expect(selector.getByRole('status')).toContainText('Disponible para intentar');
  await selector.getByRole('button', { name: 'Actualizar catálogo' }).click();
  await expect(selector.getByRole('status')).toContainText('No responde');
  expect(turns).toHaveLength(1);
  await selector.getByLabel('Modelo', { exact: true }).selectOption('openai/gpt-oss-120b');
  await selector.getByRole('button', { name: 'Aplicar' }).click();
  await expect(send).toBeEnabled();
  expect(turns).toHaveLength(1);

  await draft.fill('[cuota] borrador ficticio');
  await send.click();
  await expect(state).toContainText('Esperá 17 s');
  await expect(send).toBeDisabled();
  await page.clock.fastForward(17_100);
  await expect(send).toBeEnabled();
  expect(turns).toHaveLength(2);

  await draft.fill('[cuota-sin-espera] borrador ficticio');
  await send.click();
  await expect(state).toContainText('Consultá su consola');
  await expect(state).not.toContainText('Esperá');
  await expect(send).toBeDisabled();
  await page.getByRole('button', { name: 'Volver a intentar' }).click();
  await expect(draft).toBeFocused();
  await expect(send).toBeEnabled();
  expect(turns).toHaveLength(3);

  for (const sample of ['[parcial]', '[ausente]', '[inválida]']) {
    await draft.fill(sample);
    await send.click();
    await expect(page.getByText(`Resultado ficticio openai/gpt-oss-120b: ${sample}`)).toBeVisible();
  }
  await expect(page.getByText(/Cuota observada a las/)).toHaveCount(1);
  await expect(page.getByText(/Cuota observada a las/)).toContainText('71 tokens restantes por minuto.');
  await expect(page.getByText(/Cuota observada a las/)).not.toContainText('solicitudes restantes');
  expect(turns).toHaveLength(6);
});

test('ai workspace: previews saved daily and free fragments before explicit sending', async ({ page, identity }) => {
  const turns = aiRequests(page);
  await page.goto(`/notes/${date}?space=work`);
  const editor = page.getByRole('textbox', { name: 'Editor de nota diaria' });
  await writeWork(page, date, fixture);
  await selectEditorLine(editor);
  await expect(page.getByRole('button', { name: 'Agregar enlace' })).toBeEnabled();
  await page.getByRole('button', { name: 'Consultar con IA' }).click();
  await expect(page.getByRole('textbox', { name: 'Fragmento a compartir' })).toHaveValue(fixture);
  expect(turns).toHaveLength(0);
  await page.getByRole('textbox', { name: 'Mensaje' }).fill('Resumí');
  await page.getByRole('button', { name: 'Enviar', exact: true }).click();
  await expect(page.getByText(/Resultado ficticio.*Resumí/)).toBeVisible();
  expect(JSON.parse(turns[0]).excerpt).toMatchObject({ source: 'daily', start: 0, end: Array.from(fixture).length });
  expect(turns[0]).not.toContain(fixture);

  const data = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: fixture }] }] };
  const saved = await page.request.post('/api/spaces/work/free-notes', {
    headers: await csrfHeaders(page),
    data: { attemptId: `019e0000-0000-7000-8000-${identity.slice(-12)}`, title: 'T-094 ficticia', document: data },
  });
  expect(saved.status()).toBe(201);
  const { id } = await saved.json();
  await page.goto(`/free-notes/${id}?space=work`);
  const free = page.locator('.tiptap[contenteditable=true]');
  await selectEditorLine(free);
  await page.getByRole('button', { name: 'Consultar con IA' }).click();
  await expect(page.getByRole('textbox', { name: 'Fragmento a compartir' })).toHaveValue(fixture);
  await expect(page.getByText(/Resultado ficticio/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Quitar fragmento' }).click();
  await expect(page.getByRole('textbox', { name: 'Fragmento a compartir' })).toHaveCount(0);
  const picker = page.getByRole('button', { name: 'Añadir fragmento' });
  await picker.click();
  const dialog = page.getByRole('dialog', { name: 'Añadir fragmento' });
  await dialog.getByLabel('Origen').selectOption('free');
  await dialog.getByLabel('Nota guardada').selectOption(id);
  const stored = dialog.getByRole('textbox', { name: 'Texto guardado' });
  await stored.focus();
  await stored.press('Control+a');
  await dialog.getByRole('button', { name: 'Añadir la selección' }).click();
  await expect(page.getByRole('textbox', { name: 'Fragmento a compartir' })).toHaveValue(fixture);
  expect(turns).toHaveLength(1);
});
