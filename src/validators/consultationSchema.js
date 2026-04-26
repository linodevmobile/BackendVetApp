const { z } = require('zod');
const { VALID_SECTIONS } = require('../services/promptRouter');

const sectionEnum = z.enum(VALID_SECTIONS);

const createConsultationSchema = z.object({
  patient_id: z.string().uuid(),
  type: z.enum(['routine', 'surgery', 'emergency']).optional(),
});

const sectionParamSchema = z.object({
  id: z.string().uuid(),
  section: sectionEnum,
});

// Multipart-friendly: JSON fields may arrive as strings (from form-data) and are
// parsed in-place. `audio` (file) is handled by multer; controller validates that
// at least one of {text, content, transcription, ai_suggested, audio} is provided.
const jsonOrObject = z
  .union([z.string(), z.record(z.string(), z.any())])
  .optional()
  .transform((v) => (typeof v === 'string' ? JSON.parse(v) : v));

const updateSectionBodySchema = z.object({
  text: z.string().optional(),
  content: jsonOrObject,
  transcription: z.string().optional(),
  ai_suggested: jsonOrObject,
});

const pauseSchema = z.object({
  reason: z.enum(['labs', 'imaging', 'procedure', 'owner', 'other']),
  note: z.string().optional(),
});

const signSchema = z.object({
  result: z.enum(['discharge', 'hospitalization', 'deceased', 'referred']),
  summary: z.string().optional(),
  primary_diagnosis: z.string().optional(),
});

module.exports = {
  createConsultationSchema,
  sectionParamSchema,
  updateSectionBodySchema,
  pauseSchema,
  signSchema,
};
