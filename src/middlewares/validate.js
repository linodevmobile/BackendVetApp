const { ZodError } = require('zod');
const AppError = require('../utils/AppError');

function validate(schemas) {
  return (req, res, next) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) req.query = schemas.query.parse(req.query);
      if (schemas.params) req.params = schemas.params.parse(req.params);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        }));
        return next(AppError.validation('Datos de entrada inválidos', details));
      }
      next(err);
    }
  };
}

module.exports = validate;
