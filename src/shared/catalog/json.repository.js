import fs from 'node:fs/promises';
import path from 'node:path';

// Repositório em arquivo JSON: uma lista de itens por arquivo. É a única
// camada que conhece o armazenamento — trocar por um banco de dados
// significa escrever outro repositório com os mesmos métodos.
export class JsonRepository {
  constructor(filePath) {
    this.filePath = filePath;
    this.queue = Promise.resolve();
  }

  async findAll() {
    try {
      return JSON.parse(await fs.readFile(this.filePath, 'utf8'));
    } catch (err) {
      if (err.code === 'ENOENT') return [];
      throw err;
    }
  }

  async findBySlug(slug) {
    const items = await this.findAll();
    return items.find((item) => item.slug === slug) || null;
  }

  async insert(item) {
    return this.mutate((items) => {
      items.push(item);
      return item;
    });
  }

  async update(slug, changes) {
    return this.mutate((items) => {
      const index = items.findIndex((item) => item.slug === slug);
      if (index === -1) return null;
      items[index] = { ...items[index], ...changes };
      return items[index];
    });
  }

  async remove(slug) {
    return this.mutate((items) => {
      const index = items.findIndex((item) => item.slug === slug);
      if (index === -1) return false;
      items.splice(index, 1);
      return true;
    });
  }

  // Escritas entram numa fila (sem corrida entre requisições) e são
  // atômicas: grava num arquivo temporário e renomeia por cima.
  mutate(change) {
    const run = this.queue.then(async () => {
      const items = await this.findAll();
      const result = change(items);
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      const tmp = `${this.filePath}.${process.pid}.tmp`;
      await fs.writeFile(tmp, `${JSON.stringify(items, null, 2)}\n`, 'utf8');
      await fs.rename(tmp, this.filePath);
      return result;
    });
    this.queue = run.catch(() => {});
    return run;
  }
}
