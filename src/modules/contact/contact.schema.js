// Formulário de contato. "website" é uma armadilha para robôs: o campo fica
// escondido na página, então só um robô o preenche. "lang" é o idioma em
// que o visitante estava navegando.
export const contactSchema = {
  name: { type: 'string', required: true, max: 80 },
  email: { type: 'email', required: true, max: 120 },
  message: { type: 'text', required: true, min: 10, max: 1500 },
  lang: { type: 'string', max: 5, default: 'pt' },
  website: { type: 'string', max: 200, default: '' },
};
