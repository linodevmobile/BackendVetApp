async function add(supabase, vetId, patientId) {
  const { error } = await supabase
    .from('vet_favorite_patients')
    .upsert({ vet_id: vetId, patient_id: patientId }, { onConflict: 'vet_id,patient_id' });
  if (error) throw error;
  return { vet_id: vetId, patient_id: patientId };
}

async function remove(supabase, vetId, patientId) {
  const { error } = await supabase
    .from('vet_favorite_patients')
    .delete()
    .eq('vet_id', vetId)
    .eq('patient_id', patientId);
  if (error) throw error;
}

async function list(supabase, vetId) {
  const { data, error } = await supabase
    .from('vet_favorite_patients')
    .select('patient:patients (*)')
    .eq('vet_id', vetId);
  if (error) throw error;
  return (data || []).map((row) => row.patient).filter(Boolean);
}

module.exports = { add, remove, list };
