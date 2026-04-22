const { z } = require('zod');
const { VALID_SECTIONS } = require('../services/promptRouter');

const sectionEnum = z.enum(VALID_SECTIONS);

// Used when process/ receives multipart/form-data — fields are strings
const processSchema = z.object({
  section: sectionEnum,
  consultation_id: z.string().uuid().optional(),
  patient_id: z.string().uuid().optional(),
  consultation_type: z.enum(['routine', 'surgery', 'emergency']).optional(),
  chief_complaint: z.string().optional(),
  text_input: z.string().optional(),
  overwrite_text: z
    .union([z.boolean(), z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => v === true || v === 'true'),
}).refine((v) => v.consultation_id || v.patient_id, {
  message: 'Requiere consultation_id o patient_id',
});

const sectionParamSchema = z.object({
  id: z.string().uuid(),
  section: sectionEnum,
});

const updateSectionBodySchema = z.object({
  text: z.string().optional(),
  content: z.record(z.string(), z.any()).optional(),
}).refine((v) => v.text !== undefined || v.content !== undefined, {
  message: 'Requiere text o content',
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
  processSchema,
  sectionParamSchema,
  updateSectionBodySchema,
  pauseSchema,
  signSchema,
};
