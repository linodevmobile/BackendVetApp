const alertsRepo = require('../repositories/alertsRepo');

async function create(req, res, next) {
  try {
    const alert = await alertsRepo.create(req.supabase, {
      patientId: req.params.patient_id,
      label: req.body.label,
      severity: req.body.severity,
    });
    return res.ok(alert, null, 201);
  } catch (err) {
    next(err);
  }
}

async function listByPatient(req, res, next) {
  try {
    const items = await alertsRepo.listByPatient(req.supabase, req.params.patient_id);
    return res.ok(items, { count: items.length });
  } catch (err) {
    next(err);
  }
}

async function deactivate(req, res, next) {
  try {
    const alert = await alertsRepo.deactivate(req.supabase, req.params.id);
    return res.ok(alert);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await alertsRepo.remove(req.supabase, req.params.id);
    return res.ok({ deleted: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, listByPatient, deactivate, remove };
