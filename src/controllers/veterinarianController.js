const AppError = require('../utils/AppError');

async function me(req, res, next) {
  try {
    const { data, error } = await req.supabase
      .from('veterinarians')
      .select('id, full_name, email, license_number, phone, salutation')
      .eq('id', req.veterinarianId)
      .single();
    if (error) throw error;
    return res.ok(data);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const { data, error } = await req.supabase
      .from('veterinarians')
      .select('id, full_name, email, license_number, phone, salutation')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    if (!data) throw AppError.notFound('Veterinario no encontrado');
    return res.ok(data);
  } catch (err) {
    if (err.code === 'PGRST116') return next(AppError.notFound('Veterinario no encontrado'));
    next(err);
  }
}

module.exports = { me, getById };
