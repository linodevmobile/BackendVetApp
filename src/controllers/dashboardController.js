const consultationsRepo = require('../repositories/consultationsRepo');

async function recentConsultations(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 4, 20);
    const list = await consultationsRepo.listRecentSigned(req.supabase, req.veterinarianId, limit);
    return res.ok(list, { count: list.length });
  } catch (err) {
    next(err);
  }
}

async function consultationsByStatus(req, res, next) {
  try {
    const status = req.query.status;
    if (!['in_progress', 'paused', 'signed'].includes(status)) {
      return res.fail('VALIDATION_ERROR', 'status inválido', 400);
    }
    const list = await consultationsRepo.listByStatus(req.supabase, req.veterinarianId, status);
    return res.ok(list, { count: list.length });
  } catch (err) {
    next(err);
  }
}

module.exports = { recentConsultations, consultationsByStatus };
