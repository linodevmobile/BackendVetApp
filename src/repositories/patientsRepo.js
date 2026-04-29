function calcAgeYears(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

function decorate(patient, extras = {}) {
  return {
    ...patient,
    age_years: calcAgeYears(patient.date_of_birth),
    last_visit: extras.last_visit || null,
    has_alert: extras.has_alert || false,
    is_favorite: extras.is_favorite || false,
    visits_count: extras.visits_count ?? null,
  };
}

async function create(supabase, vetId, payload) {
  let dob = payload.date_of_birth || null;
  if (!dob && typeof payload.age_years === 'number') {
    const now = new Date();
    dob = new Date(now.getFullYear() - payload.age_years, now.getMonth(), now.getDate())
      .toISOString()
      .slice(0, 10);
  }
  const insert = {
    name: payload.name,
    species: payload.species,
    breed: payload.breed || null,
    sex: payload.sex,
    date_of_birth: dob,
    weight_kg: payload.weight_kg ?? null,
    microchip: payload.microchip || null,
    owner_name: payload.owner_name,
    owner_phone: payload.owner_phone || null,
    owner_email: payload.owner_email || null,
    owner_address: payload.owner_address || null,
    created_by_vet_id: vetId,
  };
  const { data, error } = await supabase
    .from('patients')
    .insert(insert)
    .select('*')
    .single();
  if (error) throw error;

  if (typeof payload.weight_kg === 'number') {
    const { error: mErr } = await supabase
      .from('patient_measurements')
      .insert({
        patient_id: data.id,
        measured_by_vet_id: vetId,
        source: 'manual',
        weight_kg: payload.weight_kg,
        notes: 'Peso al alta',
      });
    if (mErr) throw mErr;
  }

  return decorate(data);
}

async function getById(supabase, vetId, id) {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;

  const [{ data: alerts }, { data: fav }, { data: last }, { count: visitsCount }] = await Promise.all([
    supabase.from('patient_alerts').select('id').eq('patient_id', id).eq('active', true).limit(1),
    supabase.from('vet_favorite_patients').select('patient_id').eq('vet_id', vetId).eq('patient_id', id).maybeSingle(),
    supabase
      .from('consultations')
      .select('signed_at')
      .eq('patient_id', id)
      .eq('status', 'signed')
      .order('signed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('consultations')
      .select('id', { count: 'exact', head: true })
      .eq('patient_id', id)
      .eq('status', 'signed'),
  ]);

  return decorate(data, {
    has_alert: (alerts || []).length > 0,
    is_favorite: !!fav,
    last_visit: last?.signed_at || null,
    visits_count: visitsCount ?? 0,
  });
}

async function list(supabase, vetId, { search, filter, limit, offset }) {
  let query = supabase.from('patients').select('*', { count: 'exact' });

  if (search) {
    const like = `%${search}%`;
    query = query.or(`name.ilike.${like},owner_name.ilike.${like},microchip.ilike.${like}`);
  }

  if (filter === 'favorites') {
    const { data: favs } = await supabase
      .from('vet_favorite_patients')
      .select('patient_id')
      .eq('vet_id', vetId);
    const ids = (favs || []).map((f) => f.patient_id);
    if (ids.length === 0) return { items: [], total: 0 };
    query = query.in('id', ids);
  } else if (filter === 'recent') {
    query = query.order('created_at', { ascending: false });
  } else if (filter === 'today_agenda') {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
    const { data: appts } = await supabase
      .from('appointments')
      .select('patient_id')
      .eq('veterinarian_id', vetId)
      .gte('scheduled_at', start)
      .lt('scheduled_at', end);
    const ids = (appts || []).map((a) => a.patient_id);
    if (ids.length === 0) return { items: [], total: 0 };
    query = query.in('id', ids);
  }

  query = query.range(offset, offset + limit - 1);
  const { data, error, count } = await query;
  if (error) throw error;

  const items = (data || []).map((p) => decorate(p));
  return { items, total: count || items.length };
}

async function update(supabase, vetId, id, changes) {
  // weight_kg is intentionally excluded: weight changes go through patient_measurements
  // (synced on consultation sign), and patients.weight_kg is auto-cached by trigger.
  const allowed = [
    'name', 'species', 'breed', 'sex', 'date_of_birth',
    'microchip', 'owner_name', 'owner_phone', 'owner_email', 'owner_address',
  ];
  const patch = {};
  for (const k of allowed) if (changes[k] !== undefined) patch[k] = changes[k];
  const { data, error } = await supabase
    .from('patients')
    .update(patch)
    .eq('id', id)
    .eq('created_by_vet_id', vetId)
    .select('*')
    .single();
  if (error) throw error;
  return decorate(data);
}

async function timeline(supabase, vetId, patientId, { type = 'all', limit = 20, offset = 0 } = {}) {
  const events = [];

  if (type === 'all' || type === 'consultation') {
    const { data: consultations, error } = await supabase
      .from('consultations')
      .select(`
        id, type, status, summary, primary_diagnosis, result, signed_at,
        veterinarian:veterinarians ( id, full_name )
      `)
      .eq('patient_id', patientId)
      .eq('status', 'signed')
      .order('signed_at', { ascending: false });
    if (error) throw error;

    for (const c of consultations || []) {
      events.push({
        id: c.id,
        kind: 'consultation',
        when: c.signed_at,
        title: c.primary_diagnosis || c.summary || 'Consulta firmada',
        doc: c.veterinarian?.full_name || null,
        tone: c.type === 'emergency' ? 'urgent' : c.type === 'surgery' ? 'warn' : 'ok',
        ref_id: c.id,
        meta: { type: c.type, result: c.result },
      });
    }
  }

  if (type === 'all' || type === 'attachment') {
    const { data: attachments, error } = await supabase
      .from('consultation_attachments')
      .select(`
        id, label, mime_type, storage_path, section, created_at,
        consultation:consultations!inner ( id, signed_at, status, patient_id )
      `)
      .eq('consultation.patient_id', patientId)
      .eq('consultation.status', 'signed');
    if (error) throw error;

    for (const a of attachments || []) {
      events.push({
        id: a.id,
        kind: 'attachment',
        when: a.consultation?.signed_at || a.created_at,
        title: a.label || 'Adjunto',
        doc: null,
        tone: 'neutral',
        ref_id: a.consultation?.id || null,
        meta: { section: a.section, mime_type: a.mime_type },
      });
    }
  }

  events.sort((a, b) => new Date(b.when) - new Date(a.when));
  const total = events.length;
  const items = events.slice(offset, offset + limit);
  return { items, total };
}

module.exports = { create, getById, list, update, timeline };
