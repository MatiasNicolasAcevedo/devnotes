// Tests for the fictitious voice provider double (S-105 v2).
// Runs the double as a child process, exercises all scenarios, and verifies behavior.
// No Docker, no external network — pure Node process.

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { describe, it, before, after } from 'node:test';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

function request(port, path, method = 'GET', body = '', headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: '127.0.0.1', port, path, method, headers, timeout: 5000 },
      (res) => {
        let text = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { text += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: text }));
      }
    );
    req.on('timeout', () => req.destroy(new Error('Request timeout')));
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function createMultipartBody(fileContent, fileName = 'recording.webm') {
  const boundary = 'VoiceBndry' + Math.random().toString(36).slice(2, 10);
  const separator = `--${boundary}`;
  const body = [
    separator,
    'Content-Disposition: form-data; name="file"; filename="' + fileName + '"',
    'Content-Type: audio/webm',
    '',
    fileContent,
    separator + '--',
    ''
  ].join('\r\n');
  return { body, contentType: `multipart/form-data; boundary=${boundary}` };
}

describe('voice-provider double', () => {
  let server;

  before(() => {
    server = spawn('node', [__dirname + '/voice-provider.mjs'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' }
    });
  });

  after(() => {
    server.kill('SIGTERM');
  });

  // Wait for server to be ready
  it('starts and responds to health check', async () => {
    let attempt = 0;
    while (attempt < 20) {
      try {
        const res = await request(8091, '/healthz');
        assert.equal(res.status, 200);
        assert.equal(res.body, 'ok\n');
        return;
      } catch {
        await new Promise(r => setTimeout(r, 200));
      }
      attempt++;
    }
    throw new Error('voice-provider did not start');
  });

  it('returns successful transcription with verbose_json', async () => {
    // Reset scenario first
    await request(8091, '/healthz?scenario=reset');

    const { body, contentType } = createMultipartBody('fake webm audio content');
    const res = await request(8091, '/openai/v1/audio/transcriptions', 'POST', body, {
      'Content-Type': contentType,
      'Content-Length': Buffer.byteLength(body),
    });

    assert.equal(res.status, 200);
    const json = JSON.parse(res.body);
    assert.equal(json.task, 'transcribe');
    assert.equal(json.language, 'es');
    assert.ok(json.text, 'Should have transcription text');
    assert.ok(json.duration > 0, 'Duration should be positive');
    assert.ok(Array.isArray(json.segments), 'Should have segments');
    assert.equal(json.segments.length, 1);
    assert.ok(json.segments[0].no_speech_prob < 0.6, 'Should not be silence');
  });

  it('returns 429 on rate limit scenario', async () => {
    await request(8091, '/healthz?scenario=429');

    const { body, contentType } = createMultipartBody('fake audio');
    const res = await request(8091, '/openai/v1/audio/transcriptions', 'POST', body, {
      'Content-Type': contentType,
      'Content-Length': Buffer.byteLength(body),
    });

    assert.equal(res.status, 429);
    assert.ok(res.headers['retry-after'], 'Should have Retry-After header');
    const json = JSON.parse(res.body);
    assert.equal(json.error.type, 'rate_limit');
  });

  it('returns malformed JSON on malformed scenario', async () => {
    await request(8091, '/healthz?scenario=malformed');

    const { body, contentType } = createMultipartBody('fake audio');
    const res = await request(8091, '/openai/v1/audio/transcriptions', 'POST', body, {
      'Content-Type': contentType,
      'Content-Length': Buffer.byteLength(body),
    });

    assert.equal(res.status, 500);
    assert.equal(res.headers['content-type'], 'text/plain');
    assert.throws(() => JSON.parse(res.body), SyntaxError);
  });

  it('returns silence (no_speech_prob >= 0.6) on silence scenario', async () => {
    await request(8091, '/healthz?scenario=silence');

    const { body, contentType } = createMultipartBody('fake audio');
    const res = await request(8091, '/openai/v1/audio/transcriptions', 'POST', body, {
      'Content-Type': contentType,
      'Content-Length': Buffer.byteLength(body),
    });

    assert.equal(res.status, 200);
    const json = JSON.parse(res.body);
    assert.equal(json.text, '', 'Silence should return empty text');
    assert.ok(json.segments[0].no_speech_prob >= 0.6, 'Should have high no_speech_prob');
  });

  it('times out on timeout scenario', async () => {
    await request(8091, '/healthz?scenario=timeout');

    const { body, contentType } = createMultipartBody('fake audio');
    // Use a short timeout to verify the hang behavior
    const startTime = Date.now();
    let timedOut = false;
    try {
      await request(8091, '/openai/v1/audio/transcriptions', 'POST', body, {
        'Content-Type': contentType,
        'Content-Length': Buffer.byteLength(body),
      });
    } catch (err) {
      timedOut = true;
    }
    const elapsed = Date.now() - startTime;
    assert.ok(timedOut, 'Request should have timed out');
    assert.ok(elapsed >= 4000, `Should wait at least 4s before timeout (got ${elapsed}ms)`);
  });

  it('resets scenarios after reset', async () => {
    await request(8091, '/healthz?scenario=reset');

    const { body, contentType } = createMultipartBody('fake audio after reset');
    const res = await request(8091, '/openai/v1/audio/transcriptions', 'POST', body, {
      'Content-Type': contentType,
      'Content-Length': Buffer.byteLength(body),
    });

    assert.equal(res.status, 200);
    const json = JSON.parse(res.body);
    assert.ok(json.text, 'Should return normal transcription after reset');
  });

  it('returns 404 for unknown paths', async () => {
    const res = await request(8091, '/unknown/path');
    assert.equal(res.status, 404);
  });

  it('accepts only the fictitious OCR key and exact multipart fixture', async () => {
    const sendOcr = async (name, type, key = 'fictitious-e2e-ocr-key', extraField = false) => {
      const form = new FormData();
      form.set('OCREngine', '2');
      form.set('language', 'auto');
      form.set('isOverlayRequired', 'false');
      if (extraField) form.set('space', 'work');
      const bytes = await readFile(new URL(`./ocr/${name}`, import.meta.url));
      form.set('file', new Blob([bytes], { type }), type === 'image/png' ? 'screenshot.png' : 'screenshot.jpg');
      return fetch('http://127.0.0.1:8091/parse/image', { method: 'POST', body: form, headers: { apikey: key } });
    };
    const denied = await sendOcr('terminal.png', 'image/png', 'incorrect-fictitious-key');
    assert.equal(denied.status, 401);
    assert.equal((await sendOcr('terminal.png', 'image/jpeg')).status, 400);
    assert.equal((await sendOcr('terminal.png', 'image/png', undefined, true)).status, 400);
    for (const [name, type] of [['terminal.png', 'image/png'], ['terminal.jpg', 'image/jpeg']]) {
      const success = await sendOcr(name, type);
      assert.equal(success.status, 200);
      assert.equal((await success.json()).ParsedResults[0].ParsedText, 'T-070\nERR_CONNECTION_RESET\n/src/api/fixture.ts');
    }
    const quota = await sendOcr('quota.png', 'image/png');
    assert.equal(quota.status, 429);
    assert.equal(quota.headers.get('retry-after'), '30');
  });
});
