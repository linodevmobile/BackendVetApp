const supabase = require('../config/supabaseClient');
const logger = require('../utils/logger');

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Se requieren los campos "email" y "password"' });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      logger.error('Error de autenticación:', error.message);
      return res.status(401).json({ error: 'Credenciales inválidas', details: error.message });
    }

    // Get veterinarian profile
    const { data: vet, error: vetError } = await supabase
      .from('veterinarians')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (vetError) {
      logger.error('Veterinario no encontrado para usuario:', data.user.id);
      return res.status(403).json({ error: 'Usuario no registrado como veterinario' });
    }

    logger.info('Login exitoso:', email);
    res.json({
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
      veterinarian: vet,
    });
  } catch (error) {
    logger.error('Error en login:', error.message);
    res.status(500).json({ error: 'Error en el servidor', details: error.message });
  }
}

async function register(req, res) {
  const { email, password, full_name, license_number, phone } = req.body;

  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'Se requieren los campos "email", "password" y "full_name"' });
  }

  try {
    // 1. Create user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name } },
    });

    if (error) {
      logger.error('Error al registrar usuario:', error.message);
      return res.status(400).json({ error: 'Error al registrar usuario', details: error.message });
    }

    // 2. Create veterinarian profile
    const { data: vet, error: vetError } = await supabase
      .from('veterinarians')
      .insert({
        id: data.user.id,
        full_name,
        email,
        license_number,
        phone,
      })
      .select()
      .single();

    if (vetError) {
      logger.error('Error al crear perfil veterinario:', vetError.message);
      return res.status(500).json({ error: 'Usuario creado pero falló el perfil veterinario', details: vetError.message });
    }

    logger.info('Veterinario registrado:', email);
    res.status(201).json({
      user_id: data.user.id,
      veterinarian: vet,
    });
  } catch (error) {
    logger.error('Error en registro:', error.message);
    res.status(500).json({ error: 'Error en el servidor', details: error.message });
  }
}

module.exports = { login, register };
