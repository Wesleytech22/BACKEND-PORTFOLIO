import { escapeHtml } from '../../integrations/telegram.js';

const HELP = [
  '🤖 <b>Bot do portfólio</b>',
  '',
  '/mensagens — últimas mensagens recebidas pelo site',
  '/resumo — números do portfólio',
  '/ajuda — esta lista',
  '',
  'Cada nova mensagem do formulário de contato chega aqui na hora.',
].join('\n');

// Bot privado: só o dono (TELEGRAM_CHAT_ID) recebe dados. Para qualquer
// outra pessoa — inclusive o dono antes de configurar — ele informa o
// chat_id, que é o valor a colocar no .env.
export function createTelegramBot({ telegram, contact, catalogs }) {
  async function summary() {
    const [stats, ...counts] = await Promise.all([
      contact.stats(),
      ...catalogs.map(async ({ label, service }) => `${label}: <b>${(await service.list()).length}</b>`),
    ]);
    return ['📊 <b>Resumo do portfólio</b>', '', ...counts, `Mensagens: <b>${stats.total}</b> (hoje: ${stats.today})`].join('\n');
  }

  async function latestMessages() {
    const items = await contact.latest(5);
    if (!items.length) return 'Nenhuma mensagem recebida ainda.';
    return [
      '📬 <b>Últimas mensagens</b>',
      ...items.map((m) => {
        const preview = m.message.length > 140 ? `${m.message.slice(0, 140)}…` : m.message;
        return `\n<b>${escapeHtml(m.name)}</b> · ${escapeHtml(m.email)}\n${escapeHtml(preview)}`;
      }),
    ].join('\n');
  }

  async function handleUpdate(update) {
    const msg = update.message;
    if (!msg?.text) return;
    const chatId = String(msg.chat.id);
    const command = msg.text.trim().split(/\s+/)[0].split('@')[0].toLowerCase();

    if (chatId !== telegram.ownerChatId) {
      const text = telegram.ownerChatId
        ? 'Este bot é privado do portfólio de Wesley Rodrigues Dias. 🙂'
        : `Seu chat_id é <code>${chatId}</code>.\nColoque em TELEGRAM_CHAT_ID no .env do backend e reinicie a API.`;
      await telegram.send(chatId, text);
      return;
    }

    const replies = { '/mensagens': latestMessages, '/resumo': summary };
    await telegram.send(chatId, replies[command] ? await replies[command]() : HELP);
  }

  // Long polling: o bot funciona até em localhost, sem URL pública.
  function startPolling() {
    let offset = 0;
    let stopped = false;
    (async () => {
      while (!stopped) {
        try {
          const updates = await telegram.call('getUpdates', { offset, timeout: 30, allowed_updates: ['message'] }, 40_000);
          for (const update of updates) {
            offset = update.update_id + 1;
            await handleUpdate(update).catch((err) => console.error('Bot do Telegram:', err.message));
          }
        } catch (err) {
          if (stopped) break;
          console.error('Telegram (polling):', err.message);
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }
    })();
    return () => (stopped = true);
  }

  return { handleUpdate, startPolling };
}
