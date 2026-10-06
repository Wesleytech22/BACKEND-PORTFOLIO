import { AppError } from '../errors/AppError.js';

// Validador declarativo e sem dependências. Cada campo do schema aceita:
//   type: 'string' | 'text' | 'url' | 'boolean' | 'number' | 'string[]'
//   required, max (tamanho máximo de texto ou de itens da lista), default
// Com { partial: true } (PATCH) só os campos enviados são validados.
const URL_PATTERN = /^https?:\/\/[^\s]+$/i;

function checkField(name, rule, value) {
  switch (rule.type) {
    case 'string':
    case 'text':
    case 'url': {
      if (typeof value !== 'string') return `${name} deve ser um texto.`;
      const trimmed = value.trim();
      if (rule.required && !trimmed) return `${name} é obrigatório.`;
      if (rule.max && trimmed.length > rule.max) return `${name} aceita no máximo ${rule.max} caracteres.`;
      if (rule.type === 'url' && trimmed && !URL_PATTERN.test(trimmed)) return `${name} deve ser uma URL http(s).`;
      return null;
    }
    case 'boolean':
      return typeof value === 'boolean' ? null : `${name} deve ser verdadeiro ou falso.`;
    case 'number':
      return Number.isFinite(value) ? null : `${name} deve ser um número.`;
    case 'string[]': {
      if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
        return `${name} deve ser uma lista de textos.`;
      }
      if (rule.max && value.length > rule.max) return `${name} aceita no máximo ${rule.max} itens.`;
      return null;
    }
    default:
      throw new Error(`Tipo de campo desconhecido no schema: ${rule.type}`);
  }
}

function normalize(rule, value) {
  if (typeof value === 'string') return value.trim();
  if (rule.type === 'string[]') return value.map((item) => item.trim()).filter(Boolean);
  return value;
}

export function validate(schema, input, { partial = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw AppError.badRequest('O corpo da requisição deve ser um objeto JSON.');
  }

  const errors = {};
  const output = {};

  for (const key of Object.keys(input)) {
    if (!(key in schema)) errors[key] = `Campo desconhecido: ${key}.`;
  }

  for (const [name, rule] of Object.entries(schema)) {
    const present = input[name] !== undefined && input[name] !== null;
    if (!present) {
      if (partial) continue;
      if (rule.required) errors[name] = `${name} é obrigatório.`;
      else if ('default' in rule) output[name] = structuredClone(rule.default);
      continue;
    }
    const error = checkField(name, rule, input[name]);
    if (error) errors[name] = error;
    else output[name] = normalize(rule, input[name]);
  }

  if (Object.keys(errors).length) throw AppError.badRequest('Dados inválidos.', errors);
  return output;
}
