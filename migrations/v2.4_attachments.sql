-- ============================================
-- Migration v2.4 — attachments (rename + patient-level uploads)
-- ============================================
-- Renames `consultation_attachments` to `attachments` and lifts the constraint
-- that every file must hang off a consultation. Now every file belongs to a
-- patient (NOT NULL), and may optionally reference the consultation it was
-- uploaded during. Adds a `category` enum for UI grouping
-- (laboratory|image|prescription|other).
--
-- Migration is idempotent-guarded: aborts if the new table already exists.
-- ============================================

DO $guard$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='attachments') THEN
    RAISE EXCEPTION 'Migration v2.4 already applied: attachments table exists';
  END IF;
END
$guard$;

-- 1. category enum
CREATE TYPE attachment_category AS ENUM ('laboratory','image','prescription','other');

-- 2. add patient_id (nullable for backfill)
ALTER TABLE consultation_attachments
  ADD COLUMN patient_id UUID REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE consultation_attachments
  ADD COLUMN category attachment_category;

-- 3. backfill patient_id from consultations
UPDATE consultation_attachments ca
   SET patient_id = c.patient_id
  FROM consultations c
 WHERE ca.consultation_id = c.id
   AND ca.patient_id IS NULL;

-- 4. enforce patient_id NOT NULL
ALTER TABLE consultation_attachments
  ALTER COLUMN patient_id SET NOT NULL;

-- 5. drop NOT NULL on consultation_id and switch to ON DELETE SET NULL
--    (so deleting a consultation does NOT lose patient-attached files)
ALTER TABLE consultation_attachments
  ALTER COLUMN consultation_id DROP NOT NULL;

ALTER TABLE consultation_attachments
  DROP CONSTRAINT consultation_attachments_consultation_id_fkey;

ALTER TABLE consultation_attachments
  ADD CONSTRAINT consultation_attachments_consultation_id_fkey
  FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE SET NULL;

-- 6. rename table → attachments
ALTER TABLE consultation_attachments RENAME TO attachments;

-- 7. trigger: auto-fill patient_id from consultation if caller provides only consultation_id
CREATE OR REPLACE FUNCTION fill_attachment_patient_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.patient_id IS NULL AND NEW.consultation_id IS NOT NULL THEN
    SELECT patient_id INTO NEW.patient_id
      FROM consultations WHERE id = NEW.consultation_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_fill_attachment_patient_id
  BEFORE INSERT ON attachments
  FOR EACH ROW EXECUTE FUNCTION fill_attachment_patient_id();

-- 8. indexes
DROP INDEX IF EXISTS idx_attachments_consultation;
CREATE INDEX idx_attachments_patient_date     ON attachments(patient_id, created_at DESC);
CREATE INDEX idx_attachments_consultation     ON attachments(consultation_id) WHERE consultation_id IS NOT NULL;
CREATE INDEX idx_attachments_patient_category ON attachments(patient_id, category) WHERE category IS NOT NULL;

-- 9. RLS — replace consultation-based policy with patient-based ownership
DROP POLICY IF EXISTS attachments_vet_all ON attachments;

CREATE POLICY attachments_vet_all ON attachments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients p
       WHERE p.id = attachments.patient_id
         AND p.created_by_vet_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients p
       WHERE p.id = attachments.patient_id
         AND p.created_by_vet_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON attachments TO anon, authenticated, service_role;
