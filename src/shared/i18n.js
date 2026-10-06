// Idiomas do portfólio. O conteúdo base de cada item é em português; as
// traduções ficam em item.i18n.<idioma> e sobrescrevem só os campos traduzidos.
export const DEFAULT_LANG = 'pt';
export const TRANSLATION_LANGS = ['en', 'zh'];
export const SUPPORTED_LANGS = [DEFAULT_LANG, ...TRANSLATION_LANGS];

export function parseLang(value) {
  const lang = String(value || '').toLowerCase().slice(0, 2);
  return SUPPORTED_LANGS.includes(lang) ? lang : null;
}

export function translations(fields) {
  return { type: 'translations', langs: TRANSLATION_LANGS, fields, default: {} };
}

// Sem idioma: devolve o item completo (com i18n), útil para edição.
// Com idioma: devolve o item já traduzido e sem o bloco i18n.
export function localize(item, lang) {
  if (!lang) return item;
  const { i18n, ...base } = item;
  return { ...base, ...(lang !== DEFAULT_LANG && i18n?.[lang]), lang };
}
