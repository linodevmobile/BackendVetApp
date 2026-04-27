-- ============================================
-- VetApp Backend — Database Schema v2 (consolidated)
-- PostgreSQL / Supabase
-- ============================================
-- Naming: tables, columns and enums in English.
-- UI-facing labels (Spanish) live in src/utils/sectionLabels.js for each section's
-- AI-output keys; routing identifiers (section enum, prompt keys, URL params) stay
-- in English end-to-end.
-- Hybrid section storage: transcription (raw) + ai_suggested (JSONB audit
-- trail) + text (vet-editable final, what UI shows/saves) + content (optional).
-- RLS: authenticated policies isolate data per vet.
-- ============================================
-- RESET (dev only — drop all app objects)
-- Supabase reserves the `auth` and `storage` schemas; we only touch `public`.
-- ============================================

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, service_role;

-- =====================
-- 1. ENUMS
-- =====================

CREATE TYPE patient_species AS ENUM ('dog', 'cat', 'exotic');
CREATE TYPE patient_sex AS ENUM ('male', 'female');

CREATE TYPE consultation_type AS ENUM ('routine', 'surgery', 'emergency');
CREATE TYPE consultation_status AS ENUM ('in_progress', 'paused', 'signed');
CREATE TYPE consultation_result AS ENUM ('discharge', 'hospitalization', 'deceased', 'referred');
CREATE TYPE consultation_pause_reason AS ENUM ('labs', 'imaging', 'procedure', 'owner', 'other');

CREATE TYPE clinical_section AS ENUM (
  'chief_complaint',
  'anamnesis',
  'physical_exam',
  'problems',
  'diagnostic_approach',
  'complementary_exams',
  'clinical_diagnosis',
  'prescription',
  'prognosis',
  'food',
  'vitals',
  'treatment'
);

CREATE TYPE appointment_status AS ENUM ('scheduled', 'now', 'completed', 'cancelled');
CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'critical');

-- Fase 2 (hospitalization) enums kept for forward compatibility
CREATE TYPE order_type AS ENUM ('medication', 'fluid', 'procedure');
CREATE TYPE order_status AS ENUM ('active', 'completed', 'cancelled');
CREATE TYPE treatment_event_status AS ENUM ('pending', 'applied', 'skipped');
CREATE TYPE hospitalization_status AS ENUM ('active', 'discharged', 'deceased');
CREATE TYPE file_type AS ENUM ('audio', 'image', 'pdf', 'other');

-- =====================
-- 2. VETERINARIANS
-- =====================
-- Linked 1:1 to Supabase Auth user (id = auth.users.id)

CREATE TABLE veterinarians (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  license_number TEXT,
  phone TEXT,
  salutation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================
-- 3. PATIENTS
-- =====================

CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  species patient_species NOT NULL,
  breed TEXT,
  sex patient_sex NOT NULL,
  date_of_birth DATE,
  weight_kg DECIMAL(6,2),
  microchip TEXT,
  owner_name TEXT NOT NULL,
  owner_phone TEXT,
  owner_email TEXT,
  owner_address TEXT,
  created_by_vet_id UUID NOT NULL REFERENCES veterinarians(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================
-- 4. PATIENT ALERTS
-- =====================

CREATE TABLE patient_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  severity alert_severity NOT NULL DEFAULT 'info',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================
-- 5. VET FAVORITE PATIENTS (M:N)
-- =====================

CREATE TABLE vet_favorite_patients (
  vet_id UUID NOT NULL REFERENCES veterinarians(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (vet_id, patient_id)
);

-- =====================
-- 6. CONSULTATIONS
-- =====================

CREATE TABLE consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  veterinarian_id UUID NOT NULL REFERENCES veterinarians(id) ON DELETE RESTRICT,
  type consultation_type NOT NULL DEFAULT 'routine',
  status consultation_status NOT NULL DEFAULT 'in_progress',
  summary TEXT,
  primary_diagnosis TEXT,
  result consultation_result,
  pause_reason consultation_pause_reason,
  pause_note TEXT,
  paused_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_paused_fields CHECK (
    status <> 'paused'
    OR (pause_reason IS NOT NULL AND paused_at IS NOT NULL)
  )
);

-- =====================
-- 7. CONSULTATION SECTIONS (AI capture + editable text)
-- =====================
-- One row per (consultation, section). Hybrid shape:
--   transcription  — raw audio transcription
--   ai_suggested   — JSONB audit trail from LLM (never mutated by vet edits)
--   text           — final vet-editable text shown in UI
--   content        — optional structured form (mirrors ai_suggested after edits)

CREATE TABLE consultation_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  section clinical_section NOT NULL,
  transcription TEXT,
  ai_suggested JSONB NOT NULL DEFAULT '{}'::jsonb,
  text TEXT,
  content JSONB,
  audio_url TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (consultation_id, section)
);

-- =====================
-- 8. CONSULTATION ATTACHMENTS
-- =====================

CREATE TABLE consultation_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  section clinical_section,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  label TEXT,
  size_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================
-- 9. APPOINTMENTS
-- =====================

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  veterinarian_id UUID NOT NULL REFERENCES veterinarians(id) ON DELETE RESTRICT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  reason TEXT,
  status appointment_status NOT NULL DEFAULT 'scheduled',
  urgent BOOLEAN NOT NULL DEFAULT false,
  consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================
-- 10. FASE 2 (hospitalization) — placeholders, not wired to API yet
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
-- 11. INDEXES
-- =====================

CREATE INDEX idx_patients_vet ON patients(created_by_vet_id);
CREATE INDEX idx_patients_name ON patients(name);

CREATE INDEX idx_alerts_patient_active ON patient_alerts(patient_id, active);

CREATE INDEX idx_favs_vet ON vet_favorite_patients(vet_id);

CREATE INDEX idx_consultations_patient ON consultations(patient_id);
CREATE INDEX idx_consultations_vet_status ON consultations(veterinarian_id, status);
CREATE INDEX idx_consultations_signed_at ON consultations(signed_at DESC) WHERE status = 'signed';

CREATE INDEX idx_sections_consultation ON consultation_sections(consultation_id);
CREATE INDEX idx_sections_consultation_section ON consultation_sections(consultation_id, section);

CREATE INDEX idx_attachments_consultation ON consultation_attachments(consultation_id);

CREATE INDEX idx_appointments_vet_date ON appointments(veterinarian_id, scheduled_at);
CREATE INDEX idx_appointments_status ON appointments(status);

CREATE INDEX idx_orders_consultation ON medical_orders(consultation_id);
CREATE INDEX idx_orders_patient ON medical_orders(patient_id);
CREATE INDEX idx_medications_order ON order_medications(order_id);
CREATE INDEX idx_events_order ON treatment_events(order_id);
CREATE INDEX idx_events_scheduled ON treatment_events(scheduled_at);
CREATE INDEX idx_hospitalizations_patient ON hospitalizations(patient_id);
CREATE INDEX idx_hospitalizations_status ON hospitalizations(status);
CREATE INDEX idx_files_patient ON files(patient_id);
CREATE INDEX idx_files_consultation ON files(consultation_id);

-- =====================
-- 12. UPDATED_AT TRIGGER
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

CREATE TRIGGER trg_sections_updated
  BEFORE UPDATE ON consultation_sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_appointments_updated
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_orders_updated
  BEFORE UPDATE ON medical_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_hospitalizations_updated
  BEFORE UPDATE ON hospitalizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================
-- 13. ROW LEVEL SECURITY
-- =====================
-- Authenticated vets only see their own records.
-- Backend uses service_role key for privileged cross-vet reads when needed.

ALTER TABLE veterinarians ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vet_favorite_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitalizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- veterinarians: a vet can see/update only their own profile
CREATE POLICY vet_self_select ON veterinarians
  FOR SELECT TO authenticated
  USING (id = auth.uid());
CREATE POLICY vet_self_update ON veterinarians
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- patients: creator vet OR vet with favorite can read; only creator mutates
CREATE POLICY patients_vet_read ON patients
  FOR SELECT TO authenticated
  USING (
    created_by_vet_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM vet_favorite_patients f
      WHERE f.vet_id = auth.uid() AND f.patient_id = patients.id
    )
  );
CREATE POLICY patients_vet_write ON patients
  FOR ALL TO authenticated
  USING (created_by_vet_id = auth.uid())
  WITH CHECK (created_by_vet_id = auth.uid());

-- patient_alerts: inherit patient ownership
CREATE POLICY alerts_vet_all ON patient_alerts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_alerts.patient_id
        AND p.created_by_vet_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_alerts.patient_id
        AND p.created_by_vet_id = auth.uid()
    )
  );

-- vet_favorite_patients: vet owns their favorites
CREATE POLICY favs_vet_all ON vet_favorite_patients
  FOR ALL TO authenticated
  USING (vet_id = auth.uid())
  WITH CHECK (vet_id = auth.uid());

-- consultations: owner vet only
CREATE POLICY consultations_vet_all ON consultations
  FOR ALL TO authenticated
  USING (veterinarian_id = auth.uid())
  WITH CHECK (veterinarian_id = auth.uid());

-- consultation_sections: via consultation ownership
CREATE POLICY sections_vet_all ON consultation_sections
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.id = consultation_sections.consultation_id
        AND c.veterinarian_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.id = consultation_sections.consultation_id
        AND c.veterinarian_id = auth.uid()
    )
  );

-- consultation_attachments: via consultation ownership
CREATE POLICY attachments_vet_all ON consultation_attachments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.id = consultation_attachments.consultation_id
        AND c.veterinarian_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.id = consultation_attachments.consultation_id
        AND c.veterinarian_id = auth.uid()
    )
  );

-- appointments: owner vet only
CREATE POLICY appointments_vet_all ON appointments
  FOR ALL TO authenticated
  USING (veterinarian_id = auth.uid())
  WITH CHECK (veterinarian_id = auth.uid());

-- Fase 2 tables: restrict via consultation ownership where possible
CREATE POLICY orders_vet_all ON medical_orders
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.id = medical_orders.consultation_id
        AND c.veterinarian_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.id = medical_orders.consultation_id
        AND c.veterinarian_id = auth.uid()
    )
  );

CREATE POLICY order_meds_vet_all ON order_medications
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM medical_orders mo
      JOIN consultations c ON c.id = mo.consultation_id
      WHERE mo.id = order_medications.order_id
        AND c.veterinarian_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM medical_orders mo
      JOIN consultations c ON c.id = mo.consultation_id
      WHERE mo.id = order_medications.order_id
        AND c.veterinarian_id = auth.uid()
    )
  );

CREATE POLICY events_vet_all ON treatment_events
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM medical_orders mo
      JOIN consultations c ON c.id = mo.consultation_id
      WHERE mo.id = treatment_events.order_id
        AND c.veterinarian_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM medical_orders mo
      JOIN consultations c ON c.id = mo.consultation_id
      WHERE mo.id = treatment_events.order_id
        AND c.veterinarian_id = auth.uid()
    )
  );

CREATE POLICY hospitalizations_vet_all ON hospitalizations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.id = hospitalizations.consultation_id
        AND c.veterinarian_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.id = hospitalizations.consultation_id
        AND c.veterinarian_id = auth.uid()
    )
  );

CREATE POLICY files_vet_all ON files
  FOR ALL TO authenticated
  USING (
    (patient_id IS NULL OR EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = files.patient_id AND p.created_by_vet_id = auth.uid()
    ))
    AND (consultation_id IS NULL OR EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.id = files.consultation_id AND c.veterinarian_id = auth.uid()
    ))
  )
  WITH CHECK (
    (patient_id IS NULL OR EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = files.patient_id AND p.created_by_vet_id = auth.uid()
    ))
    AND (consultation_id IS NULL OR EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.id = files.consultation_id AND c.veterinarian_id = auth.uid()
    ))
  );

-- =====================
-- 14. STORAGE BUCKETS
-- =====================
-- Buckets are managed via Supabase API/Dashboard but insert is idempotent here.

INSERT INTO storage.buckets (id, name, public)
VALUES ('consultations-audio', 'consultations-audio', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('consultation-attachments', 'consultation-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- =====================
-- 15. ROLE GRANTS
-- =====================
-- Required after DROP SCHEMA: PostgREST roles (anon/authenticated/service_role)
-- lose access when schema is recreated. Without these grants, queries via the
-- Supabase REST API return empty even with RLS disabled.

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role;
