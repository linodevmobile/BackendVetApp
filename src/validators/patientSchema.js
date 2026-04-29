const { z } = require('zod');

const speciesEnum = z.enum(['dog', 'cat', 'exotic']);
const sexEnum = z.enum(['male', 'female']);

const createSchema = z.object({
  name: z.string().min(1),
  species: speciesEnum,
  breed: z.string().optional(),
  sex: sexEnum,
  date_of_birth: z.string().optional(),
  age_years: z.number().int().min(0).max(60).optional(),
  weight_kg: z.number().positive().optional(),
  microchip: z.string().optional(),
  owner_name: z.string().min(1),
  owner_phone: z.string().optional(),
  owner_email: z.string().email().optional(),
  owner_address: z.string().optional(),
}).refine((v) => v.date_of_birth || typeof v.age_years === 'number', {
  message: 'Debe indicarse date_of_birth o age_years',
});

// weight_kg removed: weight is now tracked via patient_measurements
// (synced on consultation sign). patients.weight_kg is auto-cached by trigger.
const updateSchema = z.object({
  name: z.string().optional(),
  species: speciesEnum.optional(),
  breed: z.string().optional(),
  sex: sexEnum.optional(),
  date_of_birth: z.string().optional(),
  microchip: z.string().optional(),
  owner_name: z.string().optional(),
  owner_phone: z.string().optional(),
  owner_email: z.string().email().optional(),
  owner_address: z.string().optional(),
}).refine((v) => Object.keys(v).length > 0, { message: 'Requiere al menos un campo' });

const listQuerySchema = z.object({
  search: z.string().optional(),
  filter: z.enum(['all', 'today_agenda', 'favorites', 'recent']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

const measurementsListQuerySchema = z.object({
  metric: z.enum(['weight_kg', 'temperature_c', 'heart_rate_bpm', 'respiratory_rate_rpm', 'bcs'])
    .optional()
    .default('weight_kg'),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

const timelineListQuerySchema = z.object({
  type: z.enum(['all', 'consultation', 'attachment']).optional().default('all'),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

const hospitalizationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

const appointmentsQuerySchema = z.object({
  upcoming: z.coerce.boolean().optional().default(true),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

const attachmentsQuerySchema = z.object({
  category: z.enum(['laboratory', 'image', 'prescription', 'other']).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

const attachmentUploadSchema = z.object({
  category: z.enum(['laboratory', 'image', 'prescription', 'other']),
  label: z.string().optional(),
});

const preventiveCareKindEnum = z.enum(['vaccination', 'deworming_internal', 'deworming_external']);
const preventiveCareModeEnum = z.enum(['plan', 'manual']);

const preventiveCareListQuerySchema = z.object({
  kind: preventiveCareKindEnum.optional(),
  upcoming: z.coerce.boolean().optional().default(false),
  days: z.coerce.number().int().min(1).max(365).optional().default(90),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

const preventiveCareCreateSchema = z.object({
  kind: preventiveCareKindEnum,
  name: z.string().min(1),
  product: z.string().optional(),
  applied_at: z.string().optional(),
  next_due_at: z.string().optional(),
  mode: preventiveCareModeEnum.optional().default('manual'),
  consultation_id: z.string().uuid().optional(),
  notes: z.string().optional(),
}).refine((v) => v.applied_at || v.next_due_at, {
  message: 'Debe indicarse applied_at o next_due_at',
});

const preventiveCareUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  product: z.string().optional(),
  applied_at: z.string().optional(),
  next_due_at: z.string().optional(),
  mode: preventiveCareModeEnum.optional(),
  consultation_id: z.string().uuid().optional(),
  notes: z.string().optional(),
}).refine((v) => Object.keys(v).length > 0, { message: 'Requiere al menos un campo' });

module.exports = {
  createSchema,
  updateSchema,
  listQuerySchema,
  measurementsListQuerySchema,
  timelineListQuerySchema,
  hospitalizationsQuerySchema,
  appointmentsQuerySchema,
  attachmentsQuerySchema,
  attachmentUploadSchema,
  preventiveCareListQuerySchema,
  preventiveCareCreateSchema,
  preventiveCareUpdateSchema,
};
