import { timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { AppError } from '../../shared/errors/AppError.js';
import { createTelegramBot } from './telegram.bot.js';

const sameSecret = (a, b) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

// Webhook para produção (o Telegram chama a API). Em desenvolvimento use o
// polling (TELEGRAM_POLLING=true), que não precisa de URL pública.
export function createTelegramModule({ config, telegram, contact, catalogs }) {
  const bot = createTelegramBot({ telegram, contact, catalogs });
  const router = Router();

  router.post('/webhook', (req, res, next) => {
    const secret = config.telegram.webhookSecret;
    const received = req.get('x-telegram-bot-api-secret-token') || '';
    if (!secret || !sameSecret(received, secret)) return next(AppError.unauthorized());
    res.sendStatus(200); // responde já; o Telegram não precisa esperar o bot
    bot.handleUpdate(req.body).catch((err) => console.error('Bot do Telegram:', err.message));
  });

  return { router, bot };
}
