import { createCatalogModule } from '../../shared/catalog/catalog.module.js';
import { serviceSchema } from './services.schema.js';

export function createServicesModule(deps) {
  return createCatalogModule({ ...deps, file: 'services.json', schema: serviceSchema, label: 'Serviço' });
}
