const { transcribeAudio } = require('../services/transcriptionService');
const { getPrompt, isValidSection, getDbSection, VALID_SECTIONS } = require('../services/promptRouter');
const { processWithLLM } = require('../services/llmService');
const { createConsultation, getConsultation, closeConsultation, upsertDraft } = require('../services/stateService');
const { uploadAudio, deleteLocalFile } = require('../services/storageService');
const logger = require('../utils/logger');

async function processConsultation(req, res) {
  const file = req.file;
  const { section, consultation_id, patient_id, veterinarian_id } = req.body;

  // --- Validations ---
  if (!file) {
    return res.status(400).json({ error: 'Se requiere un archivo de audio' });
  }

  if (!section) {
    return res.status(400).json({ error: 'Se requiere el campo "section"' });
  }

  if (!isValidSection(section)) {
    return res.status(400).json({
      error: `Sección inválida. Secciones válidas: ${VALID_SECTIONS.join(', ')}`,
    });
  }

  if (!consultation_id && (!patient_id || !veterinarian_id)) {
    return res.status(400).json({
      error: 'Se requiere "consultation_id" o bien "patient_id" y "veterinarian_id" para crear una nueva consulta',
    });
  }

  const MAX_SIZE = 20 * 1024 * 1024; // 20MB
  if (file.size > MAX_SIZE) {
    deleteLocalFile(file.path);
    return res.status(400).json({ error: 'El archivo excede el tamaño máximo de 20MB' });
  }

  try {
    // 1. Upload audio to Supabase Storage
    const audioPath = await uploadAudio(file.path, file.originalname);

    // 2. Transcribe audio with OpenAI
    const transcribedText = await transcribeAudio(file.path);

    // 3. Delete local temp file
    deleteLocalFile(file.path);

    // 4. Get the prompt for this section
    const prompt = getPrompt(section);

    // 5. Process with LLM
    const structuredData = await processWithLLM(prompt, transcribedText);

    // 6. Create or reuse consultation
    let consultationId = consultation_id;

    if (!consultationId) {
      const newConsultation = await createConsultation(patient_id, veterinarian_id);
      consultationId = newConsultation.id;
    }

    // 7. Upsert draft with DB enum section value
    const dbSection = getDbSection(section);
    const draft = await upsertDraft(consultationId, dbSection, structuredData, audioPath, transcribedText);

    // 8. Get full consultation state
    const consultation = await getConsultation(consultationId);

    // 9. Return complete response
    res.json({
      consultation_id: consultationId,
      section,
      audio_path: audioPath,
      transcription: transcribedText,
      structured_data: structuredData,
      draft,
      consultation,
    });
  } catch (error) {
    logger.error('Error al procesar consulta:', error.message);
    deleteLocalFile(file.path);
    res.status(500).json({ error: 'Error al procesar la consulta', details: error.message });
  }
}

async function getConsultationById(req, res) {
  try {
    const consultation = await getConsultation(req.params.id);
    res.json(consultation);
  } catch (error) {
    logger.error('Error al obtener consulta:', error.message);
    res.status(404).json({ error: 'Consulta no encontrada', details: error.message });
  }
}

async function finishConsultation(req, res) {
  const { id } = req.params;
  const { result, chief_complaint, primary_diagnosis } = req.body;

  if (!result) {
    return res.status(400).json({ error: 'Se requiere el campo "result" (discharge, hospitalization, deceased, referred)' });
  }

  try {
    const consultation = await closeConsultation(id, result, chief_complaint, primary_diagnosis);
    res.json(consultation);
  } catch (error) {
    logger.error('Error al finalizar consulta:', error.message);
    res.status(500).json({ error: 'Error al finalizar la consulta', details: error.message });
  }
}

module.exports = { processConsultation, getConsultationById, finishConsultation };
