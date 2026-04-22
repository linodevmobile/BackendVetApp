const { supabase, supabaseAdmin, supabaseForToken } = require('../config/supabaseClient');
const { buildSalutation } = require('../utils/salutation');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      logger.error('Error de autenticación:', error.message);
      throw AppError.unauthorized('Credenciales inválidas');
    }

    const { data: vet, error: vetError } = await supabase
      .from('veterinarians')
      .select('id, full_name, email, license_number, phone, salutation')
      .eq('id', data.user.id)
      .single();

    if (vetError || !vet) {
      logger.error('Perfil veterinario no encontrado:', data.user.id);
      throw AppError.forbidden('Usuario no registrado como veterinario');
    }

    logger.info('Login exitoso:', email);
    return res.ok({
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
      veterinarian: vet,
    });
  } catch (err) {
    next(err);
  }
}

async function register(req, res, next) {
  const { email, password, full_name, license_number, phone, salutation } = req.body;
  let createdUserId = null;

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name } },
    });

    if (error) {
      logger.error('Error al registrar usuario:', error.message);
      throw AppError.validation('Error al registrar usuario', [{ path: 'auth', message: error.message }]);
    }

    createdUserId = data.user.id;
    const finalSalutation = buildSalutation(full_name, salutation);

    const writeClient = data.session?.access_token
      ? supabaseForToken(data.session.access_token)
      : (supabaseAdmin || supabase);

    const { data: vet, error: vetError } = await writeClient
      .from('veterinarians')
      .insert({
        id: data.user.id,
        full_name,
        email,
        license_number,
        phone,
        salutation: finalSalutation,
      })
      .select('id, full_name, email, license_number, phone, salutation')
      .single();

    if (vetError) {
      logger.error('Error al crear perfil veterinario, ejecutando rollback:', vetError.message);
      if (supabaseAdmin) {
        await supabaseAdmin.auth.admin.deleteUser(createdUserId).catch((e) =>
          logger.error('Rollback deleteUser falló:', e.message)
        );
      }
      throw AppError.internal('No se pudo crear el perfil veterinario', vetError.message);
    }

    logger.info('Veterinario registrado:', email);
    return res.ok(
      {
        user_id: data.user.id,
        veterinarian: vet,
      },
      null,
      201
    );
  } catch (err) {
    next(err);
  }
}

module.exports = { login, register };
