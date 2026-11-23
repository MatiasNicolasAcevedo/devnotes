import { text } from 'node:stream/consumers';

const models = [
  ['openai/gpt-oss-20b:free', 'GPT OSS 20B', '0'],
  ['google/gemma-4-31b-it:free', 'Gemma 4', '0'],
  ['some/unknown-price:free', 'Precio desconocido'],
  ['some/paid:free', 'Costo por solicitud', '0', '1'],
].map(([id, name, completion, request]) => ({
  id, name, architecture: { input_modalities: ['text'], output_modalities: ['text'] },
  pricing: { prompt: '0', completion, request },
}));

const providers = [
  ['/openai/v1/chat/completions', 'groq-text', 'max_completion_tokens'],
  ['/client/v4/accounts/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/ai/v1/chat/completions', 'workers', 'max_tokens'],
  ['/api/v1/chat/completions', 'openrouter', 'max_tokens'],
];

function json(res, status, payload, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers }).end(JSON.stringify(payload));
}

export function handleAiProvider(req, res) {
  const path = req.url;
  if (req.method === 'GET' && (path === '/api/v1/models' || path === '/api/v1/key')) {
    if (req.headers.authorization !== 'Bearer fictitious-e2e-openrouter-key') return res.writeHead(401).end(), true;
    json(res, 200, { data: path.endsWith('/key') ? { is_free_tier: true, byok_usage: 0 } : models });
    return true;
  }
  const config = providers.find(([endpoint]) => endpoint === path);
  const gemini = /^\/v1beta\/models\/(gemini-[a-z0-9.-]+):generateContent$/.exec(path ?? '');
  if (req.method !== 'POST' || (!config && !gemini)) return false;
  void reply(req, res, config, gemini).catch(() => res.writeHead(400).end());
  return true;
}

async function reply(req, res, config, gemini) {
  const payload = JSON.parse(await text(req));
  const model = gemini ? gemini[1] : payload.model;
  const provider = gemini ? 'gemini' : config[1];
  const prompt = gemini ? payload.contents?.[0]?.parts?.[0]?.text : payload.messages?.[0]?.content;
  const credential = gemini ? req.headers['x-goog-api-key'] : req.headers.authorization;
  const expected = (gemini ? '' : 'Bearer ') + `fictitious-e2e-${provider}-key`;
  const tokenLimit = gemini ? payload.generationConfig.maxOutputTokens : payload[config[2]];
  if (credential !== expected || tokenLimit !== 1024 || typeof prompt !== 'string' || payload.tools) {
    res.writeHead(400).end();
    return;
  }
  if (provider === 'openrouter' && !(payload.provider?.zdr && payload.provider.data_collection === 'deny'
      && payload.provider.allow_fallbacks === false && payload.provider.max_price?.request === 0)) {
    res.writeHead(400).end();
    return;
  }
  if (prompt.includes('[limite-temporal]')) {
    json(res, 429, { error: 'private fixture' }, { 'Retry-After': '17' });
    return;
  }
  if (prompt.includes('[cuota-sin-espera]')) {
    json(res, 429, { error: 'private fixture' }, { 'x-ratelimit-remaining-requests': '0' });
    return;
  }
  if (prompt.includes('[limite-sin-espera]')) {
    json(res, 429, { error: 'private fixture' }, { 'Retry-After': 'desconocido' });
    return;
  }
  if (prompt.includes('[sin-respuesta]')) {
    json(res, 503, { error: 'private fixture' });
    return;
  }
  if (prompt.includes('[tarde]')) await new Promise(resolve => setTimeout(resolve, 1200));
  const answer = 'Resultado ficticio ' + model + ': ' + prompt;
  let headers = {};
  if (provider === 'groq-text') {
    if (prompt.includes('[parcial]')) headers = { 'x-ratelimit-remaining-tokens': '71' };
    else if (prompt.includes('[inválida]')) headers = {
      'x-ratelimit-remaining-requests': '-1', 'x-ratelimit-remaining-tokens': 'desconocido',
    };
    else if (!prompt.includes('[ausente]')) headers = {
      'x-ratelimit-remaining-requests': model === 'openai/gpt-oss-20b' ? '12' : '0',
      'x-ratelimit-remaining-tokens': model === 'openai/gpt-oss-20b' ? '500' : 'desconocido',
    };
  }
  json(res, 200, gemini
    ? { modelVersion: model, candidates: [{ content: { parts: [{ text: answer }] } }] }
    : { model, choices: [{ message: { content: answer } }] }, headers);
}
