import express from 'express';
import cors from 'cors';
import { createRequireAdmin } from './middlewares/requireAdmin.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';
import { createProjectsModule } from './modules/projects/projects.module.js';
import { createServicesModule } from './modules/services/services.module.js';

// Monta o app sem abrir porta, para os testes usarem a mesma instância.
export function createApp(config) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: config.corsOrigins }));
  app.use(express.json({ limit: '100kb' }));

  const deps = { config, requireAdmin: createRequireAdmin(config.adminToken) };

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/projects', createProjectsModule(deps).router);
  app.use('/api/services', createServicesModule(deps).router);
  // Nova coleção? Crie src/modules/<nome>/ (schema + module) e registre aqui.

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
