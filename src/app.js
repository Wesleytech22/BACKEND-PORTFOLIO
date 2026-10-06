import express from 'express';
import cors from 'cors';
import { createRequireAdmin } from './middlewares/requireAdmin.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';
import { createTelegramClient } from './integrations/telegram.js';
import { createProjectsModule } from './modules/projects/projects.module.js';
import { createServicesModule } from './modules/services/services.module.js';
import { createExperiencesModule } from './modules/experiences/experiences.module.js';
import { createContactModule } from './modules/contact/contact.module.js';
import { createTelegramModule } from './modules/telegram/telegram.module.js';

// Monta o app sem abrir porta, para os testes usarem a mesma instância.
// Os testes podem injetar um cliente do Telegram falso em overrides.
export function createApp(config, overrides = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // IP real atrás do proxy (Render, Railway) para o limite do contato
  app.use(cors({ origin: config.corsOrigins }));
  app.use(express.json({ limit: '100kb' }));

  const telegram = overrides.telegram || createTelegramClient(config.telegram);
  const deps = { config, requireAdmin: createRequireAdmin(config.adminToken), telegram };

  const projects = createProjectsModule(deps);
  const services = createServicesModule(deps);
  const experiences = createExperiencesModule(deps);
  const contact = createContactModule(deps);
  const telegramModule = createTelegramModule({
    ...deps,
    contact: contact.service,
    catalogs: [
      { label: 'Projetos', service: projects.service },
      { label: 'Serviços', service: services.service },
      { label: 'Experiências', service: experiences.service },
    ],
  });

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/projects', projects.router);
  app.use('/api/services', services.router);
  app.use('/api/experiences', experiences.router);
  app.use('/api/contact', contact.router);
  app.use('/api/telegram', telegramModule.router);
  // Nova coleção? Crie src/modules/<nome>/ (schema + module) e registre aqui.

  app.use(notFound);
  app.use(errorHandler);

  app.locals.telegramBot = telegramModule.bot;
  app.locals.contact = contact.service;
  return app;
}
