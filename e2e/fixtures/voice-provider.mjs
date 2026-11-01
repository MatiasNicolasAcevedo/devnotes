// Fictitious Groq transcription double for E2E and proxy assays (S-105 v2).
// Runs on port 8091, responds to POST /openai/v1/audio/transcriptions.
// Validates parameters, returns verbose_json with controlled scenarios.
// Only logs counters — no bodies, cookies, or secrets.

import http from 'node:http';
import { createHash } from 'node:crypto';

const PORT = 8091;
const HEALTH_PATH = '/healthz';
const TRANSCRIPTION_PATH = '/openai/v1/audio/transcriptions';

// Counters for test verification
let requestCount = 0;
let errorCount = 0;

// Scenario control via query parameter 'scenario' on /healthz
// GET /healthz?scenario=timeout → next request hangs
// GET /healthz?scenario=429 → next request returns 429
// GET /healthz?scenario=malformed → next request returns invalid JSON
// GET /healthz?scenario=silence → next request returns no_speech_prob >= 0.6
// GET /healthz?scenario=reset → reset all scenarios
let nextScenario = null;

// Read request body and return size
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      resolve({ fileSize: body.length, isMultipart: (req.headers['content-type'] || '').includes('multipart') });
    });
    req.on('error', reject);
  });
}

const server = http.createServer((req, res) => {
  // Health check
  if (req.method === 'GET' && req.url?.startsWith(HEALTH_PATH)) {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
    const scenario = url.searchParams.get('scenario');
    if (scenario === 'timeout') {
      nextScenario = 'timeout';
    } else if (scenario === '429') {
      nextScenario = '429';
    } else if (scenario === 'malformed') {
      nextScenario = 'malformed';
    } else if (scenario === 'silence') {
      nextScenario = 'silence';
    } else if (scenario === 'reset') {
      nextScenario = null;
    }
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok\n');
    return;
  }

  // Transcription endpoint
  if (req.method === 'POST' && req.url?.startsWith(TRANSCRIPTION_PATH)) {
    requestCount++;

    // Handle scenarios that don't need body reading
    if (nextScenario === 'timeout') {
      // Hang indefinitely — client deadline will kill it
      // Clear scenario so subsequent requests aren't affected
      const clearTimeout = setTimeout(() => { nextScenario = null; }, 6000);
      clearTimeout.unref();
      return;
    }
    if (nextScenario === '429') {
      errorCount++;
      res.writeHead(429, {
        'Content-Type': 'application/json',
        'Retry-After': '30',
      });
      res.end(JSON.stringify({
        error: { message: 'Rate limit exceeded', type: 'rate_limit', param: null, code: 'rate_limit_exceeded' }
      }));
      nextScenario = null;
      return;
    }
    if (nextScenario === 'malformed') {
      errorCount++;
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('{invalid json}');
      nextScenario = null;
      return;
    }

    // Read body and validate multipart
    readBody(req).then((info) => {
      if (!info.isMultipart) {
        errorCount++;
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: { message: 'Invalid multipart request', type: 'invalid_request_error', param: null, code: null }
        }));
        return;
      }
      if (nextScenario === 'silence') {
        nextScenario = null;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          task: 'transcribe',
          language: 'es',
          duration: 3.0,
          text: '',
          words: [],
          segments: [
            { start: 0, end: 3.0, text: '', id: 0, seek: 0, temperature: 0, avg_logprob: -1.0, compression_ratio: 1.0, no_speech_prob: 0.95 }
          ]
        }));
        return;
      }

      // Default: return successful transcription
      const hash = createHash('sha256').update(String(info.fileSize)).digest('hex').slice(0, 8);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        task: 'transcribe',
        language: 'es',
        duration: Math.min(info.fileSize / 1000, 600),
        text: `Hola, esto es una transcripción de prueba con identificador ${hash}.`,
        words: [],
        segments: [
          {
            start: 0,
            end: Math.min(info.fileSize / 1000, 600),
            text: `Hola, esto es una transcripción de prueba con identificador ${hash}.`,
            id: 0,
            seek: 0,
            temperature: 0,
            avg_logprob: -0.5,
            compression_ratio: 1.2,
            no_speech_prob: 0.1
          }
        ]
      }));
    }).catch(() => {
      errorCount++;
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: { message: 'Invalid multipart request', type: 'invalid_request_error', param: null, code: null }
      }));
    });
    return;
  }

  // Unknown path
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('not found\n');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Voice provider double listening on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Voice provider shutting down');
  server.close(() => process.exit(0));
});
process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
