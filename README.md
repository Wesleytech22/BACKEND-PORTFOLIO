# Portfólio — Backend

API do portfólio 3D: entrega **projetos**, **serviços** e **experiências** (em português, inglês e chinês),
recebe o **formulário de contato** e avisa no **Telegram**. Node.js 22.9+ e Express.

```bash
npm install
cp .env.example .env   # preencha ADMIN_TOKEN e o Telegram (ver abaixo)
npm run dev            # http://localhost:3333/api
npm test
```

## Arquitetura

```
src/
  server.js                abre a porta e liga o bot do Telegram (polling)
  app.js                   middlewares e registro dos módulos
  config/env.js            variáveis de ambiente
  integrations/telegram.js cliente da Bot API do Telegram
  middlewares/             autenticação de escrita, limite por IP e tratamento de erros
  modules/
    projects/ services/ experiences/   coleções: schema (campos) + module
    contact/               formulário de contato → Telegram + cópia em data/messages.json
    telegram/              bot privado (/mensagens, /resumo) e webhook
  shared/catalog/          rotas → controller → service → repositório, reaproveitados por toda coleção
  shared/validation/       validador declarativo dos schemas
  shared/i18n.js           idiomas suportados e tradução dos itens
data/*.json                os dados (um arquivo por coleção)
```

**Rotas** (URL e autenticação) → **controller** (HTTP) → **service** (validação, slug, ordem, idioma) →
**repositório** (armazenamento). Só o repositório conhece o JSON; para usar um banco de dados, troque essa classe.

## API

Leitura é pública. Escrita exige `Authorization: Bearer <ADMIN_TOKEN>`.

| Método | Rota | O que faz |
|---|---|---|
| GET | `/api/health` | Verifica se a API está no ar |
| GET | `/api/projects?lang=pt\|en\|zh` | Lista os projetos no idioma pedido (`&featured=true` filtra destaques) |
| GET | `/api/projects/:slug` | Um projeto (sem `lang`, vem completo, com as traduções) |
| POST | `/api/projects` | Cria um projeto |
| PATCH | `/api/projects/:slug` | Edita só os campos enviados |
| DELETE | `/api/projects/:slug` | Remove |
| POST | `/api/contact` | Formulário de contato (público, até 5 mensagens a cada 10 min por IP) |
| GET | `/api/contact` | Mensagens recebidas (admin) |
| POST | `/api/telegram/webhook` | Entrada do bot em produção (exige `TELEGRAM_WEBHOOK_SECRET`) |

As rotas de `/api/projects` também existem em `/api/services` e `/api/experiences`. O `slug` vem do título e não muda.

- **Projeto:** `title`*, `description`*, `subtitle`, `highlights` (lista), `tags` (lista), `image`, `repoUrl`, `liveUrl`, `featured`, `order`, `i18n`
- **Serviço:** `title`*, `description`*, `tags` (lista), `order`, `i18n`
- **Experiência:** `title`* (cargo), `company`*, `period`*, `highlights` (lista), `tags` (lista), `order`, `i18n` — (*obrigatório)

### Traduções

O conteúdo base é em português. Em `i18n`, cada idioma traz só os campos traduzidos; o que faltar
continua em português:

```json
"i18n": {
  "en": { "title": "Native Android apps", "description": "Kotlin apps built with Jetpack Compose." },
  "zh": { "title": "原生 Android 应用", "description": "使用 Kotlin 和 Jetpack Compose 开发应用。" }
}
```

```bash
curl -X POST http://localhost:3333/api/services \
  -H "Content-Type: application/json" -H "Authorization: Bearer SEU_TOKEN" \
  -d '{"title":"Apps Wear OS","description":"Apps para relógios.","i18n":{"en":{"title":"Wear OS apps"}}}'
```

## Telegram

Cada mensagem do formulário de contato chega no seu Telegram na hora, com nome, e-mail, idioma do
visitante e o texto. Se o Telegram estiver fora, a mensagem não se perde: fica em `data/messages.json`
(fora do git, porque são dados pessoais).

1. No Telegram, fale com o **@BotFather**, use `/newbot` e copie o token para `TELEGRAM_BOT_TOKEN`.
2. Com `TELEGRAM_POLLING=true`, rode `npm run dev` e mande `/start` para o seu bot.
   Ele responde com o seu **chat_id**: copie para `TELEGRAM_CHAT_ID` e reinicie a API.
3. Pronto. No bot, só você tem acesso aos comandos:
   - `/mensagens` — últimas mensagens recebidas pelo site
   - `/resumo` — quantos projetos, serviços e experiências estão no ar e quantas mensagens chegaram hoje

**Em produção**, use webhook no lugar do polling: defina `TELEGRAM_POLLING=false`, um
`TELEGRAM_WEBHOOK_SECRET` aleatório e registre a URL uma vez:

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://SUA-API/api/telegram/webhook&secret_token=<SEGREDO>"
```

## Nova coleção (ex.: certificados)

Crie `src/modules/certificates/` com `certificates.schema.js` e `certificates.module.js` (copie o de `services`
trocando arquivo, schema e rótulo) e registre em `src/app.js`:
`app.use('/api/certificates', createCertificatesModule(deps).router);`

## Publicação (Render)

O `render.yaml` descreve o serviço: no Render, **New → Blueprint**, escolha este repositório e preencha
`TELEGRAM_BOT_TOKEN` e `TELEGRAM_WEBHOOK_SECRET` (os outros valores já vêm do arquivo). Cada push na `master`
publica de novo.

Depois do primeiro deploy, registre o webhook do bot uma vez (ver seção Telegram). No plano Free o serviço
dorme sem acesso e o disco é apagado a cada deploy: projetos, serviços e experiências vêm do repositório;
mensagens do contato chegam no Telegram, mas a cópia em `data/messages.json` não persiste.
