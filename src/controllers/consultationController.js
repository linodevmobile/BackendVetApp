const { transcribeAudio } = require('../services/transcriptionService');
const { getPrompt, isValidSection, VALID_SECTIONS } = require('../services/promptRouter');
const { processWithLLM } = require('../services/llmService');
const { uploadAudio, deleteLocalFile } = require('../services/storageService');
const { flattenAiToText } = require('../utils/flattenAiToText');
const consultationsRepo = require('../repositories/consultationsRepo');
const sectionsRepo = require('../repositories/sectionsRepo');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

async function processConsultation(req, res, next) {
  const file = req.file;

  try {
    const {
      section,
      consultation_id,
      patient_id,
      consultation_type,
      chief_complaint,
      text_input,
      overwrite_text,
    } = req.body;

    if (!isValidSection(section)) {
      throw AppError.validation(
        `Sección inválida. Válidas: ${VALID_SECTIONS.join(', ')}`
      );
    }
    if (!file && !text_input) {
      throw AppError.validation('Se requiere archivo de audio o text_input');
    }
    if (!consultation_id && !patient_id) {
      throw AppError.validation('Requiere consultation_id o patient_id');
    }

    let consultationId = consultation_id;
    if (!consultationId) {
      const newConsultation = await consultationsRepo.create(req.supabase, req.veterinarianId, {
        patient_id,
        type: consultation_type,
        chief_complaint,
      });
      consultationId = newConsultation.id;
    } else if (chief_complaint) {
      await consultationsRepo.updateStatus(req.supabase, req.veterinarianId, consultationId, {
        chief_complaint,
      });
    }

    let sourceText;
    let audioPath = null;
    let transcription = null;

    if (file) {
      audioPath = await uploadAudio(file.path, file.originalname, file.mimetype);
      transcription = await transcribeAudio(file.path);
      deleteLocalFile(file.path);
      sourceText = transcription;
    } else {
      sourceText = text_input;
    }

    const prompt = getPrompt(section);
    const aiSuggested = await processWithLLM(prompt, sourceText);
    const suggestedText = flattenAiToText(section, aiSuggested);

    const sectionRow = await sectionsRepo.upsert(req.supabase, {
      consultationId,
      section,
      transcription,
      aiSuggested,
      text: suggestedText,
      audioUrl: audioPath,
      overwriteText: !!overwrite_text,
    });

    const consultation = await consultationsRepo.getById(req.supabase, req.veterinarianId, consultationId);

    return res.ok({
      consultation_id: consultationId,
      section,
      audio_path: audioPath,
      transcription,
      ai_suggested: aiSuggested,
      suggested_text: suggestedText,
      section_row: sectionRow,
      consultation,
    });
  } catch (err) {
    if (file?.path) deleteLocalFile(file.path);
    logger.error('Error al procesar consulta:', err.message);
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
  try {
    const { id, section } = req.params;
    const existing = await consultationsRepo.getById(req.supabase, req.veterinarianId, id);
    if (!existing) throw AppError.notFound('Consulta no encontrada');

    const updated = await sectionsRepo.updateText(req.supabase, {
      consultationId: id,
      section,
      text: req.body.text,
      content: req.body.content,
    });
    return res.ok(updated);
  } catch (err) {
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
  processConsultation,
  getConsultationById,
  updateSection,
  pause,
  resume,
  sign,
};
