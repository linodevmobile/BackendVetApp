const { z } = require('zod');

const createSchema = z.object({
  label: z.string().min(1),
  severity: z.enum(['info', 'warning', 'critical']).optional(),
});

module.exports = { createSchema };
