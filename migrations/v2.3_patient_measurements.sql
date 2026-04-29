-- ============================================
-- Migration v2.3 — patient_measurements
-- ============================================
-- Adds a dedicated table for clinical measurements (weight, vitals, BCS) so the
-- patient-detail screen can render historical charts without relying on the
-- ephemeral `consultation_sections.vitals.content` JSONB.
--
-- Design:
--   - One row per measurement event. Sources: 'consultation' | 'manual' | 'hospitalization'.
--   - At-most-one row per (consultation_id) when source='consultation' (UNIQUE partial index).
--     The API upserts on consultation sign; re-edits to vitals/physical_exam after
--     sign update the same row.
--   - patients.weight_kg becomes a derived cache, kept in sync by trigger so existing
--     code that reads `patient.weight_kg` (consultationsRepo.getById embed, GET /patients/:id)
--     keeps working unchanged.
--
-- Idempotency guard: aborts if the table already exists.
-- ============================================

DO $guard$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'patient_measurements'
  ) THEN
    RAISE EXCEPTION 'Migration v2.3 already applied: patient_measurements exists';
  END IF;
END
$guard$;

CREATE TABLE patient_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
  hospitalization_id UUID REFERENCES hospitalizations(id) ON DELETE SET NULL,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  measured_by_vet_id UUID REFERENCES veterinarians(id),
  source TEXT NOT NULL CHECK (source IN ('consultation','manual','hospitalization')),
  weight_kg DECIMAL(6,2),
  temperature_c DECIMAL(4,1),
  heart_rate_bpm INTEGER,
  respiratory_rate_rpm INTEGER,
  bcs TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_measurement_at_least_one CHECK (
    weight_kg IS NOT NULL OR temperature_c IS NOT NULL
    OR heart_rate_bpm IS NOT NULL OR respiratory_rate_rpm IS NOT NULL
    OR bcs IS NOT NULL
  )
);

CREATE INDEX idx_measurements_patient_date
  ON patient_measurements(patient_id, measured_at DESC);

CREATE INDEX idx_measurements_weight
  ON patient_measurements(patient_id, measured_at DESC)
  WHERE weight_kg IS NOT NULL;

CREATE UNIQUE INDEX uq_measurements_consultation
  ON patient_measurements(consultation_id)
  WHERE source = 'consultation';

-- Trigger: keep patients.weight_kg as cache of latest known weight.
-- Only updates when the new measurement is the most recent weight for the patient.
CREATE OR REPLACE FUNCTION sync_patient_weight_cache()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.weight_kg IS NOT NULL THEN
    UPDATE patients
       SET weight_kg = NEW.weight_kg
     WHERE id = NEW.patient_id
       AND NOT EXISTS (
         SELECT 1 FROM patient_measurements
          WHERE patient_id = NEW.patient_id
            AND weight_kg IS NOT NULL
            AND measured_at > NEW.measured_at
            AND id <> NEW.id
       );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_patient_weight
  AFTER INSERT OR UPDATE ON patient_measurements
  FOR EACH ROW EXECUTE FUNCTION sync_patient_weight_cache();

-- RLS: vet sees measurements for patients they created.
ALTER TABLE patient_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY measurements_vet_all ON patient_measurements
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients p
       WHERE p.id = patient_measurements.patient_id
         AND p.created_by_vet_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients p
       WHERE p.id = patient_measurements.patient_id
         AND p.created_by_vet_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON patient_measurements
  TO anon, authenticated, service_role;
