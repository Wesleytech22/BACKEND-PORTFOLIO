import { translations } from '../../shared/i18n.js';

// Campos de uma experiência profissional (title = cargo).
export const experienceSchema = {
  title: { type: 'string', required: true, max: 120 },
  company: { type: 'string', required: true, max: 120 },
  period: { type: 'string', required: true, max: 60 },
  highlights: { type: 'string[]', max: 15, default: [] },
  tags: { type: 'string[]', max: 20, default: [] },
  order: { type: 'number', default: 0 },
  i18n: translations(['title', 'period', 'highlights']),
};
