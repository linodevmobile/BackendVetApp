const { transcribeAudio } = require('../services/transcriptionService');
const { getPrompt, isAiSection, AI_SECTIONS } = require('../services/promptRouter');
const { processWithLLM } = require('../services/llmService');
const { deleteLocalFile } = require('../services/storageService');
const { flattenAiToText } = require('../utils/flattenAiToText');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

// Stateless AI utility. Takes audio (or raw text) + section, returns
// { transcription, ai_suggested, suggested_text }. Does NOT touch DB or Storage.
// Caller (client) decides when to commit results via PATCH /consultations/:id/sections/:section.
async function processSection(req, res, next) {
  const file = req.file;

  try {
    const { section, text_input } = req.body;

    if (!isAiSection(section)) {
      throw AppError.validation(
        `Sección inválida para IA. Válidas: ${AI_SECTIONS.join(', ')}`
      );
    }
    if (!file && !text_input) {
      throw AppError.validation('Se requiere archivo de audio o text_input');
    }

    let transcription = null;
    let sourceText;

    if (file) {
      transcription = await transcribeAudio(file.path);
      deleteLocalFile(file.path);
      sourceText = transcription;
    } else {
      sourceText = text_input;
    }

    const prompt = getPrompt(section);
    const aiSuggested = await processWithLLM(prompt, sourceText);
    const suggestedText = flattenAiToText(section, aiSuggested);

    return res.ok({
      section,
      transcription,
      ai_suggested: aiSuggested,
      suggested_text: suggestedText,
    });
  } catch (err) {
    if (file?.path) deleteLocalFile(file.path);
    logger.error('Error en utilidad IA process-section:', err.message);
    next(err);
  }
}

module.exports = { processSection };
