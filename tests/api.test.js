import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../src/app.js';

const TOKEN = 'token-de-teste';
const OWNER = '1001';

// Telegram falso: guarda o que seria enviado, sem rede.
const sent = [];
const fakeTelegram = {
  hasToken: true,
  enabled: true,
  ownerChatId: OWNER,
  call: async () => [],
  send: async (chatId, text) => sent.push({ chatId: String(chatId), text }),
  notifyOwner: async (text) => sent.push({ chatId: OWNER, text }),
};

let app;
let server;
let baseUrl;
let dataDir;

before(async () => {
  dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'portfolio-api-'));
  const config = {
    port: 0,
    corsOrigins: [],
    adminToken: TOKEN,
    dataDir,
    contactRateLimit: { max: 4, windowMs: 60_000 },
    telegram: { webhookSecret: 'segredo-webhook' },
  };
  app = createApp(config, { telegram: fakeTelegram });
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  server.close();
  await fs.rm(dataDir, { recursive: true, force: true });
});

const request = (method, url, body, { token = TOKEN, headers = {} } = {}) =>
  fetch(`${baseUrl}${url}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }), ...headers },
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

test('traduções: ?lang devolve o idioma pedido e cai no português o que faltar', async () => {
  await request('POST', '/services', {
    title: 'Apps Android',
    description: 'Kotlin e Compose.',
    i18n: { en: { title: 'Android apps' }, zh: { title: '安卓应用', description: 'Kotlin 与 Compose。' } },
  });

  const en = (await (await request('GET', '/services/apps-android?lang=en')).json());
  assert.equal(en.title, 'Android apps');
  assert.equal(en.description, 'Kotlin e Compose.'); // sem tradução: mantém o português
  assert.equal(en.i18n, undefined);

  const zh = (await (await request('GET', '/services?lang=zh')).json()).items[0];
  assert.equal(zh.title, '安卓应用');

  const raw = await (await request('GET', '/services/apps-android')).json();
  assert.equal(raw.i18n.en.title, 'Android apps');

  assert.equal((await request('GET', '/services?lang=fr')).status, 400);
  const badLang = await request('POST', '/services', { title: 'X1', description: 'Y', i18n: { fr: { title: 'Z' } } });
  assert.equal(badLang.status, 400);
});

test('escrita sem token é recusada e leitura é pública', async () => {
  const res = await request('POST', '/services', { title: 'X', description: 'Y' }, { token: null });
  assert.equal(res.status, 401);
  assert.equal((await request('GET', '/services', undefined, { token: null })).status, 200);
});

test('validação devolve os erros por campo', async () => {
  const res = await request('POST', '/projects', { title: '', liveUrl: 'ftp://x', extra: 1 });
  assert.equal(res.status, 400);
  const { details } = await res.json();
  assert.ok(details.title && details.description && details.liveUrl && details.extra);
});

test('experiência exige empresa e período', async () => {
  const bad = await request('POST', '/experiences', { title: 'Analista' });
  assert.equal(bad.status, 400);
  const { details } = await bad.json();
  assert.ok(details.company && details.period);

  const ok = await request('POST', '/experiences', { title: 'Analista', company: 'Empresa', period: '2026 – atual' });
  assert.equal(ok.status, 201);
});

test('slug duplicado gera 409', async () => {
  await request('POST', '/services', { title: 'Consultoria', description: 'A' });
  const res = await request('POST', '/services', { title: 'Consultoria', description: 'B' });
  assert.equal(res.status, 409);
});

test('contato: chega no Telegram, robô é descartado e o limite por IP funciona', async () => {
  sent.length = 0;
  const contact = (body) => request('POST', '/contact', body, { token: null });

  const ok = await contact({ name: 'Ana <b>', email: 'ana@exemplo.com', message: 'Quero um app Android!', lang: 'en' });
  assert.equal(ok.status, 201);
  assert.deepEqual(await ok.json(), { received: true, telegram: true });
  assert.equal(sent.length, 1);
  assert.match(sent[0].text, /Ana &lt;b&gt;/); // HTML escapado
  assert.match(sent[0].text, /English/);

  const invalid = await contact({ name: 'Ana', email: 'nao-e-email', message: 'curta' });
  assert.equal(invalid.status, 400);
  const { details } = await invalid.json();
  assert.ok(details.email && details.message);

  const bot = await contact({ name: 'Bot', email: 'bot@spam.com', message: 'Compre agora mesmo!!', website: 'http://spam' });
  assert.equal(bot.status, 201);
  assert.equal(sent.length, 1); // robô não gera aviso

  const messages = await (await request('GET', '/contact')).json();
  assert.equal(messages.items.length, 1);
  assert.equal(messages.items[0].telegram, 'enviado');

  await contact({ name: 'Ana', email: 'ana@exemplo.com', message: 'Mais uma mensagem aqui.' });
  const limited = await contact({ name: 'Ana', email: 'ana@exemplo.com', message: 'Passou do limite agora.' });
  assert.equal(limited.status, 429);
});

test('contato com Telegram desligado: avisa a verdade e reenvia depois', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'portfolio-pending-'));
  const offline = { ...fakeTelegram, enabled: false };
  const config = { port: 0, corsOrigins: [], adminToken: TOKEN, dataDir: dir, contactRateLimit: { max: 10, windowMs: 60_000 }, telegram: {} };
  const localApp = createApp(config, { telegram: offline });
  const localServer = localApp.listen(0);
  await new Promise((resolve) => localServer.once('listening', resolve));
  try {
    const res = await fetch(`http://127.0.0.1:${localServer.address().port}/api/contact`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Bia', email: 'bia@exemplo.com', message: 'Mensagem com Telegram desligado.' }),
    });
    assert.deepEqual(await res.json(), { received: true, telegram: false });

    sent.length = 0;
    offline.enabled = true; // Telegram configurado depois
    assert.equal(await localApp.locals.contact.deliverPending(), 1);
    assert.match(sent[0].text, /Mensagem pendente/);
    assert.equal(await localApp.locals.contact.deliverPending(), 0); // não reenvia duas vezes
  } finally {
    localServer.close();
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('bot: responde ao dono com /resumo e recusa estranhos', async () => {
  sent.length = 0;
  const bot = app.locals.telegramBot;
  await bot.handleUpdate({ message: { chat: { id: OWNER }, text: '/resumo' } });
  assert.match(sent[0].text, /Resumo do portfólio/);
  assert.match(sent[0].text, /Mensagens: <b>2<\/b>/);

  await bot.handleUpdate({ message: { chat: { id: 999 }, text: '/mensagens' } });
  assert.equal(sent[1].chatId, '999');
  assert.match(sent[1].text, /privado/);
});

test('webhook do Telegram exige o segredo', async () => {
  const update = { message: { chat: { id: OWNER }, text: '/ajuda' } };
  assert.equal((await request('POST', '/telegram/webhook', update, { token: null })).status, 401);
  const ok = await request('POST', '/telegram/webhook', update, {
    token: null,
    headers: { 'x-telegram-bot-api-secret-token': 'segredo-webhook' },
  });
  assert.equal(ok.status, 200);
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
