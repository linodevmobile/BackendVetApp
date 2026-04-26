const { z } = require('zod');
const { VALID_SECTIONS } = require('../services/promptRouter');

const sectionEnum = z.enum(VALID_SECTIONS);

// Multipart body — section comes as string from form-data; audio handled by multer.
const processSectionSchema = z.object({
  section: sectionEnum,
  text_input: z.string().optional(),
});

module.exports = { processSectionSchema };
