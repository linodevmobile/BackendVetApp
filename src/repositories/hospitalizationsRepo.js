// Hospitalizations: per-patient history, enriched with the consultation that
// triggered the admission (so the UI can link to it without an extra request).

async function listByPatient(supabase, patientId, { limit = 20, offset = 0 } = {}) {
  const { data, error, count } = await supabase
    .from('hospitalizations')
    .select(`
      id, status, admission_date, discharge_date, notes, created_at,
      consultation:consultations (
        id, type, primary_diagnosis,
        veterinarian:veterinarians ( id, full_name )
      )
    `, { count: 'exact' })
    .eq('patient_id', patientId)
    .order('admission_date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { items: data || [], total: count || 0 };
}

module.exports = { listByPatient };
