import { createCatalogModule } from '../../shared/catalog/catalog.module.js';
import { projectSchema } from './projects.schema.js';

export function createProjectsModule(deps) {
  return createCatalogModule({ ...deps, file: 'projects.json', schema: projectSchema, label: 'Projeto' });
}
