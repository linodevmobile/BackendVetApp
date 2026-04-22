async function create(supabase, { patientId, label, severity }) {
  const { data, error } = await supabase
    .from('patient_alerts')
    .insert({ patient_id: patientId, label, severity: severity || 'info', active: true })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

async function listByPatient(supabase, patientId) {
  const { data, error } = await supabase
    .from('patient_alerts')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function deactivate(supabase, id) {
  const { data, error } = await supabase
    .from('patient_alerts')
    .update({ active: false })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

async function remove(supabase, id) {
  const { error } = await supabase
    .from('patient_alerts')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

module.exports = { create, listByPatient, deactivate, remove };
