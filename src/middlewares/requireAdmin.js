import { createHash, timingSafeEqual } from 'node:crypto';
import { AppError } from '../shared/errors/AppError.js';

const digest = (value) => createHash('sha256').update(value).digest();

// Libera a escrita só com "Authorization: Bearer <ADMIN_TOKEN>". Sem token
// configurado, toda escrita é recusada (a API fica somente leitura).
export function createRequireAdmin(adminToken) {
  return (req, res, next) => {
    if (!adminToken) return next(AppError.unauthorized('Escrita desabilitada: defina ADMIN_TOKEN no .env.'));
    const [scheme, token] = (req.get('authorization') || '').split(' ');
    if (scheme !== 'Bearer' || !token || !timingSafeEqual(digest(token), digest(adminToken))) {
      return next(AppError.unauthorized('Token de administrador inválido.'));
    }
    next();
  };
}
