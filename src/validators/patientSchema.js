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

const updateSchema = z.object({
  name: z.string().optional(),
  species: speciesEnum.optional(),
  breed: z.string().optional(),
  sex: sexEnum.optional(),
  date_of_birth: z.string().optional(),
  weight_kg: z.number().positive().optional(),
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

module.exports = { createSchema, updateSchema, listQuerySchema };
