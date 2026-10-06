// Camada HTTP: traduz requisição ↔ serviço. Nenhuma regra de negócio aqui.
export function createCatalogController(service) {
  return {
    async list(req, res) {
      const { featured } = req.query;
      const filter = featured === undefined ? undefined : featured === 'true';
      res.json({ items: await service.list({ featured: filter }) });
    },

    async get(req, res) {
      res.json(await service.get(req.params.slug));
    },

    async create(req, res) {
      const item = await service.create(req.body);
      res.status(201).location(`${req.baseUrl}/${item.slug}`).json(item);
    },

    async update(req, res) {
      res.json(await service.update(req.params.slug, req.body));
    },

    async remove(req, res) {
      await service.remove(req.params.slug);
      res.status(204).end();
    },
  };
}
