-- ============================================
-- Migration v2.2 — clinical_section enum overhaul
-- ============================================
-- Changes:
--   - Removes 'presumptive_diagnosis' and 'definitive_diagnosis'.
--   - Adds 'clinical_diagnosis' (replaces both above; combined JSON in `content`/`ai_suggested`).
--   - Adds 'food', 'vitals', 'treatment' (tap-only — frontend writes structured `content`,
--     no AI utility for these).
--
-- Existing rows in consultation_sections / consultation_attachments referencing
-- 'presumptive_diagnosis' or 'definitive_diagnosis' are remapped to 'clinical_diagnosis'.
-- If both rows exist for the same consultation, their content/ai_suggested/text/transcription
-- are merged INTO the presumptive row before the definitive row is deleted (avoids the
-- (consultation_id, section) UNIQUE violation on cast).
--
-- Idempotency guard: aborts if 'clinical_diagnosis' already exists in the enum.
-- Run once on dev / staging.
-- ============================================

-- Guard: bail out if already applied.
DO $guard$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'clinical_section'
      AND e.enumlabel = 'clinical_diagnosis'
  ) THEN
    RAISE EXCEPTION
      'Migration v2.2_sections is already applied (clinical_diagnosis exists in clinical_section enum). Aborting.';
  END IF;
END
$guard$;

BEGIN;

-- 1. Merge any (presumptive_diagnosis + definitive_diagnosis) pair belonging to the
--    same consultation into the presumptive row, so the upcoming USING cast doesn't
--    collide with the (consultation_id, section) UNIQUE constraint.
DO $merge$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT consultation_id
    FROM consultation_sections
    WHERE section IN ('presumptive_diagnosis', 'definitive_diagnosis')
    GROUP BY consultation_id
    HAVING COUNT(DISTINCT section) = 2
  LOOP
    UPDATE consultation_sections p
       SET ai_suggested  = COALESCE(p.ai_suggested, '{}'::jsonb)
                          || COALESCE(d.ai_suggested, '{}'::jsonb),
           content       = COALESCE(p.content, '{}'::jsonb)
                          || COALESCE(d.content, '{}'::jsonb),
           text          = COALESCE(p.text, '')
                          || CASE
                               WHEN COALESCE(p.text, '') <> '' AND COALESCE(d.text, '') <> ''
                                 THEN E'\n\n'
                               ELSE ''
                             END
                          || COALESCE(d.text, ''),
           transcription = COALESCE(p.transcription, '')
                          || CASE
                               WHEN COALESCE(p.transcription, '') <> '' AND COALESCE(d.transcription, '') <> ''
                                 THEN E'\n\n'
                               ELSE ''
                             END
                          || COALESCE(d.transcription, ''),
           processed_at  = now()
      FROM consultation_sections d
     WHERE p.consultation_id = r.consultation_id
       AND p.section = 'presumptive_diagnosis'
       AND d.consultation_id = r.consultation_id
       AND d.section = 'definitive_diagnosis';

    DELETE FROM consultation_sections
     WHERE consultation_id = r.consultation_id
       AND section = 'definitive_diagnosis';
  END LOOP;
END
$merge$;

-- 2. Swap the enum type. Postgres doesn't allow dropping enum values, so we rename
--    the old type, create the new one, and recast columns with explicit value mapping.
ALTER TYPE clinical_section RENAME TO clinical_section__old;

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

ALTER TABLE consultation_sections
  ALTER COLUMN section TYPE clinical_section
  USING (
    CASE section::text
      WHEN 'presumptive_diagnosis' THEN 'clinical_diagnosis'
      WHEN 'definitive_diagnosis'  THEN 'clinical_diagnosis'
      ELSE section::text
    END
  )::clinical_section;

ALTER TABLE consultation_attachments
  ALTER COLUMN section TYPE clinical_section
  USING (
    CASE section::text
      WHEN 'presumptive_diagnosis' THEN 'clinical_diagnosis'
      WHEN 'definitive_diagnosis'  THEN 'clinical_diagnosis'
      ELSE section::text
    END
  )::clinical_section;

DROP TYPE clinical_section__old;

COMMIT;
