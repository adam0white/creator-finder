import assert from 'node:assert/strict';
import { test, before } from 'node:test';
import { build } from 'esbuild';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const origin = 'https://creator-finder.adamwhite.work';
let worker;
const env = {
  ORIGIN: [origin, 'http://localhost:8787'],
  YOUTUBE_CLIENT_ID: 'test-client.apps.googleusercontent.com',
  YOUTUBE_CLIENT_SECRET: 'test-secret',
  PAGE_SIZE: 20,
  LIMIT: { limit: async () => ({ success: true }) },
};
const ctx = { waitUntil() {} };
const request = (path, options) => worker.fetch(new Request(origin + path, options), env, ctx);

before(async () => {
  const directory = await mkdtemp(join(tmpdir(), 'creator-finder-tests-'));
  const outfile = join(directory, 'worker.mjs');
  await build({
    entryPoints: ['src/index.tsx'], outfile, bundle: true, platform: 'node', format: 'esm',
    jsx: 'automatic', jsxImportSource: 'hono/jsx', tsconfigRaw: {},
    plugins: [{
      name: 'external-services',
      setup(build) {
        build.onResolve({ filter: /_worker\.js$/ }, args => ({ path: args.path, namespace: 'services' }));
        build.onLoad({ filter: /.*/, namespace: 'services' }, args => ({
          contents: `export default {fetch: async () => new Response('<html>Frontend</html>', {headers: {'Content-Security-Policy': "script-src 'self' 'nonce-test'"}})};`,
          loader: 'js',
        }));
      },
    }],
  });
  worker = (await import(pathToFileURL(outfile).href)).default;
});

test('security headers apply without replacing the frontend nonce policy', async () => {
  const response = await request('/');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.match(response.headers.get('content-security-policy'), /nonce-test/);
});

test('cross-origin form submissions cannot enqueue creators', async () => {
  const response = await request('/add', {
    method: 'POST', headers: {'Content-Type': 'text/plain', Origin: 'https://attacker.example'},
    body: JSON.stringify({handle: '@example'}),
  });
  assert.equal(response.status, 403);
});

test('authorization issues browser-bound state and uses the configured callback', async () => {
  const response = await request('/authorize');
  assert.equal(response.status, 302);
  const authorization = new URL(response.headers.get('location'));
  assert.equal(authorization.origin, 'https://accounts.google.com');
  assert.equal(authorization.searchParams.get('redirect_uri'), origin + '/callback');
  assert.equal(authorization.searchParams.get('client_id'), env.YOUTUBE_CLIENT_ID);
  assert.ok(authorization.searchParams.get('state')?.length >= 32);
  assert.match(response.headers.get('set-cookie'), /HttpOnly/);
  assert.match(response.headers.get('set-cookie'), /SameSite=Lax/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('a missing or mismatched OAuth state is rejected before token exchange', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('Token endpoint must not be contacted'); };
  try {
    for (const cookie of ['', 'oauth_state=expected']) {
      const response = await request('/callback?code=code&state=wrong', {headers: {cookie}});
      assert.equal(response.status, 400);
    }
  } finally { globalThis.fetch = originalFetch; }
});

test('valid state establishes a secure token cookie and clears the state', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), 'https://oauth2.googleapis.com/token');
    assert.equal(new URLSearchParams(options.body).get('redirect_uri'), origin + '/callback');
    return Response.json({access_token: 'test-access', expires_in: 3600});
  };
  try {
    const start = await request('/authorize');
    const state = new URL(start.headers.get('location')).searchParams.get('state');
    const response = await request(`/callback?code=code&state=${state}`, {headers: {cookie: `oauth_state=${state}`}});
    assert.equal(response.status, 200);
    assert.match(response.headers.get('set-cookie'), /access_token=test-access/);
    assert.match(response.headers.get('set-cookie'), /oauth_state=;.*Max-Age=0/);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  } finally { globalThis.fetch = originalFetch; }
});

test('denied OAuth consent is a handled error', async () => {
  const response = await request('/callback?error=access_denied&state=test', {headers: {cookie:'oauth_state=test'}});
  assert.equal(response.status, 400);
  assert.match(await response.text(), /denied|cancelled/i);
});

test('invalid pagination is rejected before querying D1', async () => {
  for (const page of ['NaN', '1.5', '0', '-1', 'Infinity']) {
    const response = await request('/search/example?page=' + page);
    assert.equal(response.status, 400);
  }
});

test('rate limiting uses the client IP and rejects exhausted requests', async () => {
  let key;
  const limitedEnv = {...env, LIMIT: {limit: async (options) => {key = options.key; return {success: false};}}};
  const response = await worker.fetch(new Request(origin + '/authorize', {headers: {'CF-Connecting-IP': '203.0.113.9'}}), limitedEnv, ctx);
  assert.equal(key, '203.0.113.9');
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('retry-after'), '60');
  assert.equal(response.headers.get('set-cookie'), null);
});

test('invalid YouTube sources are rejected before database or queue access', async () => {
  let databaseCalls = 0;
  let queueCalls = 0;
  const guardedEnv = {...env,
    DB: {prepare() {databaseCalls++; throw new Error('Must not access D1');}},
    LINK_QUEUE: {send() {queueCalls++; throw new Error('Must not enqueue');}},
  };
  for (const handle of [
    'https://youtube.com.evil.example/@example',
    'https://www.youtube.com.evil.example/@example',
    'https://youtube.com@evil.example/@example',
    'https://user:password@www.youtube.com/@example',
    'https://user@youtube.com/@example',
    'https://youtube.com:8443/@example',
    'http://youtube.com:8080/@example',
    'ftp://youtube.com/@example', 'javascript:alert(1)',
    '//youtube.com/@example', 'https://',
    'www.youtube.com.evil.example', 'youtube.com.evil.example',
  ]) {
    const response = await worker.fetch(new Request(origin + '/add', {
      method: 'POST', headers: {'Content-Type': 'application/json', Origin: origin},
      body: JSON.stringify({handle}),
    }), guardedEnv, ctx);
    assert.equal(response.status, 400, handle);
  }
  assert.equal(databaseCalls, 0);
  assert.equal(queueCalls, 0);
});

test('supported YouTube URLs and trimmed handles reach the expected database lookup', async () => {
  const cases = [
    ['https://youtube.com/@example', 'https://youtube.com/@example'],
    ['https://www.youtube.com/channel/UCexample', 'https://www.youtube.com/channel/UCexample'],
    ['http://youtube.com/@example', 'http://youtube.com/@example'],
    ['https://youtube.com:443/@example', 'https://youtube.com/@example'],
    ['  @example  ', 'https://www.youtube.com/@example'],
    ['  UCexample  ', 'https://www.youtube.com/channel/UCexample'],
  ];
  for (const [handle, expectedLink] of cases) {
    let lookedUp;
    let queueCalls = 0;
    const existingEnv = {...env,
      DB: {prepare(sql) {
        assert.match(sql, /SELECT id FROM links WHERE link = \?/);
        return {bind(link) {lookedUp = link; return {first: async () => 42};}};
      }},
      LINK_QUEUE: {send() {queueCalls++; throw new Error('Existing source must not enqueue');}},
    };
    const response = await worker.fetch(new Request(origin + '/add', {
      method: 'POST', headers: {'Content-Type': 'application/json', Origin: origin},
      body: JSON.stringify({handle}),
    }), existingEnv, ctx);
    assert.equal(response.status, 200, handle);
    assert.equal(lookedUp, expectedLink);
    assert.equal(queueCalls, 0);
  }
});
