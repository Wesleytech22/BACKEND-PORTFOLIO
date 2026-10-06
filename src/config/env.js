import path from 'node:path';

// Lê as variáveis de ambiente uma única vez; o resto da API recebe este
// objeto em vez de acessar process.env diretamente.
export function loadConfig(env = process.env) {
  return {
    port: Number(env.PORT) || 3333,
    corsOrigins: (env.CORS_ORIGIN || 'http://localhost:5173')
      .split(',')
      .map((origin) => origin.trim().replace(/\/+$/, '')) // "https://site.app/" vale como "https://site.app"
      .filter(Boolean),
    adminToken: env.ADMIN_TOKEN || '',
    dataDir: path.resolve(env.DATA_DIR || './data'),
    contactRateLimit: { max: 5, windowMs: 10 * 60 * 1000 },
    telegram: {
      botToken: env.TELEGRAM_BOT_TOKEN || '',
      chatId: env.TELEGRAM_CHAT_ID || '',
      polling: env.TELEGRAM_POLLING === 'true',
      webhookSecret: env.TELEGRAM_WEBHOOK_SECRET || '',
    },
  };
}
