import { loadConfig } from './config/env.js';
import { createApp } from './app.js';

const config = loadConfig();
const app = createApp(config);

app.listen(config.port, () => {
  console.log(`API do portfólio em http://localhost:${config.port}/api`);
  if (!config.adminToken) console.log('ADMIN_TOKEN não definido: a API está somente leitura.');
});
