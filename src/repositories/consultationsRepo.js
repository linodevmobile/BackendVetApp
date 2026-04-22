async function listRecentSigned(supabase, vetId, limit = 4) {
  const { data, error } = await supabase
    .from('consultations')
    .select(`
      id, type, summary, primary_diagnosis, result, closed_at, created_at,
      patient:patients ( id, name, species )
    `)
    .eq('veterinarian_id', vetId)
    .eq('status', 'signed')
    .order('closed_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

async function listByStatus(supabase, vetId, status) {
  const { data, error } = await supabase
    .from('consultations')
    .select(`
      id, type, status, chief_complaint, summary, pause_reason, pause_note, paused_at, created_at,
      patient:patients ( id, name, species )
    `)
    .eq('veterinarian_id', vetId)
    .eq('status', status)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function getById(supabase, vetId, id) {
  const { data, error } = await supabase
    .from('consultations')
    .select(`
      *,
      patient:patients ( id, name, species, breed, sex, weight_kg, owner_name ),
      sections:consultation_sections ( * ),
      attachments:consultation_attachments ( * )
    `)
    .eq('id', id)
    .eq('veterinarian_id', vetId)
    .single();
  if (error) throw error;
  return data;
}

async function create(supabase, vetId, payload) {
  const insert = {
    patient_id: payload.patient_id,
    veterinarian_id: vetId,
    type: payload.type || 'routine',
    chief_complaint: payload.chief_complaint || null,
    status: 'in_progress',
  };
  const { data, error } = await supabase
    .from('consultations')
    .insert(insert)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

async function updateStatus(supabase, vetId, id, patch) {
  const { data, error } = await supabase
    .from('consultations')
    .update(patch)
    .eq('id', id)
    .eq('veterinarian_id', vetId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

async function pause(supabase, vetId, id, reason, note) {
  return updateStatus(supabase, vetId, id, {
    status: 'paused',
    pause_reason: reason,
    pause_note: note || null,
    paused_at: new Date().toISOString(),
  });
}

async function resume(supabase, vetId, id) {
  return updateStatus(supabase, vetId, id, {
    status: 'in_progress',
    pause_reason: null,
    pause_note: null,
    paused_at: null,
  });
}

async function sign(supabase, vetId, id, payload) {
  return updateStatus(supabase, vetId, id, {
    status: 'signed',
    result: payload.result,
    summary: payload.summary || null,
    primary_diagnosis: payload.primary_diagnosis || null,
    closed_at: new Date().toISOString(),
  });
}

module.exports = {
  listRecentSigned,
  listByStatus,
  getById,
  create,
  updateStatus,
  pause,
  resume,
  sign,
};
