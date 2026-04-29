const PLANS = require('../data/preventive_care_plans.json');

const SELECT_COLS = `
  id, patient_id, kind, name, product, applied_at, next_due_at, mode,
  applied_by_vet_id, consultation_id, notes, created_at, updated_at
`;

function computeStatus(row, today = new Date()) {
  if (!row.next_due_at) return row.applied_at ? 'applied' : 'pending';
  const due = new Date(row.next_due_at);
  const diffDays = Math.floor((due - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 30) return 'soon';
  return 'ok';
}

function decorate(row) {
  return { ...row, status: computeStatus(row) };
}

async function listByPatient(supabase, patientId, { kind, upcoming = false, days = 90, limit = 50, offset = 0 } = {}) {
  let query = supabase
    .from('patient_preventive_care')
    .select(SELECT_COLS, { count: 'exact' })
    .eq('patient_id', patientId);

  if (kind) query = query.eq('kind', kind);

  if (upcoming) {
    const now = new Date();
    const horizon = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    query = query
      .not('next_due_at', 'is', null)
      .lte('next_due_at', horizon.toISOString().slice(0, 10))
      .order('next_due_at', { ascending: true });
  } else {
    query = query.order('applied_at', { ascending: false, nullsFirst: false })
                 .order('next_due_at', { ascending: true, nullsFirst: false });
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);
  if (error) throw error;
  return { items: (data || []).map(decorate), total: count || 0 };
}

async function create(supabase, vetId, patientId, payload) {
  const insert = {
    patient_id: patientId,
    kind: payload.kind,
    name: payload.name,
    product: payload.product || null,
    applied_at: payload.applied_at || null,
    next_due_at: payload.next_due_at || null,
    mode: payload.mode || 'manual',
    applied_by_vet_id: payload.applied_at ? vetId : null,
    consultation_id: payload.consultation_id || null,
    notes: payload.notes || null,
  };
  const { data, error } = await supabase
    .from('patient_preventive_care')
    .insert(insert)
    .select(SELECT_COLS)
    .single();
  if (error) throw error;
  return decorate(data);
}

async function update(supabase, vetId, eventId, patientId, changes) {
  const allowed = ['name', 'product', 'applied_at', 'next_due_at', 'mode', 'notes', 'consultation_id'];
  const patch = {};
  for (const k of allowed) if (changes[k] !== undefined) patch[k] = changes[k];

  if (changes.applied_at && !changes.applied_by_vet_id) {
    patch.applied_by_vet_id = vetId;
  }

  const { data, error } = await supabase
    .from('patient_preventive_care')
    .update(patch)
    .eq('id', eventId)
    .eq('patient_id', patientId)
    .select(SELECT_COLS)
    .single();
  if (error) throw error;
  return decorate(data);
}

function lifeStage(species, dob) {
  if (!dob) return 'adult';
  const meta = PLANS._meta.life_stages[species];
  if (!meta) return 'adult';
  const months = (Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 30.44);
  if (months <= meta.puppy_max_months) return 'puppy';
  const years = months / 12;
  if (years >= meta.senior_min_years) return 'senior';
  return 'adult';
}

function projectNextDue(item, stage, applied) {
  if (stage === 'puppy' && Array.isArray(item.puppy_schedule_weeks) && item.puppy_schedule_weeks.length) {
    return null;
  }
  if (!item.adult_interval_months) return null;
  const base = applied ? new Date(applied) : new Date();
  base.setMonth(base.getMonth() + item.adult_interval_months);
  return base.toISOString().slice(0, 10);
}

async function suggestedPlan(supabase, patientId) {
  const { data: patient, error } = await supabase
    .from('patients')
    .select('id, species, date_of_birth')
    .eq('id', patientId)
    .single();
  if (error) throw error;

  const species = patient.species;
  if (!PLANS[species]) {
    return { species, life_stage: null, items: [], note: 'Sin plan sugerido para esta especie' };
  }

  const stage = lifeStage(species, patient.date_of_birth);
  const cat = PLANS[species];

  const { data: existing } = await supabase
    .from('patient_preventive_care')
    .select('kind, name, applied_at, next_due_at')
    .eq('patient_id', patientId);

  function existingFor(kind, name) {
    return (existing || []).find((r) => r.kind === kind && r.name.toLowerCase() === name.toLowerCase()) || null;
  }

  const items = [];

  for (const v of cat.vaccination_core || []) {
    const e = existingFor('vaccination', v.name);
    items.push({
      kind: 'vaccination',
      group: 'core',
      code: v.code,
      name: v.name,
      description: v.description,
      legal_required: !!v.legal_required,
      puppy_schedule_weeks: v.puppy_schedule_weeks,
      adult_interval_months: v.adult_interval_months,
      applied_at: e?.applied_at || null,
      next_due_at: e?.next_due_at || projectNextDue(v, stage, e?.applied_at),
      applied: !!e?.applied_at,
    });
  }
  for (const v of cat.vaccination_optional || []) {
    const e = existingFor('vaccination', v.name);
    items.push({
      kind: 'vaccination',
      group: 'optional',
      code: v.code,
      name: v.name,
      description: v.description,
      condition: v.condition,
      puppy_schedule_weeks: v.puppy_schedule_weeks,
      adult_interval_months: v.adult_interval_months,
      applied_at: e?.applied_at || null,
      next_due_at: e?.next_due_at || null,
      applied: !!e?.applied_at,
    });
  }

  if (cat.deworming_internal) {
    const e = existingFor('deworming_internal', cat.deworming_internal.name);
    const intervalMonths = cat.deworming_internal.adult_interval_months;
    items.push({
      kind: 'deworming_internal',
      group: 'core',
      name: cat.deworming_internal.name,
      products_examples: cat.deworming_internal.products_examples,
      adult_interval_months: intervalMonths,
      puppy_schedule: cat.deworming_internal.puppy_schedule,
      applied_at: e?.applied_at || null,
      next_due_at: e?.next_due_at || (e?.applied_at ? projectNextDue({ adult_interval_months: intervalMonths }, stage, e.applied_at) : null),
      applied: !!e?.applied_at,
    });
  }
  if (cat.deworming_external) {
    const e = existingFor('deworming_external', cat.deworming_external.name);
    const days = cat.deworming_external.adult_interval_days;
    items.push({
      kind: 'deworming_external',
      group: 'core',
      name: cat.deworming_external.name,
      products_examples: cat.deworming_external.products_examples,
      adult_interval_days: days,
      alt_interval_days: cat.deworming_external.alt_interval_days,
      notes: cat.deworming_external.notes,
      applied_at: e?.applied_at || null,
      next_due_at: e?.next_due_at || null,
      applied: !!e?.applied_at,
    });
  }

  return {
    species,
    life_stage: stage,
    source: PLANS._meta.source,
    items,
  };
}

async function applyNext(supabase, vetId, patientId, { kind } = {}) {
  const plan = await suggestedPlan(supabase, patientId);
  if (!plan.items.length) {
    return { error: 'no_plan', message: plan.note || 'Sin plan sugerido para esta especie' };
  }

  const filtered = kind ? plan.items.filter((i) => i.kind === kind) : plan.items;

  const sorted = [...filtered].sort((a, b) => {
    if (a.group === 'core' && b.group !== 'core') return -1;
    if (b.group === 'core' && a.group !== 'core') return 1;
    return 0;
  });

  const next = sorted.find((i) => !i.applied);
  if (!next) {
    return { error: 'plan_complete', message: 'Plan completo, no hay siguiente aplicación pendiente' };
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  let nextDueAt = null;
  if (next.adult_interval_months) {
    const d = new Date();
    d.setMonth(d.getMonth() + next.adult_interval_months);
    nextDueAt = d.toISOString().slice(0, 10);
  } else if (next.adult_interval_days) {
    const d = new Date();
    d.setDate(d.getDate() + next.adult_interval_days);
    nextDueAt = d.toISOString().slice(0, 10);
  }

  const created = await create(supabase, vetId, patientId, {
    kind: next.kind,
    name: next.name,
    product: null,
    applied_at: todayStr,
    next_due_at: nextDueAt,
    mode: 'plan',
    notes: null,
  });

  return { row: created, source_item: { code: next.code || null, group: next.group, name: next.name } };
}

module.exports = { listByPatient, create, update, suggestedPlan, applyNext };
