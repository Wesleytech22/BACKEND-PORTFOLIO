import { createCatalogModule } from '../../shared/catalog/catalog.module.js';
import { experienceSchema } from './experiences.schema.js';

export function createExperiencesModule(deps) {
  return createCatalogModule({ ...deps, file: 'experiences.json', schema: experienceSchema, label: 'Experiência' });
}
