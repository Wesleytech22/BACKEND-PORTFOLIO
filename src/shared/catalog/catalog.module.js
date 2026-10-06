import path from 'node:path';
import { Router } from 'express';
import { JsonRepository } from './json.repository.js';
import { CatalogService } from './catalog.service.js';
import { createCatalogController } from './catalog.controller.js';

// Express 4 não repassa erros de handlers async; isto encaminha ao errorHandler.
const handle = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Monta uma coleção completa (repositório → serviço → controller → rotas).
// Leitura é pública; escrita exige o middleware de autenticação.
export function createCatalogModule({ config, requireAdmin, file, schema, label }) {
  const repository = new JsonRepository(path.join(config.dataDir, file));
  const service = new CatalogService({ repository, schema, label });
  const controller = createCatalogController(service);

  const router = Router();
  router.get('/', handle(controller.list));
  router.get('/:slug', handle(controller.get));
  router.post('/', requireAdmin, handle(controller.create));
  router.patch('/:slug', requireAdmin, handle(controller.update));
  router.delete('/:slug', requireAdmin, handle(controller.remove));

  return { router, service };
}
