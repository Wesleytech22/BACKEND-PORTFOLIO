import { randomUUID } from 'node:crypto';
import { validate } from '../../shared/validation/validate.js';
import { escapeHtml } from '../../integrations/telegram.js';
import { DEFAULT_LANG, parseLang } from '../../shared/i18n.js';
import { contactSchema } from './contact.schema.js';

const formatDate = (iso) =>
  new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });

const LANG_LABELS = { pt: '🇧🇷 Português', en: '🇺🇸 English', zh: '🇨🇳 中文' };

export function formatContactForTelegram(message) {
  return [
    '📬 <b>Nova mensagem pelo portfólio</b>',
    '',
    `👤 <b>${escapeHtml(message.name)}</b>`,
    `✉️ ${escapeHtml(message.email)}`,
    `🌐 ${LANG_LABELS[message.lang] || escapeHtml(message.lang)}`,
    `🕒 ${formatDate(message.createdAt)}`,
    '',
    escapeHtml(message.message),
    '',
    '<i>Responda direto para o e-mail acima.</i>',
  ].join('\n');
}

// Recebe a mensagem do site, guarda uma cópia e avisa o dono no Telegram.
// Se o Telegram falhar, a mensagem não se perde: fica salva com o status.
export function createContactService({ repository, telegram }) {
  return {
    async submit(input) {
      const data = validate(contactSchema, input);
      if (data.website) return { delivered: true }; // robô: finge sucesso e descarta
      delete data.website;
      data.lang = parseLang(data.lang) || DEFAULT_LANG;

      const message = { slug: randomUUID(), ...data, createdAt: new Date().toISOString() };
      let status = 'desativado';
      if (telegram.enabled) {
        try {
          await telegram.notifyOwner(formatContactForTelegram(message));
          status = 'enviado';
        } catch (err) {
          console.error('Falha ao avisar no Telegram:', err.message);
          status = 'falhou';
        }
      }
      await repository.insert({ ...message, telegram: status });
      return { delivered: true };
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
