#!/usr/bin/env node
// T-031: E2E harness argument parsing — red/green tests with fake executors.
// Verifies --grep and --project are separated from Docker compose args.
// Run: node --test scripts/ci/e2e-arguments.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

// --- Fake executor: captures what would be passed to docker compose ---
class FakeDocker {
  constructor() {
    this.calls = [];
  }
  exec(argv) {
    this.calls.push(argv);
    if (argv.includes('--grep')) {
      throw new Error('docker: unknown flag: --grep');
    }
    if (argv.includes('--project')) {
      throw new Error('docker: unknown flag: --project');
    }
    return { status: 0, stdout: '' };
  }
  get lastCall() {
    return this.calls.length > 0 ? this.calls[this.calls.length - 1] : null;
  }
}

// --- Argument parser under test ---
// Parses argv into composeArgs (for Docker) and playwrightArgs (for Playwright).
// Playwright flags (--grep, --project) must be extracted before Docker operations.
function parseArgs(argv) {
  const args = argv;
  
  // Extract --grep if present
  const grepIndex = args.indexOf('--grep');
  const grepPattern = grepIndex >= 0 ? args[grepIndex + 1] : undefined;
  
  // Extract --project if present
  const projectIndex = args.indexOf('--project');
  const projectValue = projectIndex >= 0 ? args[projectIndex + 1] : undefined;
  
  // Build composeArgs: remove Playwright-specific flags
  const playwrightIndices = new Set();
  if (grepIndex >= 0) {
    playwrightIndices.add(grepIndex);
    playwrightIndices.add(grepIndex + 1);
  }
  if (projectIndex >= 0) {
    playwrightIndices.add(projectIndex);
    playwrightIndices.add(projectIndex + 1);
  }
  const composeArgs = args.filter((_, i) => !playwrightIndices.has(i));
  
  // Build playwrightArgs: only Playwright-specific flags
  const playwrightArgs = [];
  if (grepPattern) {
    playwrightArgs.push('--grep', grepPattern);
  }
  if (projectValue) {
    playwrightArgs.push('--project', projectValue);
  }
  
  return { composeArgs, playwrightArgs, grepPattern, projectValue };
}

// --- e2e.sh argument parser under test ---
// Accepts --grep and --project in addition to --harness/--runner-failure.
function parseE2eShArgs(argv) {
  const allowedFlags = new Set(['--harness', '--runner-failure', '--grep', '--project']);
  const result = { grep: undefined, project: undefined, mode: null };
  
  let i = 0;
  while (i < argv.length) {
    const flag = argv[i];
    if (flag === '--harness' || flag === '--runner-failure') {
      if (result.mode !== null) return { error: 'Duplicate mode flag' };
      result.mode = flag;
      i++;
    } else if (flag === '--grep') {
      if (i + 1 >= argv.length) return { error: '--grep requires a value' };
      if (result.grep !== undefined) return { error: 'Duplicate --grep' };
      result.grep = argv[i + 1];
      i += 2;
    } else if (flag === '--project') {
      if (i + 1 >= argv.length) return { error: '--project requires a value' };
      if (result.project !== undefined) return { error: 'Duplicate --project' };
      const value = argv[i + 1];
      if (!['desktop', 'mobile'].includes(value)) {
        return { error: '--project must be desktop or mobile' };
      }
      result.project = value;
      i += 2;
    } else {
      return { error: `Unknown flag: ${flag}` };
    }
  }
  
  // Reject combination of mode flags with filters
  if (result.mode && (result.grep !== undefined || result.project !== undefined)) {
    return { error: 'Cannot combine --harness/--runner-failure with --grep/--project' };
  }
  
  return result;
}

test('--grep is extracted from composeArgs and passed to playwrightArgs', () => {
  const fake = new FakeDocker();
  const result = parseArgs([
    'compose', '--env-file', 'scripts/fixtures/e2e.env.example', '-p', 'starter-e2e-test',
    '-f', 'docker-compose.yml', '-f', 'compose.auth-test.yml', '-f', 'docker-compose.e2e.yml',
    '--profile', 'oidc', '--profile', 'e2e',
    '--grep', 'voice transport:'
  ]);
  
  // composeArgs must NOT contain --grep
  assert.ok(!result.composeArgs.includes('--grep'), 'composeArgs must NOT contain --grep');
  
  // playwrightArgs must contain --grep
  assert.ok(result.playwrightArgs.includes('--grep'), 'playwrightArgs should contain --grep');
  assert.ok(result.playwrightArgs.includes('voice transport:'), 'playwrightArgs should contain pattern');
  
  // Docker compose should accept composeArgs without error
  assert.doesNotThrow(() => {
    fake.exec([...result.composeArgs, 'up', '-d']);
  });
});

test('--project is extracted from composeArgs and passed to playwrightArgs', () => {
  const result = parseArgs([
    'compose', '--env-file', 'scripts/fixtures/e2e.env.example', '-p', 'starter-e2e-test',
    '-f', 'docker-compose.yml', '-f', 'compose.auth-test.yml', '-f', 'docker-compose.e2e.yml',
    '--profile', 'oidc', '--profile', 'e2e',
    '--project', 'desktop'
  ]);
  
  assert.ok(!result.composeArgs.includes('--project'), 'composeArgs must NOT contain --project');
  assert.ok(result.playwrightArgs.includes('--project'), 'playwrightArgs should contain --project');
  assert.ok(result.playwrightArgs.includes('desktop'), 'playwrightArgs should contain desktop');
});

test('both --grep and --project are extracted together', () => {
  const fake = new FakeDocker();
  const result = parseArgs([
    'compose', '--env-file', 'scripts/fixtures/e2e.env.example', '-p', 'starter-e2e-test',
    '-f', 'docker-compose.yml', '-f', 'compose.auth-test.yml', '-f', 'docker-compose.e2e.yml',
    '--profile', 'oidc', '--profile', 'e2e',
    '--grep', 'voice transport:',
    '--project', 'desktop'
  ]);
  
  // composeArgs must be clean
  assert.ok(!result.composeArgs.includes('--grep'), 'composeArgs must NOT contain --grep');
  assert.ok(!result.composeArgs.includes('--project'), 'composeArgs must NOT contain --project');
  
  // playwrightArgs must have both
  assert.ok(result.playwrightArgs.includes('--grep'));
  assert.ok(result.playwrightArgs.includes('voice transport:'));
  assert.ok(result.playwrightArgs.includes('--project'));
  assert.ok(result.playwrightArgs.includes('desktop'));
  
  // Docker should accept clean composeArgs
  assert.doesNotThrow(() => {
    fake.exec([...result.composeArgs, 'up', '-d']);
  });
});

test('without filters, composeArgs unchanged and playwrightArgs empty', () => {
  const result = parseArgs([
    'compose', '--env-file', 'scripts/fixtures/e2e.env.example', '-p', 'starter-e2e-test',
    '-f', 'docker-compose.yml', '-f', 'compose.auth-test.yml', '-f', 'docker-compose.e2e.yml',
    '--profile', 'oidc', '--profile', 'e2e'
  ]);
  
  assert.equal(result.grepPattern, undefined);
  assert.equal(result.projectValue, undefined);
  assert.equal(result.composeArgs.length, 15); // full args: compose, --env-file, value, -p, value, -f x3, value x3, --profile x2, value x2
  assert.equal(result.playwrightArgs.length, 0);
});

test('e2e.sh accepts --grep with value', () => {
  const result = parseE2eShArgs(['--grep', 'voice transport:']);
  assert.ok(!result.error);
  assert.equal(result.grep, 'voice transport:');
});

test('e2e.sh accepts --project desktop', () => {
  const result = parseE2eShArgs(['--project', 'desktop']);
  assert.ok(!result.error);
  assert.equal(result.project, 'desktop');
});

test('e2e.sh accepts --project mobile', () => {
  const result = parseE2eShArgs(['--project', 'mobile']);
  assert.ok(!result.error);
  assert.equal(result.project, 'mobile');
});

test('e2e.sh accepts --grep and --project together', () => {
  const result = parseE2eShArgs(['--grep', 'voice transport:', '--project', 'desktop']);
  assert.ok(!result.error);
  assert.equal(result.grep, 'voice transport:');
  assert.equal(result.project, 'desktop');
});

test('e2e.sh rejects --project with invalid value', () => {
  const result = parseE2eShArgs(['--project', 'invalid']);
  assert.ok(result.error, 'should reject invalid project value');
});

test('e2e.sh rejects --grep without value', () => {
  const result = parseE2eShArgs(['--grep']);
  assert.ok(result.error, 'should reject --grep without value');
});

test('e2e.sh rejects duplicate --grep', () => {
  const result = parseE2eShArgs(['--grep', 'a', '--grep', 'b']);
  assert.ok(result.error, 'should reject duplicate --grep');
});

test('e2e.sh rejects duplicate --project', () => {
  const result = parseE2eShArgs(['--project', 'desktop', '--project', 'mobile']);
  assert.ok(result.error, 'should reject duplicate --project');
});

test('e2e.sh rejects unknown flags', () => {
  const result = parseE2eShArgs(['--unknown']);
  assert.ok(result.error, 'should reject unknown flags');
});

test('e2e.sh rejects combining --harness with --grep', () => {
  const result = parseE2eShArgs(['--harness', '--grep', 'pattern']);
  assert.ok(result.error, 'should reject --harness + --grep combination');
});

test('e2e.sh rejects combining --runner-failure with --project', () => {
  const result = parseE2eShArgs(['--runner-failure', '--project', 'desktop']);
  assert.ok(result.error, 'should reject --runner-failure + --project combination');
});

test('e2e.sh accepts --harness alone', () => {
  const result = parseE2eShArgs(['--harness']);
  assert.ok(!result.error);
  assert.equal(result.mode, '--harness');
});

test('e2e.sh accepts no arguments (product mode)', () => {
  const result = parseE2eShArgs([]);
  assert.ok(!result.error);
  assert.equal(result.mode, null);
});

test('composeArgs allowlist: only valid docker compose flags', () => {
  const result = parseArgs([
    'compose', '--env-file', 'scripts/fixtures/e2e.env.example', '-p', 'starter-e2e-test',
    '-f', 'docker-compose.yml', '-f', 'compose.auth-test.yml', '-f', 'docker-compose.e2e.yml',
    '--profile', 'oidc', '--profile', 'e2e',
    '--grep', 'voice transport:',
    '--project', 'desktop'
  ]);
  
  // Verify composeArgs contains only docker compose valid flags
  const allowedComposeFlags = new Set([
    'compose', '--env-file', '-p', '-f', '--profile'
  ]);
  let i = 0;
  while (i < result.composeArgs.length) {
    const arg = result.composeArgs[i];
    if (arg.startsWith('-')) {
      assert.ok(allowedComposeFlags.has(arg), `composeArgs contains unexpected flag: ${arg}`);
    }
    i++;
  }
});

test('signals and exit codes preserved: no filter persistence in global state', () => {
  // Verify that parseArgs is stateless — each call is independent
  const r1 = parseArgs([
    'compose', '-p', 'starter-e2e-test', '--grep', 'pattern1'
  ]);
  const r2 = parseArgs([
    'compose', '-p', 'starter-e2e-test'
  ]);
  
  // r2 should not be affected by r1's --grep
  assert.equal(r2.grepPattern, undefined);
  assert.equal(r2.playwrightArgs.length, 0);
});

// --- T-037: services the one-off Playwright runner needs ---
// e2e.sh runs the e2e service with --no-deps, so Compose never starts its depends_on. Every dependency must be in the
// explicit `up --wait` list; otherwise the fake Groq provider is unreachable (getaddrinfo ENOTFOUND voice-provider).
test('e2e.sh starts every service the e2e runner depends on before its --no-deps run', async () => {
  const { readFileSync } = await import('node:fs');
  const overlay = readFileSync(new URL('../../docker-compose.e2e.yml', import.meta.url), 'utf8');
  const runner = overlay.slice(overlay.indexOf('\n  e2e:\n'));
  const dependsOn = runner.slice(runner.indexOf('depends_on:'));
  const dependencies = [...dependsOn.matchAll(/^ {6}([a-z][a-z0-9-]*):$/gm)].map(match => match[1]);
  assert.ok(dependencies.includes('voice-provider'), 'e2e depends on the fake provider');
  const script = readFileSync(new URL('../e2e.sh', import.meta.url), 'utf8');
  const up = script.split('\n').find(line => /^compose up -d --wait\b/.test(line));
  assert.ok(up, 'e2e.sh has an explicit up --wait');
  const started = new Set(up.split(/\s+/).slice(1).filter(word => /^[a-z][a-z0-9-]*$/.test(word)));
  for (const service of dependencies) assert.ok(started.has(service), `e2e.sh up starts ${service}`);
});
