import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../src/app.js';

const TOKEN = 'token-de-teste';
let server;
let baseUrl;
let dataDir;

before(async () => {
  dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'portfolio-api-'));
  const app = createApp({ port: 0, corsOrigins: [], adminToken: TOKEN, dataDir });
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  server.close();
  await fs.rm(dataDir, { recursive: true, force: true });
});

const request = (method, url, body, token = TOKEN) =>
  fetch(`${baseUrl}${url}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  });

test('health responde ok', async () => {
  const res = await request('GET', '/health');
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ok' });
});

test('ciclo completo de um projeto: cria, lê, edita e remove', async () => {
  const created = await request('POST', '/projects', {
    title: 'Automação de Testes',
    description: 'Suite Cypress.',
    tags: [' Cypress ', ''],
  });
  assert.equal(created.status, 201);
  const project = await created.json();
  assert.equal(project.slug, 'automacao-de-testes');
  assert.deepEqual(project.tags, ['Cypress']);
  assert.equal(project.featured, false);

  const list = await (await request('GET', '/projects')).json();
  assert.equal(list.items.length, 1);

  const patched = await request('PATCH', '/projects/automacao-de-testes', { featured: true });
  assert.equal((await patched.json()).featured, true);

  const featured = await (await request('GET', '/projects?featured=true')).json();
  assert.equal(featured.items.length, 1);

  assert.equal((await request('DELETE', '/projects/automacao-de-testes')).status, 204);
  assert.equal((await request('GET', '/projects/automacao-de-testes')).status, 404);
});

test('escrita sem token é recusada e leitura é pública', async () => {
  const res = await request('POST', '/services', { title: 'X', description: 'Y' }, null);
  assert.equal(res.status, 401);
  assert.equal((await request('GET', '/services', undefined, null)).status, 200);
});

test('validação devolve os erros por campo', async () => {
  const res = await request('POST', '/projects', { title: '', liveUrl: 'ftp://x', extra: 1 });
  assert.equal(res.status, 400);
  const { details } = await res.json();
  assert.ok(details.title && details.description && details.liveUrl && details.extra);
});

test('slug duplicado gera 409', async () => {
  await request('POST', '/services', { title: 'Consultoria', description: 'A' });
  const res = await request('POST', '/services', { title: 'Consultoria', description: 'B' });
  assert.equal(res.status, 409);
});

test('JSON malformado e rota inexistente têm erro padronizado', async () => {
  const bad = await fetch(`${baseUrl}/projects`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${TOKEN}` },
    body: '{',
  });
  assert.equal(bad.status, 400);
  assert.equal((await request('GET', '/nao-existe')).status, 404);
});
