// Portability proxy assay: nginx/Vite forwarding of the account import uploads (S-107, T-043).
// Uses a unique namespace and a fictitious body against the header-echo upstream; no application, no data.
// Pattern follows test-voice-proxies.mjs: unique project, label check, cleanup by labels only.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const project = process.env.STARTER_PORTABILITY_PROXY_PROJECT
  || `starter-portability-proxy-${Date.now()}-${process.pid}`;
const base = ['compose', '--env-file', 'scripts/fixtures/auth-test.env.example', '-p', project,
  '-f', 'docker-compose.yml', '-f', 'compose.auth-test.yml'];
const echoFile = ['-f', 'scripts/fixtures/compose.proxy-test.yml'];

const MIB = 1024 * 1024;
const ROUTES = ['/api/v1/portability/import-preview', '/api/v1/portability/imports'];
// Default ports are those of auth-test.env.example; override the pair when another stack already holds them.
const nginxPort = Number(process.env.STARTER_PORTABILITY_PROXY_PORT || 5175);
const vitePort = nginxPort + 1;
assert.ok(Number.isInteger(nginxPort) && nginxPort >= 1024 && nginxPort < 65535, 'Invalid proxy port');
const authority = `127.0.0.1:${nginxPort}`;
const PROXIES = [['nginx', nginxPort], ['Vite', vitePort]];

assert.match(project, /^starter-portability-proxy-\d+-\d+$/);

function assertEmpty() {
  for (const kind of ['container', 'network', 'volume']) {
    assert.equal(execFileSync('docker', [kind, 'ls', kind === 'container' ? '-aq' : '-q',
      '--filter', `label=com.docker.compose.project=${project}`], { encoding: 'utf8' }).trim(), '',
      'Portability proxy assay project must be empty');
  }
}
assertEmpty();
console.log(`Portability proxy assay project=${project}`);

function compose(args) {
  return execFileSync('docker', [...base, ...echoFile, '--profile', 'dev', ...args], {
    cwd: root, encoding: 'utf8', stdio: 'inherit',
    env: { ...process.env, APP_PUBLIC_URL: `http://${authority}`,
      CLIENT_PORT: String(nginxPort), CLIENT_DEV_PORT: String(vitePort) },
  });
}

function request(port, path, headers, body) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1', port, path, method: 'POST',
      headers: { Host: authority, ...headers },
      timeout: 80000,
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error('Proxy request timeout')));
    // A proxy may answer 413 and close while the body is still being written.
    req.on('error', (error) => (error.code === 'EPIPE' || error.code === 'ECONNRESET' ? undefined : reject(error)));
    req.end(body);
  });
}

// A multipart body with one fictitious `file` part of exactly fileBytes bytes.
function multipart(fileBytes) {
  const boundary = `----PortabilityBoundary${Date.now()}`;
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="devnotes.xlsx"\r\n`
      + 'Content-Type: application/octet-stream\r\n\r\n'),
    Buffer.alloc(fileBytes, 'A'),
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  return { body, headers: {
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    'Content-Length': String(body.length),
  } };
}

(async () => {
  try {
    compose(['up', '-d', '--build', '--wait', 'server', 'client', 'client-dev']);

    console.log('Test: a 10 MiB file reaches the upstream through nginx and Vite, with the session contract');
    for (const route of ROUTES) {
      for (const [proxy, port] of PROXIES) {
        const { body, headers } = multipart(10 * MIB);
        const res = await request(port, route, {
          ...headers,
          Cookie: 'XSRF-TOKEN=fictitious',
          'X-XSRF-TOKEN': 'fictitious',
          Forwarded: 'for=192.0.2.99;host=attacker.example;proto=http',
          'X-Forwarded-For': '192.0.2.99',
          'X-Forwarded-Host': 'attacker.example',
        }, body);

        assert.equal(res.status, 200, `${proxy} should forward a 10 MiB file to ${route}`);
        const observed = JSON.parse(res.body);
        assert.equal(observed.path, route);
        assert.equal(observed.method, 'POST');
        assert.equal(observed.body.length, body.length, `${proxy} should deliver the whole body`);
        assert.equal(observed.headers['content-type'], headers['Content-Type']);
        assert.equal(observed.headers.cookie, 'XSRF-TOKEN=fictitious');
        assert.equal(observed.headers['x-xsrf-token'], 'fictitious');
        assert.equal(observed.headers.forwarded, undefined, `${proxy} should remove Forwarded`);
        assert.ok(!observed.headers['x-forwarded-for']?.includes('192.0.2.99'),
          `${proxy} should reconstruct X-Forwarded-For`);
        assert.equal(observed.headers['x-forwarded-host'], authority,
          `${proxy} should reconstruct X-Forwarded-Host`);
        console.log(`  ${proxy} ${route}: ${(body.length / MIB).toFixed(2)} MiB forwarded`);
      }
    }

    console.log('Test: nginx rejects a file of 11 MiB or more on the import routes');
    for (const route of ROUTES) {
      for (const size of [11 * MIB, 12 * MIB]) {
        const { body, headers } = multipart(size);
        const res = await request(nginxPort, route, headers, body);
        assert.equal(res.status, 413, `nginx should reject ${size} bytes on ${route}`);
      }
      console.log(`  nginx ${route}: 413 at 11 MiB and 12 MiB`);
    }

    console.log('Test: the larger limit is exact; neighbour routes keep the generic 1 MB limit in nginx');
    for (const route of ['/api/v1/portability/export', '/api/v1/portability/imports/extra',
      '/api/v1/portability/import-preview/']) {
      const { body, headers } = multipart(2 * MIB);
      const res = await request(nginxPort, route, headers, body);
      assert.equal(res.status, 413, `nginx should keep the default body limit on ${route}`);
    }
    {
      const { body, headers } = multipart(512 * 1024);
      const res = await request(nginxPort, '/api/v1/portability/imports?ownerId=fictitious', headers, body);
      assert.equal(res.status, 200, 'nginx should match the exact location with a query string');
      assert.equal(JSON.parse(res.body).path, '/api/v1/portability/imports?ownerId=fictitious');
    }
    console.log('  nginx: neighbours limited to 1 MB; query string preserved');

    console.log('Portability proxy contract passed: 10 MiB forwarding, nginx size limit, exact routes, headers.');
  } catch (error) {
    if (error.code === 'ERR_ASSERTION') throw error;
    console.error('Portability proxy assay error:', error.message);
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
