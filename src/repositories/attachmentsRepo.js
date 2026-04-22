async function create(supabase, { consultationId, section, storagePath, mimeType, label, sizeBytes }) {
  const { data, error } = await supabase
    .from('consultation_attachments')
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
    .from('consultation_attachments')
    .select('*')
    .eq('consultation_id', consultationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function remove(supabase, id) {
  const { error } = await supabase
    .from('consultation_attachments')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

module.exports = { create, listByConsultation, remove };
