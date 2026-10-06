import { AppError } from '../shared/errors/AppError.js';

export function notFound(req, res, next) {
  next(AppError.notFound(`Rota não encontrada: ${req.method} ${req.originalUrl}`));
}

// Resposta de erro padronizada: { error, details? }. Erros inesperados
// viram 500 sem vazar a mensagem interna.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido no corpo da requisição.' });
  }
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message, ...(err.details && { details: err.details }) });
  }
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
}
