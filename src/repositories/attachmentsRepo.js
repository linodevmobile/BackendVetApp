async function create(supabase, { consultationId, section, storagePath, mimeType, label, sizeBytes }) {
  const { data, error } = await supabase
    .from('attachments')
    .insert({
      consultation_id: consultationId,
      section: section || null,
      storage_path: storagePath,
      mime_type: mimeType || null,
      label: label || null,
      size_bytes: sizeBytes || null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

async function listByConsultation(supabase, consultationId) {
  const { data, error } = await supabase
    .from('attachments')
    .select('*')
    .eq('consultation_id', consultationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function remove(supabase, id) {
  const { error } = await supabase
    .from('attachments')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

async function listByPatient(supabase, patientId, { category, limit = 50, offset = 0 } = {}) {
  let query = supabase
    .from('attachments')
    .select(`
      id, label, mime_type, storage_path, section, category, size_bytes, created_at,
      consultation_id,
      consultation:consultations ( id, signed_at, type )
    `, { count: 'exact' })
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });
  if (category) query = query.eq('category', category);
  const { data, error, count } = await query.range(offset, offset + limit - 1);
  if (error) throw error;
  return { items: data || [], total: count || 0 };
}

async function createForPatient(supabase, { patientId, category, storagePath, mimeType, label, sizeBytes }) {
  const { data, error } = await supabase
    .from('attachments')
    .insert({
      patient_id: patientId,
      consultation_id: null,
      section: null,
      category: category || null,
      storage_path: storagePath,
      mime_type: mimeType || null,
      label: label || null,
      size_bytes: sizeBytes || null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

module.exports = { create, listByConsultation, listByPatient, createForPatient, remove };
