const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    data: null,
    meta: null,
    error: { code: 'RATE_LIMIT', message: 'Demasiados intentos, espera unos minutos' },
  },
});

const processLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    data: null,
    meta: null,
    error: { code: 'RATE_LIMIT', message: 'Demasiadas solicitudes de procesamiento' },
  },
});

module.exports = { authLimiter, processLimiter };
