const measurementsRepo = require('../repositories/measurementsRepo');

async function listByPatient(req, res, next) {
  try {
    const { metric, limit, offset } = req.query;
    const result = await measurementsRepo.listByPatient(req.supabase, req.params.id, {
      metric,
      limit,
      offset,
    });
    return res.ok(result.items, { total: result.total, limit, offset, metric });
  } catch (err) {
    next(err);
  }
}

module.exports = { listByPatient };
