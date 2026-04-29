// Repository for `patient_measurements`. Source-of-truth for clinical events
// (weight + vitals + BCS). Sync helpers keep the table in step with consultations.

const VITALS_FIELDS = ['weight_kg', 'temperature_c', 'heart_rate_bpm', 'respiratory_rate_rpm'];
const VALID_METRICS = [...VITALS_FIELDS, 'bcs'];

function pickNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function buildMeasurement({ vitalsContent, physicalContent }) {
  const m = {
    weight_kg: pickNumber(vitalsContent?.weight_kg),
    temperature_c: pickNumber(vitalsContent?.temperature_c),
    heart_rate_bpm: pickNumber(vitalsContent?.heart_rate_bpm),
    respiratory_rate_rpm: pickNumber(vitalsContent?.respiratory_rate_rpm),
    bcs: physicalContent?.bcs ?? null,
  };
  const hasAny = Object.values(m).some((v) => v !== null && v !== '');
  return hasAny ? m : null;
}

// Reads vitals + physical_exam from a consultation and upserts a measurement row.
// Idempotent via UNIQUE INDEX uq_measurements_consultation (consultation_id WHERE source='consultation').
async function syncFromConsultation(supabase, { consultationId }) {
  const { data: consultation, error: cErr } = await supabase
    .from('consultations')
    .select('id, patient_id, veterinarian_id, signed_at, status')
    .eq('id', consultationId)
    .maybeSingle();
  if (cErr) throw cErr;
  if (!consultation) return null;

  const { data: sections, error: sErr } = await supabase
    .from('consultation_sections')
    .select('section, content')
    .eq('consultation_id', consultationId)
    .in('section', ['vitals', 'physical_exam']);
  if (sErr) throw sErr;

  const vitals = sections?.find((s) => s.section === 'vitals')?.content || null;
  const physical = sections?.find((s) => s.section === 'physical_exam')?.content || null;

  const measurement = buildMeasurement({ vitalsContent: vitals, physicalContent: physical });
  if (!measurement) return null;

  const row = {
    patient_id: consultation.patient_id,
    consultation_id: consultation.id,
    measured_at: consultation.signed_at || new Date().toISOString(),
    measured_by_vet_id: consultation.veterinarian_id,
    source: 'consultation',
    ...measurement,
  };

  // PostgREST onConflict cannot target the partial unique index
  // (uq_measurements_consultation WHERE source='consultation'), so do a
  // manual lookup then update or insert.
  const { data: existing, error: lookupErr } = await supabase
    .from('patient_measurements')
    .select('id')
    .eq('consultation_id', consultation.id)
    .eq('source', 'consultation')
    .maybeSingle();
  if (lookupErr) throw lookupErr;

  if (existing) {
    const { data, error } = await supabase
      .from('patient_measurements')
      .update(row)
      .eq('id', existing.id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('patient_measurements')
    .insert(row)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

async function listByPatient(supabase, patientId, { metric = 'weight_kg', limit = 20, offset = 0 } = {}) {
  const column = VALID_METRICS.includes(metric) ? metric : 'weight_kg';
  let query = supabase
    .from('patient_measurements')
    .select('*', { count: 'exact' })
    .eq('patient_id', patientId)
    .not(column, 'is', null)
    .order('measured_at', { ascending: false })
    .range(offset, offset + limit - 1);
  const { data, error, count } = await query;
  if (error) throw error;
  return { items: data || [], total: count || 0 };
}

async function createManual(supabase, { patientId, vetId, measurement, measuredAt, notes }) {
  const row = {
    patient_id: patientId,
    measured_at: measuredAt || new Date().toISOString(),
    measured_by_vet_id: vetId,
    source: 'manual',
    ...measurement,
    notes: notes || null,
  };
  const { data, error } = await supabase
    .from('patient_measurements')
    .insert(row)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

module.exports = {
  syncFromConsultation,
  listByPatient,
  createManual,
  VALID_METRICS,
};
