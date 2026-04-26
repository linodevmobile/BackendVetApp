const { uploadAudio, deleteLocalFile } = require('../services/storageService');
const consultationsRepo = require('../repositories/consultationsRepo');
const sectionsRepo = require('../repositories/sectionsRepo');
const AppError = require('../utils/AppError');

async function createConsultation(req, res, next) {
  try {
    const { patient_id, type } = req.body;
    const created = await consultationsRepo.create(req.supabase, req.veterinarianId, {
      patient_id,
      type,
    });
    return res.ok(created, null, 201);
  } catch (err) {
    next(err);
  }
}

async function getConsultationById(req, res, next) {
  try {
    const consultation = await consultationsRepo.getById(req.supabase, req.veterinarianId, req.params.id);
    if (!consultation) throw AppError.notFound('Consulta no encontrada');
    return res.ok(consultation);
  } catch (err) {
    if (err.code === 'PGRST116') return next(AppError.notFound('Consulta no encontrada'));
    next(err);
  }
}

async function updateSection(req, res, next) {
  const file = req.file;
  try {
    const { id, section } = req.params;
    const existing = await consultationsRepo.getById(req.supabase, req.veterinarianId, id);
    if (!existing) throw AppError.notFound('Consulta no encontrada');

    const fields = {};
    if (req.body.text !== undefined) fields.text = req.body.text;
    if (req.body.content !== undefined) fields.content = req.body.content;
    if (req.body.transcription !== undefined) fields.transcription = req.body.transcription;
    if (req.body.ai_suggested !== undefined) fields.ai_suggested = req.body.ai_suggested;

    if (file) {
      const audioUrl = await uploadAudio(file.path, file.originalname, file.mimetype);
      deleteLocalFile(file.path);
      fields.audio_url = audioUrl;
    }

    if (Object.keys(fields).length === 0) {
      throw AppError.validation('Requiere al menos un campo (text, content, transcription, ai_suggested) o un archivo de audio');
    }

    const updated = await sectionsRepo.upsertPartial(req.supabase, {
      consultationId: id,
      section,
      fields,
    });
    return res.ok(updated);
  } catch (err) {
    if (file?.path) deleteLocalFile(file.path);
    next(err);
  }
}

async function pause(req, res, next) {
  try {
    const { reason, note } = req.body;
    const updated = await consultationsRepo.pause(req.supabase, req.veterinarianId, req.params.id, reason, note);
    return res.ok(updated);
  } catch (err) {
    next(err);
  }
}

async function resume(req, res, next) {
  try {
    const updated = await consultationsRepo.resume(req.supabase, req.veterinarianId, req.params.id);
    return res.ok(updated);
  } catch (err) {
    next(err);
  }
}

async function sign(req, res, next) {
  try {
    const updated = await consultationsRepo.sign(req.supabase, req.veterinarianId, req.params.id, req.body);
    return res.ok(updated);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createConsultation,
  getConsultationById,
  updateSection,
  pause,
  resume,
  sign,
};
