-- Crear tabla de consultas veterinarias
CREATE TABLE IF NOT EXISTS consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  anamnesis JSONB,
  examen_fisico JSONB,
  problemas JSONB,
  diagnosticos_diferenciales JSONB,
  diagnostico JSONB,
  plan_terapeutico JSONB,
  pronostico_evolucion JSONB
);

-- Crear bucket de storage para audios (ejecutar desde el dashboard de Supabase)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('consultations-audio', 'consultations-audio', true);
