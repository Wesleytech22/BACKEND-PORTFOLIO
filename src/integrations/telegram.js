const API_URL = 'https://api.telegram.org';

export const escapeHtml = (text) =>
  String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Cliente da Bot API do Telegram. "enabled" indica se dá para notificar o
// dono (token + chat_id); só o token já basta para o bot receber comandos.
export function createTelegramClient({ botToken, chatId }, fetchImpl = fetch) {
  async function call(method, payload = {}, timeoutMs = 10_000) {
    const res = await fetchImpl(`${API_URL}/bot${botToken}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const data = await res.json().catch(() => ({}));
    if (!data.ok) throw new Error(`Telegram ${method}: ${data.description || `HTTP ${res.status}`}`);
    return data.result;
  }

  const send = (targetChatId, text, extra = {}) =>
    call('sendMessage', { chat_id: targetChatId, text, parse_mode: 'HTML', disable_web_page_preview: true, ...extra });

  return {
    hasToken: Boolean(botToken),
    enabled: Boolean(botToken && chatId),
    ownerChatId: chatId ? String(chatId) : '',
    call,
    send,
    notifyOwner: (text, extra) => send(chatId, text, extra),
  };
}
