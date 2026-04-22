const { z } = require('zod');

const createSchema = z.object({
  patient_id: z.string().uuid(),
  scheduled_at: z.string().datetime(),
  reason: z.string().optional(),
  status: z.enum(['scheduled', 'now', 'completed', 'cancelled']).optional(),
  urgent: z.boolean().optional(),
});

const updateSchema = z.object({
  scheduled_at: z.string().datetime().optional(),
  reason: z.string().optional(),
  status: z.enum(['scheduled', 'now', 'completed', 'cancelled']).optional(),
  urgent: z.boolean().optional(),
  consultation_id: z.string().uuid().nullable().optional(),
}).refine((v) => Object.keys(v).length > 0, { message: 'Requiere al menos un campo' });

module.exports = { createSchema, updateSchema };
