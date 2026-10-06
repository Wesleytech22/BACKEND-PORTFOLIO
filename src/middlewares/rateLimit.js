import { AppError } from '../shared/errors/AppError.js';

// Limite simples por IP, em memória (suficiente para uma instância só).
export function createRateLimit({ max, windowMs, message }) {
  const hits = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const recent = (hits.get(req.ip) || []).filter((at) => now - at < windowMs);
    if (recent.length >= max) {
      res.set('Retry-After', String(Math.ceil((windowMs - (now - recent[0])) / 1000)));
      return next(AppError.tooManyRequests(message));
    }
    recent.push(now);
    hits.set(req.ip, recent);
    next();
  };
}
