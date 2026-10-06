import { translations } from '../../shared/i18n.js';

// Campos de um projeto do portfólio.
export const projectSchema = {
  title: { type: 'string', required: true, max: 120 },
  subtitle: { type: 'string', max: 200, default: '' },
  description: { type: 'text', required: true, max: 2000 },
  highlights: { type: 'string[]', max: 12, default: [] },
  tags: { type: 'string[]', max: 20, default: [] },
  image: { type: 'string', max: 300, default: '' },
  repoUrl: { type: 'url', max: 300, default: '' },
  liveUrl: { type: 'url', max: 300, default: '' },
  featured: { type: 'boolean', default: false },
  order: { type: 'number', default: 0 },
  i18n: translations(['title', 'subtitle', 'description', 'highlights']),
};
