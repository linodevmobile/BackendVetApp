-- ============================================
-- Migration v2.5 — patient_preventive_care
-- ============================================
-- Unified table for vaccinations + dewormings (internal/external) per patient.
-- Reasons for unifying: same shape (name, applied_at, next_due_at), UI mixes
-- both in "Próximos recordatorios", single endpoint covers tab Salud + dashboard.
--
-- The "suggested plan" is NOT stored here — it lives as a static JSON catalog
-- (src/data/preventive_care_plans.json, WSAVA + regional Colombia). The catalog
-- is projected per patient at request time and cross-referenced with this table
-- to flag which items are already applied.
--
-- Idempotency guard: aborts if the table already exists.
-- ============================================

DO $guard$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'patient_preventive_care'
  ) THEN
    RAISE EXCEPTION 'Migration v2.5 already applied: patient_preventive_care exists';
  END IF;
END
$guard$;

-- 1. Enums
CREATE TYPE preventive_care_kind AS ENUM (
  'vaccination',
  'deworming_internal',
  'deworming_external'
);

CREATE TYPE preventive_care_mode AS ENUM ('plan', 'manual');

-- 2. Table
CREATE TABLE patient_preventive_care (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  kind preventive_care_kind NOT NULL,
  name TEXT NOT NULL,
  product TEXT,
  applied_at DATE,
  next_due_at DATE,
  mode preventive_care_mode NOT NULL DEFAULT 'manual',
  applied_by_vet_id UUID REFERENCES veterinarians(id),
  consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_prevcare_at_least_one_date CHECK (
    applied_at IS NOT NULL OR next_due_at IS NOT NULL
  )
);

-- 3. Indexes
CREATE INDEX idx_prevcare_patient_due
  ON patient_preventive_care(patient_id, next_due_at)
  WHERE next_due_at IS NOT NULL;

CREATE INDEX idx_prevcare_patient_kind
  ON patient_preventive_care(patient_id, kind);

CREATE INDEX idx_prevcare_patient_applied
  ON patient_preventive_care(patient_id, applied_at DESC)
  WHERE applied_at IS NOT NULL;

-- 4. updated_at trigger
CREATE OR REPLACE FUNCTION touch_prevcare_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevcare_updated_at
  BEFORE UPDATE ON patient_preventive_care
  FOR EACH ROW EXECUTE FUNCTION touch_prevcare_updated_at();

-- 5. RLS — vet sees rows for patients they created
ALTER TABLE patient_preventive_care ENABLE ROW LEVEL SECURITY;

CREATE POLICY prevcare_vet_all ON patient_preventive_care
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients p
       WHERE p.id = patient_preventive_care.patient_id
         AND p.created_by_vet_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients p
       WHERE p.id = patient_preventive_care.patient_id
         AND p.created_by_vet_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON patient_preventive_care
  TO anon, authenticated, service_role;
