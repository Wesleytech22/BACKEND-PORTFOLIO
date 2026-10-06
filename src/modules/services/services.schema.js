// Campos de um serviço oferecido (o que aparece na seção "Serviços").
export const serviceSchema = {
  title: { type: 'string', required: true, max: 80 },
  description: { type: 'text', required: true, max: 600 },
  tags: { type: 'string[]', max: 12, default: [] },
  order: { type: 'number', default: 0 },
};
