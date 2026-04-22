const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    logger.error(`[${err.code}] ${err.message}`, err.details || '');
    return res.status(err.statusCode).json({
      data: null,
      meta: null,
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  logger.error('Unhandled error:', err.message, err.stack);
  return res.status(500).json({
    data: null,
    meta: null,
    error: {
      code: 'INTERNAL',
      message: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'production' ? null : err.message,
    },
  });
}

module.exports = errorHandler;
