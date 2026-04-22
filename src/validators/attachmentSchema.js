const { z } = require('zod');
const { VALID_SECTIONS } = require('../services/promptRouter');

const uploadSchema = z.object({
  section: z.enum(VALID_SECTIONS).optional(),
  label: z.string().optional(),
});

module.exports = { uploadSchema };
