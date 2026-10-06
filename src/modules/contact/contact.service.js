import { randomUUID } from 'node:crypto';
import { validate } from '../../shared/validation/validate.js';
import { escapeHtml } from '../../integrations/telegram.js';
import { DEFAULT_LANG, parseLang } from '../../shared/i18n.js';
import { contactSchema } from './contact.schema.js';

const formatDate = (iso) =>
  new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });

const LANG_LABELS = { pt: '🇧🇷 Português', en: '🇺🇸 English', zh: '🇨🇳 中文' };

export function formatContactForTelegram(message, { late = false } = {}) {
  return [
    late ? '📬 <b>Mensagem pendente do portfólio</b>' : '📬 <b>Nova mensagem pelo portfólio</b>',
    late ? '<i>Chegou enquanto o Telegram estava desligado.</i>' : null,
    '',
    `👤 <b>${escapeHtml(message.name)}</b>`,
    `✉️ ${escapeHtml(message.email)}`,
    `🌐 ${LANG_LABELS[message.lang] || escapeHtml(message.lang)}`,
    `🕒 ${formatDate(message.createdAt)}`,
    '',
    escapeHtml(message.message),
    '',
    '<i>Responda direto para o e-mail acima.</i>',
  ]
    .filter((line) => line !== null)
    .join('\n');
}

// Recebe a mensagem do site, guarda uma cópia e avisa o dono no Telegram.
// Se o Telegram falhar ou estiver desligado, a mensagem não se perde: fica
// salva e é reenviada por deliverPending() quando o Telegram voltar.
// A resposta diz a verdade sobre a entrega: { received, telegram }.
export function createContactService({ repository, telegram }) {
  async function notify(message, options) {
    if (!telegram.enabled) return 'desativado';
    try {
      await telegram.notifyOwner(formatContactForTelegram(message, options));
      return 'enviado';
    } catch (err) {
      console.error('Falha ao avisar no Telegram:', err.message);
      return 'falhou';
    }
  }

  return {
    async submit(input) {
      const data = validate(contactSchema, input);
      if (data.website) return { received: true, telegram: true }; // robô: finge sucesso e descarta
      delete data.website;
      data.lang = parseLang(data.lang) || DEFAULT_LANG;

      const message = { slug: randomUUID(), ...data, createdAt: new Date().toISOString() };
      const status = await notify(message);
      await repository.insert({ ...message, telegram: status });
      return { received: true, telegram: status === 'enviado' };
    },

    // Envia ao Telegram as mensagens que ficaram para trás.
    async deliverPending() {
      if (!telegram.enabled) return 0;
      const pending = (await repository.findAll()).filter((m) => m.telegram !== 'enviado');
      let delivered = 0;
      for (const message of pending) {
        const status = await notify(message, { late: true });
        await repository.update(message.slug, { telegram: status });
        if (status === 'enviado') delivered++;
      }
      return delivered;
    },

    async latest(limit = 5) {
      const all = await repository.findAll();
      return all.slice(-limit).reverse();
    },

    async stats() {
      const all = await repository.findAll();
      const today = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      const isToday = (m) => new Date(m.createdAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) === today;
      return { total: all.length, today: all.filter(isToday).length };
    },
  };
}
