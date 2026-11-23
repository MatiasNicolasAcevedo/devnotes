import type { Page } from '@playwright/test';
import { control, csrfHeaders, expect, interactiveLogin, readiness, test as base } from './fixtures';

const OPTIONS = '/api/ai/options';
const MESSAGES = '/api/spaces/work/ai/messages';
const fixture = '🧪 Texto seleccionado';

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

test('ai workspace: navbar keeps its keyboard and narrow layout contract', async ({ page, isMobile }) => {
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
  }
  expect(turns).toEqual([]);
});

test('ai workspace: sends one text turn through each provider with no automatic resend', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const turns = aiRequests(page);
  await page.getByRole('link', { name: 'IA', exact: true }).click();
  const options = await page.request.get(OPTIONS);
  expect(options.status()).toBe(200);
  const api = await (await page.request.get('/api/docs/openapi')).json();
  expect(api.paths[OPTIONS].get.security).toEqual([{ sessionCookie: [] }]);
  expect(api.paths['/api/spaces/{space}/ai/messages'].post.security).toEqual([{ sessionCookie: [], csrfHeader: [] }]);
  for (const [provider, model] of [
    ['groq', 'openai/gpt-oss-20b'],
    ['workers', '@cf/openai/gpt-oss-20b'],
    ['gemini', 'gemini-3.1-flash-lite'],
    ['openrouter', 'openai/gpt-oss-20b:free'],
  ]) {
    const dialog = await openSelector(page);
    await dialog.getByLabel('Proveedor', { exact: true }).selectOption(provider);
    await expect(dialog.getByLabel('Modelo', { exact: true })).toHaveValue(model);
    if (provider === 'openrouter') {
      await expect(dialog.getByRole('option', { name: 'Precio desconocido' })).toHaveCount(0);
      await expect(dialog.getByRole('option', { name: 'Costo por solicitud' })).toHaveCount(0);
    }
    await dialog.getByRole('button', { name: 'Aplicar' }).click();
    await page.getByRole('textbox', { name: 'Mensaje' }).fill(fixture);
    await page.getByRole('button', { name: 'Enviar', exact: true }).click();
    const answer = `Resultado ficticio ${model}: ${fixture}`;
    await expect(page.getByText(answer, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Copiar texto' }).last().click();
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(answer);
  }
  expect(turns).toHaveLength(4);
  await page.getByRole('textbox', { name: 'Mensaje' }).fill('[cuota] borrador ficticio');
  await page.getByRole('button', { name: 'Enviar', exact: true }).click();
  await expect(page.getByText(/Esperá 17 s/)).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Mensaje' })).toHaveValue('[cuota] borrador ficticio');
  expect(turns).toHaveLength(5);
});

test('ai workspace: previews saved daily and free fragments before explicit sending', async ({ page, identity }) => {
  const turns = aiRequests(page);
  const editor = page.getByRole('textbox', { name: 'Editor de nota diaria' });
  await editor.fill(fixture);
  await editor.press('Home');
  await editor.press('Shift+End');
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
  await free.press('Home');
  await free.press('Shift+End');
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
  await stored.press('Home');
  await stored.press('Shift+End');
  await dialog.getByRole('button', { name: 'Añadir la selección' }).click();
  await expect(page.getByRole('textbox', { name: 'Fragmento a compartir' })).toHaveValue(fixture);
  expect(turns).toHaveLength(1);
});
