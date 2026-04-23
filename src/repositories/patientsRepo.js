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
    created_by_vet_id: vetId,
  };
  const { data, error } = await supabase
    .from('patients')
    .insert(insert)
    .select('*')
    .single();
  if (error) throw error;
  return decorate(data);
}

async function getById(supabase, vetId, id) {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;

  const [{ data: alerts }, { data: fav }, { data: last }] = await Promise.all([
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
  ]);

  return decorate(data, {
    has_alert: (alerts || []).length > 0,
    is_favorite: !!fav,
    last_visit: last?.signed_at || null,
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
  const allowed = [
    'name', 'species', 'breed', 'sex', 'date_of_birth', 'weight_kg',
    'microchip', 'owner_name', 'owner_phone', 'owner_email',
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

module.exports = { create, getById, list, update };
