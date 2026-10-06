// Erro esperado da aplicação: carrega o status HTTP e, opcionalmente,
// os detalhes por campo (validação).
export class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.details = details;
  }

  static badRequest(message, details) {
    return new AppError(400, message, details);
  }

  static unauthorized(message = 'Não autorizado.') {
    return new AppError(401, message);
  }

  static notFound(message = 'Recurso não encontrado.') {
    return new AppError(404, message);
  }

  static conflict(message) {
    return new AppError(409, message);
  }

  static tooManyRequests(message) {
    return new AppError(429, message);
  }
}
