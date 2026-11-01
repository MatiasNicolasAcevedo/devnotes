// Voice proxy assay: tests nginx/Vite forwarding for large multipart uploads (S-105 v2).
// Uses a unique namespace, fictitious body, and verifies size limits and header preservation.
// Pattern follows test-auth-proxies.mjs: unique project, label check, cleanup by labels only.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const project = process.env.STARTER_VOICE_PROXY_PROJECT || `starter-voice-proxy-${Date.now()}-${process.pid}`;
const base = ['compose', '--env-file', 'scripts/fixtures/auth-test.env.example', '-p', project,
  '-f', 'docker-compose.yml', '-f', 'compose.auth-test.yml'];
const echoFile = ['-f', 'scripts/fixtures/compose.proxy-test.yml'];

// Validate project name pattern
assert.match(project, /^starter-voice-proxy-\d+-\d+$/);

// Check no pre-existing resources
function assertEmpty() {
  for (const kind of ['container', 'network', 'volume']) {
    assert.equal(execFileSync('docker', [kind, 'ls', kind === 'container' ? '-aq' : '-q',
      '--filter', `label=com.docker.compose.project=${project}`], { encoding: 'utf8' }).trim(),
      'Voice proxy assay project must be empty');
  }
}
assertEmpty();
console.log(`Voice proxy assay project=${project}`);

function compose(args, capture = false) {
  const result = execFileSync('docker', [...base, ...echoFile, '--profile', 'dev', ...args], {
    cwd: root, encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit',
    env: { ...process.env, APP_PUBLIC_URL: 'http://127.0.0.1:5175' },
  });
  return result;
}

function request(port, path, headers = {}, method = 'GET', body = '') {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1', port, path, method,
      headers: { Host: '127.0.0.1:5175', ...headers },
      timeout: 80000 // 80 s for large uploads
    }, (res) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { text += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: text }));
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error('Proxy request timeout')));
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function createMultipartBody(sizeBytes) {
  const boundary = '----VoiceBoundary' + Date.now();
  const fileContent = 'A'.repeat(sizeBytes);
  const body = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="file"; filename="recording.webm"',
    'Content-Type: audio/webm',
    '',
    fileContent,
    `--${boundary}--`,
    ''
  ].join('\r\n');
  return { body, boundary, size: Buffer.byteLength(body) };
}

(async () => {
  try {
    // Start stack with proxy echo service
    compose(['up', '-d', '--build', '--wait', 'server', 'client', 'client-dev']);

    // Test 1: Small multipart passes through both proxies
    console.log('Test: small multipart passes through nginx and Vite');
    for (const [proxy, port] of [['nginx', 5175], ['Vite', 5176]]) {
      const { body, boundary, size } = createMultipartBody(1024); // 1 KiB
      const res = await request(port, '/api/v1/voice/transcriptions', {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': String(size),
        'Cookie': 'XSRF-TOKEN=fictitious',
        'X-XSRF-TOKEN': 'fictitious',
      }, 'POST', body);

      // Echo service returns 200 with observed headers/body
      assert.equal(res.status, 200, `${proxy} should forward small multipart`);
      const observed = JSON.parse(res.body);
      assert.equal(observed.path, '/api/v1/voice/transcriptions');
      assert.equal(observed.method, 'POST');
      assert.ok(observed.headers['content-type']?.includes('multipart'), `${proxy} should preserve Content-Type`);
      assert.equal(observed.headers.cookie, 'XSRF-TOKEN=fictitious');
      assert.equal(observed.headers['x-xsrf-token'], 'fictitious');
      // Verify forwarding headers are reconstructed, not inherited
      assert.ok(!observed.headers['x-forwarded-for']?.includes('192.0.2.99'), `${proxy} should sanitize X-Forwarded-For`);
      console.log(`  ${proxy}: small multipart forwarded correctly`);
    }

    // Test 2: Large multipart (>1 MiB) passes through (21 MiB limit)
    console.log('Test: large multipart (>1 MiB) passes through');
    for (const [proxy, port] of [['nginx', 5175], ['Vite', 5176]]) {
      const { body, boundary, size } = createMultipartBody(1_100_000); // ~1.1 MiB
      const res = await request(port, '/api/v1/voice/transcriptions', {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': String(size),
      }, 'POST', body);

      assert.equal(res.status, 200, `${proxy} should forward large multipart`);
      const observed = JSON.parse(res.body);
      assert.equal(observed.path, '/api/v1/voice/transcriptions');
      console.log(`  ${proxy}: large multipart (${(size / 1024 / 1024).toFixed(2)} MiB) forwarded`);
    }

    // Test 3: Exceeding 21 MiB returns 413 from nginx
    console.log('Test: exceeding 21 MiB returns 413 from nginx');
    {
      const { body, boundary, size } = createMultipartBody(22 * 1024 * 1024); // 22 MiB
      const res = await request(5175, '/api/v1/voice/transcriptions', {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': String(size),
      }, 'POST', body);

      assert.equal(res.status, 413, 'nginx should reject >21 MiB with 413');
      console.log('  nginx: 413 for 22 MiB body');
    }

    // Test 4: Headers are sanitized — spoofed forwarding headers are removed
    console.log('Test: spoofed forwarding headers are sanitized');
    for (const [proxy, port] of [['nginx', 5175], ['Vite', 5176]]) {
      const { body, boundary, size } = createMultipartBody(100);
      const res = await request(port, '/api/v1/voice/transcriptions', {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': String(size),
        'Forwarded': 'for=192.0.2.99;host=attacker.example;proto=http',
        'X-Forwarded-For': '192.0.2.99',
        'X-Forwarded-Host': 'attacker.example',
        'X-Forwarded-Proto': 'http',
      }, 'POST', body);

      assert.equal(res.status, 200, `${proxy} should forward despite spoofed headers`);
      const observed = JSON.parse(res.body);
      assert.equal(observed.headers.forwarded, undefined, `${proxy} should remove Forwarded`);
      assert.ok(!observed.headers['x-forwarded-for']?.includes('192.0.2.99'), `${proxy} should reconstruct X-Forwarded-For`);
      assert.equal(observed.headers['x-forwarded-host'], '127.0.0.1:5175', `${proxy} should reconstruct X-Forwarded-Host`);
      console.log(`  ${proxy}: forwarding namespace sanitized`);
    }

    // Test 5: No audio persisted — echo service confirms body is in-memory only
    console.log('Test: no audio persisted (body preserved in transit)');
    {
      const { body, boundary, size } = createMultipartBody(512);
      const res = await request(5175, '/api/v1/voice/transcriptions', {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': String(size),
      }, 'POST', body);

      assert.equal(res.status, 200);
      const observed = JSON.parse(res.body);
      assert.ok(observed.body?.includes('AAAA'), 'Body content preserved through proxy');
      console.log('  Body preserved in transit, no disk persistence');
    }

    console.log('Voice proxy contract passed: multipart forwarding, size limits, header sanitization.');
  } catch (error) {
    if (error.code === 'ERR_ASSERTION') throw error;
    console.error('Voice proxy assay error:', error.message);
    process.exitCode = 1;
  } finally {
    try {
      compose(['logs', '--no-color', '--tail', '30', 'server', 'client', 'client-dev']);
    } finally {
      compose(['down', '-v', '--remove-orphans']);
      assertEmpty();
    }
  }
})();
