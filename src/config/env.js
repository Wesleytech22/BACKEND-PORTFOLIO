import path from 'node:path';

// Lê as variáveis de ambiente uma única vez; o resto da API recebe este
// objeto em vez de acessar process.env diretamente.
export function loadConfig(env = process.env) {
  return {
    port: Number(env.PORT) || 3333,
    corsOrigins: (env.CORS_ORIGIN || 'http://localhost:5173')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    adminToken: env.ADMIN_TOKEN || '',
    dataDir: path.resolve(env.DATA_DIR || './data'),
  };
}
