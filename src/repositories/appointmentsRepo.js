async function listTodayForVet(supabase, vetId) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id, scheduled_at, reason, status, urgent, consultation_id,
      patient:patients ( id, name, species )
    `)
    .eq('veterinarian_id', vetId)
    .gte('scheduled_at', startOfDay)
    .lt('scheduled_at', endOfDay)
    .order('scheduled_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function create(supabase, vetId, payload) {
  const insert = {
    veterinarian_id: vetId,
    patient_id: payload.patient_id,
    scheduled_at: payload.scheduled_at,
    reason: payload.reason,
    status: payload.status || 'scheduled',
    urgent: !!payload.urgent,
  };
  const { data, error } = await supabase
    .from('appointments')
    .insert(insert)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

async function update(supabase, vetId, appointmentId, changes) {
  const allowed = ['scheduled_at', 'reason', 'status', 'urgent', 'consultation_id'];
  const patch = {};
  for (const k of allowed) if (changes[k] !== undefined) patch[k] = changes[k];
  const { data, error } = await supabase
    .from('appointments')
    .update(patch)
    .eq('id', appointmentId)
    .eq('veterinarian_id', vetId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

async function remove(supabase, vetId, appointmentId) {
  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', appointmentId)
    .eq('veterinarian_id', vetId);
  if (error) throw error;
}

async function listByPatient(supabase, patientId, { upcoming = true, limit = 20, offset = 0 } = {}) {
  let query = supabase
    .from('appointments')
    .select('id, scheduled_at, reason, status, urgent, consultation_id', { count: 'exact' })
    .eq('patient_id', patientId);

  if (upcoming) {
    query = query
      .gte('scheduled_at', new Date().toISOString())
      .in('status', ['scheduled', 'now'])
      .order('scheduled_at', { ascending: true });
  } else {
    query = query.order('scheduled_at', { ascending: false });
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);
  if (error) throw error;
  return { items: data || [], total: count || 0 };
}

module.exports = { listTodayForVet, listByPatient, create, update, remove };
