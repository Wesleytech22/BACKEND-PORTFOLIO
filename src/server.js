import { loadConfig } from './config/env.js';
import { createApp } from './app.js';

const config = loadConfig();
const app = createApp(config);

app.listen(config.port, () => {
  console.log(`API do portfólio em http://localhost:${config.port}/api`);
  if (!config.adminToken) console.log('ADMIN_TOKEN não definido: a API está somente leitura.');

  const { botToken, chatId, polling } = config.telegram;
  if (!botToken) {
    console.log('Telegram desligado: defina TELEGRAM_BOT_TOKEN para receber as mensagens do contato.');
  } else if (polling) {
    app.locals.telegramBot.startPolling();
    console.log(chatId ? 'Bot do Telegram ouvindo (polling).' : 'Bot do Telegram ouvindo: mande /start para ele e descubra seu chat_id.');
  }
  if (!chatId) {
    console.log('TELEGRAM_CHAT_ID vazio: as mensagens do contato ficam salvas e serão enviadas quando ele for configurado.');
  }

  // Mensagens que chegaram com o Telegram desligado ou fora do ar.
  app.locals.contact
    .deliverPending()
    .then((count) => count && console.log(`${count} mensagem(ns) pendente(s) enviada(s) ao Telegram.`))
    .catch((err) => console.error('Falha ao reenviar pendentes:', err.message));
});
