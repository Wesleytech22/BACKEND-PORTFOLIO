import path from 'node:path';
import { Router } from 'express';
import { JsonRepository } from '../../shared/catalog/json.repository.js';
import { createRateLimit } from '../../middlewares/rateLimit.js';
import { createContactService } from './contact.service.js';

const handle = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// POST /api/contact é público (com limite por IP); a lista é só do admin.
export function createContactModule({ config, requireAdmin, telegram }) {
  const repository = new JsonRepository(path.join(config.dataDir, 'messages.json'));
  const service = createContactService({ repository, telegram });
  const limit = createRateLimit({ ...config.contactRateLimit, message: 'Muitas mensagens seguidas. Tente de novo em alguns minutos.' });

  const router = Router();
  router.post('/', limit, handle(async (req, res) => res.status(201).json(await service.submit(req.body))));
  router.get('/', requireAdmin, handle(async (req, res) => res.json({ items: await service.latest(100) })));

  return { router, service };
}
