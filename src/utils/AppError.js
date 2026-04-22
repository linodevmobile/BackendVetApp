class AppError extends Error {
  constructor(code, message, statusCode = 400, details = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

AppError.validation = (message, details) => new AppError('VALIDATION_ERROR', message, 400, details);
AppError.unauthorized = (message = 'Credenciales inválidas o faltantes') => new AppError('UNAUTHORIZED', message, 401);
AppError.forbidden = (message = 'Acceso denegado') => new AppError('FORBIDDEN', message, 403);
AppError.notFound = (message = 'Recurso no encontrado') => new AppError('NOT_FOUND', message, 404);
AppError.conflict = (message, details) => new AppError('CONFLICT', message, 409, details);
AppError.internal = (message = 'Error en el servidor', details) => new AppError('INTERNAL', message, 500, details);

module.exports = AppError;
