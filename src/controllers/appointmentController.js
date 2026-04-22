const appointmentsRepo = require('../repositories/appointmentsRepo');

async function today(req, res, next) {
  try {
    const list = await appointmentsRepo.listTodayForVet(req.supabase, req.veterinarianId);
    return res.ok(list, { count: list.length });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const created = await appointmentsRepo.create(req.supabase, req.veterinarianId, req.body);
    return res.ok(created, null, 201);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const updated = await appointmentsRepo.update(req.supabase, req.veterinarianId, req.params.id, req.body);
    return res.ok(updated);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await appointmentsRepo.remove(req.supabase, req.veterinarianId, req.params.id);
    return res.ok({ deleted: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { today, create, update, remove };
