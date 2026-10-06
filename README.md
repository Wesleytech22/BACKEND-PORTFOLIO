# Portfólio — Backend

API que guarda e entrega os **projetos** e **serviços** exibidos no portfólio 3D.
Node.js 22.9+ e Express.

```bash
npm install
cp .env.example .env   # defina ADMIN_TOKEN para liberar a escrita
npm run dev            # http://localhost:3333/api
npm test
```

## Arquitetura

```
src/
  server.js               abre a porta
  app.js                  middlewares e registro das coleções
  config/env.js           variáveis de ambiente
  middlewares/            autenticação de escrita e tratamento de erros
  modules/<coleção>/      schema (campos) + module de cada coleção
  shared/catalog/         rotas → controller → service → repositório, reaproveitados por toda coleção
  shared/validation/      validador declarativo dos schemas
data/*.json               os dados (um arquivo por coleção)
```

**Rotas** (URL e autenticação) → **controller** (HTTP) → **service** (validação, slug, ordem, datas) →
**repositório** (armazenamento). Só o repositório conhece o JSON; para usar um banco de dados, troque essa classe.

## API

Leitura é pública. Escrita exige `Authorization: Bearer <ADMIN_TOKEN>`.

| Método | Rota | O que faz |
|---|---|---|
| GET | `/api/health` | Verifica se a API está no ar |
| GET | `/api/projects` | Lista os projetos (`?featured=true` filtra destaques) |
| GET | `/api/projects/:slug` | Um projeto |
| POST | `/api/projects` | Cria um projeto |
| PATCH | `/api/projects/:slug` | Edita só os campos enviados |
| DELETE | `/api/projects/:slug` | Remove |

As mesmas rotas existem em `/api/services`. O `slug` vem do título e não muda depois de criado.

- **Projeto:** `title`*, `description`*, `subtitle`, `highlights` (lista), `tags` (lista), `image`, `repoUrl`, `liveUrl`, `featured`, `order`
- **Serviço:** `title`*, `description`*, `tags` (lista), `order` — (*obrigatório)

```bash
curl -X POST http://localhost:3333/api/services \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{"title":"Consultoria em QA","description":"Estratégia de testes.","tags":["QA"]}'
```

## Nova coleção (ex.: certificados)

Crie `src/modules/certificates/` com `certificates.schema.js` e `certificates.module.js` (copie o de `services`
trocando arquivo, schema e rótulo) e registre em `src/app.js`:
`app.use('/api/certificates', createCertificatesModule(deps).router);`

## Publicação

Qualquer serviço Node (Render, Railway): comando `npm start`, variáveis `PORT`, `CORS_ORIGIN`
(URL do frontend) e `ADMIN_TOKEN`. Os dados ficam em arquivo, então use disco persistente ou troque o repositório por um banco.
