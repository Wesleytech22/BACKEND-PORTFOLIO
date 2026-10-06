import { AppError } from '../errors/AppError.js';
import { validate } from '../validation/validate.js';
import { slugify } from './slugify.js';

// Regras de negócio comuns a qualquer coleção do portfólio (projetos,
// serviços e as que vierem): validação, slug único, ordenação e datas.
export class CatalogService {
  constructor({ repository, schema, label }) {
    this.repository = repository;
    this.schema = schema;
    this.label = label;
  }

  async list({ featured } = {}) {
    const items = await this.repository.findAll();
    return items
      .filter((item) => featured === undefined || Boolean(item.featured) === featured)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.title.localeCompare(b.title, 'pt-BR'));
  }

  async get(slug) {
    const item = await this.repository.findBySlug(slug);
    if (!item) throw AppError.notFound(`${this.label} não encontrado.`);
    return item;
  }

  async create(input) {
    const data = validate(this.schema, input);
    const slug = slugify(data.title);
    if (!slug) throw AppError.badRequest('Dados inválidos.', { title: 'title precisa ter letras ou números.' });
    if (await this.repository.findBySlug(slug)) {
      throw AppError.conflict(`Já existe um ${this.label.toLowerCase()} com o slug "${slug}".`);
    }
    const now = new Date().toISOString();
    return this.repository.insert({ slug, ...data, createdAt: now, updatedAt: now });
  }

  // O slug é fixo depois de criado, para não quebrar links já publicados.
  async update(slug, input) {
    const changes = validate(this.schema, input, { partial: true });
    const updated = await this.repository.update(slug, { ...changes, updatedAt: new Date().toISOString() });
    if (!updated) throw AppError.notFound(`${this.label} não encontrado.`);
    return updated;
  }

  async remove(slug) {
    if (!(await this.repository.remove(slug))) throw AppError.notFound(`${this.label} não encontrado.`);
  }
}
