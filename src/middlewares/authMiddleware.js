const { supabase, supabaseForToken } = require('../config/supabaseClient');
const AppError = require('../utils/AppError');

async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw AppError.unauthorized('Falta token Bearer');
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      throw AppError.unauthorized('Token inválido o expirado');
    }

    req.user = { id: data.user.id, email: data.user.email };
    req.veterinarianId = data.user.id;
    req.accessToken = token;
    req.supabase = supabaseForToken(token);

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = authMiddleware;
