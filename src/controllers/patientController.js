const patientsRepo = require('../repositories/patientsRepo');
const favoritesRepo = require('../repositories/favoritesRepo');
const AppError = require('../utils/AppError');

async function create(req, res, next) {
  try {
    const patient = await patientsRepo.create(req.supabase, req.veterinarianId, req.body);
    return res.ok(patient, null, 201);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const patient = await patientsRepo.getById(req.supabase, req.veterinarianId, req.params.id);
    if (!patient) throw AppError.notFound('Paciente no encontrado');
    return res.ok(patient);
  } catch (err) {
    if (err.code === 'PGRST116') return next(AppError.notFound('Paciente no encontrado'));
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const { search, filter, limit, offset } = req.query;
    const result = await patientsRepo.list(req.supabase, req.veterinarianId, {
      search,
      filter: filter || 'all',
      limit,
      offset,
    });
    return res.ok(result.items, { total: result.total, limit, offset });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const patient = await patientsRepo.update(req.supabase, req.veterinarianId, req.params.id, req.body);
    return res.ok(patient);
  } catch (err) {
    next(err);
  }
}

async function addFavorite(req, res, next) {
  try {
    const fav = await favoritesRepo.add(req.supabase, req.veterinarianId, req.params.patient_id);
    return res.ok(fav, null, 201);
  } catch (err) {
    next(err);
  }
}

async function removeFavorite(req, res, next) {
  try {
    await favoritesRepo.remove(req.supabase, req.veterinarianId, req.params.patient_id);
    return res.ok({ deleted: true });
  } catch (err) {
    next(err);
  }
}

async function listFavorites(req, res, next) {
  try {
    const items = await favoritesRepo.list(req.supabase, req.veterinarianId);
    return res.ok(items, { count: items.length });
  } catch (err) {
    next(err);
  }
}

async function timeline(req, res, next) {
  try {
    const { type, limit, offset } = req.query;
    const result = await patientsRepo.timeline(req.supabase, req.veterinarianId, req.params.id, {
      type,
      limit,
      offset,
    });
    return res.ok(result.items, { total: result.total, limit, offset, type });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, getById, list, update, addFavorite, removeFavorite, listFavorites, timeline };
