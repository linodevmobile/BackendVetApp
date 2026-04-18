-- ============================================
-- VetApp MVP - Database Schema v2
-- PostgreSQL / Supabase
-- ============================================
-- Naming: tables and columns in English
-- Clinical section keys mapped:
--   anamnesis         → anamnesis
--   examen_fisico     → physical_exam
--   abordaje_diagnostico → diagnostic_approach
--   diagnostico_presuntivo → presumptive_diagnosis
--   diagnostico_definitivo → definitive_diagnosis
--   plan_terapeutico  → treatment_plan
--   pronostico_evolucion → prognosis
-- ============================================

-- =====================
-- 1. ENUMS
-- =====================

CREATE TYPE consultation_status AS ENUM ('in_progress', 'completed');

CREATE TYPE consultation_result AS ENUM ('discharge', 'hospitalization', 'deceased', 'referred');

CREATE TYPE clinical_section AS ENUM (
  'anamnesis',
  'physical_exam',
  'diagnostic_approach',
  'presumptive_diagnosis',
  'definitive_diagnosis',
  'treatment_plan',
  'prognosis'
);

CREATE TYPE order_type AS ENUM ('medication', 'fluid', 'procedure');

CREATE TYPE order_status AS ENUM ('active', 'completed', 'cancelled');

CREATE TYPE treatment_event_status AS ENUM ('pending', 'applied', 'skipped');

CREATE TYPE hospitalization_status AS ENUM ('active', 'discharged', 'deceased');

CREATE TYPE file_type AS ENUM ('audio', 'image', 'pdf', 'other');

-- =====================
-- 2. DROP OLD TABLE
-- =====================

DROP TABLE IF EXISTS consultations;

-- =====================
-- 3. VETERINARIANS
-- =====================
-- Linked to Supabase Auth (id = auth.users.id)

CREATE TABLE veterinarians (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  license_number TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================
-- 4. PATIENTS
-- =====================

CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  species TEXT NOT NULL,
  breed TEXT,
  sex TEXT NOT NULL CHECK (sex IN ('male', 'female')),
  date_of_birth DATE,
  weight_kg DECIMAL(6,2),
  microchip TEXT,
  owner_name TEXT NOT NULL,
  owner_phone TEXT,
  owner_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================
-- 5. CONSULTATIONS
-- =====================
-- Structured clinical record (source of truth)

CREATE TABLE consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  veterinarian_id UUID NOT NULL REFERENCES veterinarians(id) ON DELETE RESTRICT,
  status consultation_status NOT NULL DEFAULT 'in_progress',
  result consultation_result,
  chief_complaint TEXT,
  primary_diagnosis TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================
-- 6. CONSULTATION DRAFTS (AI capture layer)
-- =====================
-- One row per consultation + section (upsert pattern)
-- JSON from AI is stored here, NOT as final clinical truth

CREATE TABLE consultation_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  section clinical_section NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  audio_url TEXT,
  transcription TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(consultation_id, section)
);

-- =====================
-- 7. MEDICAL ORDERS
-- =====================

CREATE TABLE medical_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE RESTRICT,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  type order_type NOT NULL,
  instructions TEXT,
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ,
  status order_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================
-- 8. ORDER MEDICATIONS
-- =====================

CREATE TABLE order_medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES medical_orders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  presentation TEXT,
  concentration TEXT,
  dose_mg_kg DECIMAL(8,3),
  patient_weight_kg DECIMAL(6,2),
  calculated_dose TEXT,
  route TEXT,
  frequency TEXT,
  duration_days INTEGER,
  start_time TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================
-- 9. TREATMENT EVENTS
-- =====================
-- Each scheduled application of a treatment (for hospitalization board)

CREATE TABLE treatment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES medical_orders(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status treatment_event_status NOT NULL DEFAULT 'pending',
  executed_by UUID REFERENCES veterinarians(id),
  executed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================
-- 10. HOSPITALIZATIONS
-- =====================

CREATE TABLE hospitalizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE RESTRICT,
  admission_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  discharge_date TIMESTAMPTZ,
  status hospitalization_status NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================
-- 11. FILES
-- =====================

CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
  type file_type NOT NULL,
  url TEXT NOT NULL,
  filename TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================
-- 12. INDEXES
-- =====================

CREATE INDEX idx_consultations_patient ON consultations(patient_id);
CREATE INDEX idx_consultations_vet ON consultations(veterinarian_id);
CREATE INDEX idx_consultations_status ON consultations(status);

CREATE INDEX idx_drafts_consultation ON consultation_drafts(consultation_id);

CREATE INDEX idx_orders_consultation ON medical_orders(consultation_id);
CREATE INDEX idx_orders_patient ON medical_orders(patient_id);
CREATE INDEX idx_orders_status ON medical_orders(status);

CREATE INDEX idx_medications_order ON order_medications(order_id);

CREATE INDEX idx_events_order ON treatment_events(order_id);
CREATE INDEX idx_events_scheduled ON treatment_events(scheduled_at);
CREATE INDEX idx_events_status ON treatment_events(status);

CREATE INDEX idx_hospitalizations_patient ON hospitalizations(patient_id);
CREATE INDEX idx_hospitalizations_status ON hospitalizations(status);

CREATE INDEX idx_files_patient ON files(patient_id);
CREATE INDEX idx_files_consultation ON files(consultation_id);

-- =====================
-- 13. UPDATED_AT TRIGGER
-- =====================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_veterinarians_updated
  BEFORE UPDATE ON veterinarians
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_patients_updated
  BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_consultations_updated
  BEFORE UPDATE ON consultations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_drafts_updated
  BEFORE UPDATE ON consultation_drafts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_orders_updated
  BEFORE UPDATE ON medical_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_hospitalizations_updated
  BEFORE UPDATE ON hospitalizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================
-- 14. ROW LEVEL SECURITY
-- =====================
-- MVP: permissive policies for anon (current backend setup)
-- TODO: Switch to authenticated + service_role when auth is implemented

ALTER TABLE veterinarians ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitalizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all" ON veterinarians FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON patients FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON consultations FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON consultation_drafts FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON medical_orders FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON order_medications FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON treatment_events FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON hospitalizations FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON files FOR ALL TO anon USING (true) WITH CHECK (true);
