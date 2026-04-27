const { z } = require('zod');
const { AI_SECTIONS } = require('../services/promptRouter');

// /ai/process-section only accepts sections backed by a prompt (food/vitals/treatment
// are tap-only and persisted directly via PATCH).
const sectionEnum = z.enum(AI_SECTIONS);

// Multipart body — section comes as string from form-data; audio handled by multer.
const processSectionSchema = z.object({
  section: sectionEnum,
  text_input: z.string().optional(),
});

module.exports = { processSectionSchema };
