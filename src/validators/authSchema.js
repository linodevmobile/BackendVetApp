const { z } = require('zod');

const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Password mínimo 6 caracteres'),
  full_name: z.string().min(2, 'Nombre requerido'),
  license_number: z.string().optional(),
  phone: z.string().optional(),
  salutation: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Password requerido'),
});

module.exports = { registerSchema, loginSchema };
