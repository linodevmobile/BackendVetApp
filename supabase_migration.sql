-- Crear tabla de consultas veterinarias
CREATE TABLE IF NOT EXISTS consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  anamnesis JSONB,
  examen_fisico JSONB,
  abordaje_diagnostico JSONB,
  diagnostico_presuntivo JSONB,
  diagnostico_definitivo JSONB,
  plan_terapeutico JSONB,
  pronostico_evolucion JSONB
);

-- Crear bucket de storage para audios
INSERT INTO storage.buckets (id, name, public) VALUES ('consultations-audio', 'consultations-audio', true) ON CONFLICT (id) DO NOTHING;

-- Políticas de acceso
CREATE POLICY "Allow public uploads" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'consultations-audio');
CREATE POLICY "Allow public reads" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'consultations-audio');
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations" ON consultations FOR ALL TO anon USING (true) WITH CHECK (true);
