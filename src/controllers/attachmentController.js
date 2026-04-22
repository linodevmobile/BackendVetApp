const { uploadAttachment, deleteLocalFile } = require('../services/storageService');
const attachmentsRepo = require('../repositories/attachmentsRepo');
const consultationsRepo = require('../repositories/consultationsRepo');
const AppError = require('../utils/AppError');

async function upload(req, res, next) {
  const file = req.file;
  try {
    if (!file) throw AppError.validation('Se requiere archivo');
    const consultationId = req.params.id;

    const existing = await consultationsRepo.getById(req.supabase, req.veterinarianId, consultationId);
    if (!existing) throw AppError.notFound('Consulta no encontrada');

    const path = await uploadAttachment(file.path, file.originalname, file.mimetype);
    deleteLocalFile(file.path);

    const row = await attachmentsRepo.create(req.supabase, {
      consultationId,
      section: req.body.section || null,
      storagePath: path,
      mimeType: file.mimetype,
      label: req.body.label || null,
      sizeBytes: file.size,
    });

    return res.ok(row, null, 201);
  } catch (err) {
    if (file?.path) deleteLocalFile(file.path);
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const items = await attachmentsRepo.listByConsultation(req.supabase, req.params.id);
    return res.ok(items, { count: items.length });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await attachmentsRepo.remove(req.supabase, req.params.attachmentId);
    return res.ok({ deleted: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { upload, list, remove };
