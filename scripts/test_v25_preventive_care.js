// Smoke test for v2.5: patient preventive care (vaccinations + dewormings) + suggested plan.
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const BASE = 'http://localhost:3000';
const EMAIL = 'andres.mena@test.com';
const PASSWORD = 'secret123';
const PATIENT_ID = 'ed7685f6-9f0e-4ca1-92a4-5b20ca1199a1';

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function assert(c, m) { if (!c) { console.error('FAIL:', m); process.exitCode = 1; throw new Error(m); } console.log('PASS:', m); }

async function http(method, path, token, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, body: json };
}

(async () => {
  const created = [];

  try {
    const login = await http('POST', '/auth/login', null, { email: EMAIL, password: PASSWORD });
    const token = login.body?.data?.session?.access_token;
    assert(!!token, 'login ok');

    // === POST /preventive-care — vaccination applied today ===
    const todayStr = new Date().toISOString().slice(0, 10);
    const futureStr = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const soonStr = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const created1 = await http('POST', `/patients/${PATIENT_ID}/preventive-care`, token, {
      kind: 'vaccination',
      name: 'Antirrábica',
      product: 'Nobivac Rabia',
      applied_at: todayStr,
      next_due_at: futureStr,
      mode: 'manual',
      notes: 'Refuerzo anual',
    });
    assert(created1.status === 201, `create vaccination 201 (got ${created1.status} ${JSON.stringify(created1.body)})`);
    const id1 = created1.body.data.id;
    created.push(id1);
    assert(created1.body.data.kind === 'vaccination', 'kind = vaccination');
    assert(created1.body.data.applied_by_vet_id, 'applied_by_vet_id auto-set');
    assert(created1.body.data.status === 'ok', `status ok (got ${created1.body.data.status})`);

    // === POST — deworming externa próxima (soon) ===
    const created2 = await http('POST', `/patients/${PATIENT_ID}/preventive-care`, token, {
      kind: 'deworming_external',
      name: 'Desparasitación externa',
      product: 'Bravecto',
      next_due_at: soonStr,
      mode: 'plan',
    });
    assert(created2.status === 201, `create deworming 201 (got ${created2.status})`);
    const id2 = created2.body.data.id;
    created.push(id2);
    assert(created2.body.data.status === 'soon', `status soon (got ${created2.body.data.status})`);
    assert(created2.body.data.applied_by_vet_id === null, 'applied_by_vet_id null when no applied_at');

    // === POST — interna pendiente sin fechas futuras (only applied_at) ===
    const pastStr = new Date(Date.now() - 95 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10); // 95 días
    const overdueDue = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const created3 = await http('POST', `/patients/${PATIENT_ID}/preventive-care`, token, {
      kind: 'deworming_internal',
      name: 'Desparasitación interna',
      applied_at: pastStr,
      next_due_at: overdueDue,
    });
    assert(created3.status === 201, `create deworming_internal 201 (got ${created3.status})`);
    const id3 = created3.body.data.id;
    created.push(id3);
    assert(created3.body.data.status === 'overdue', `status overdue (got ${created3.body.data.status})`);

    // === POST — error path: ni applied_at ni next_due_at ===
    const bad = await http('POST', `/patients/${PATIENT_ID}/preventive-care`, token, {
      kind: 'vaccination',
      name: 'Mal evento',
    });
    assert(bad.status === 400, `validation rejects missing dates (got ${bad.status})`);

    // === GET listado completo ===
    const all = await http('GET', `/patients/${PATIENT_ID}/preventive-care?limit=50`, token);
    assert(all.status === 200, `list all 200 (got ${all.status})`);
    assert(all.body.data.some((r) => r.id === id1), 'vaccination visible in list');
    assert(all.body.data.some((r) => r.id === id2), 'deworming external visible');
    assert(all.body.data.some((r) => r.id === id3), 'deworming internal visible');

    // === GET filtro por kind ===
    const onlyVax = await http('GET', `/patients/${PATIENT_ID}/preventive-care?kind=vaccination`, token);
    assert(onlyVax.status === 200, 'list by kind 200');
    assert(onlyVax.body.data.every((r) => r.kind === 'vaccination'), 'all rows are vaccination');
    assert(onlyVax.body.data.some((r) => r.id === id1), 'our vaccination present');
    assert(!onlyVax.body.data.some((r) => r.id === id2), 'deworming external NOT in vaccination filter');

    // === GET upcoming?days=30 — solo soon (id2), no overdue ===
    const upcoming = await http('GET', `/patients/${PATIENT_ID}/preventive-care?upcoming=true&days=30`, token);
    assert(upcoming.status === 200, 'upcoming 200');
    assert(upcoming.body.data.some((r) => r.id === id2), 'soon item in upcoming');
    assert(!upcoming.body.data.some((r) => r.id === id1), 'far-away vaccination NOT in upcoming 30d');

    // === PATCH — actualizar next_due_at ===
    const newDue = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const patched = await http('PATCH', `/patients/${PATIENT_ID}/preventive-care/${id2}`, token, {
      next_due_at: newDue,
      notes: 'Reprogramado',
    });
    assert(patched.status === 200, `patch 200 (got ${patched.status})`);
    assert(patched.body.data.next_due_at === newDue, 'next_due_at updated');
    assert(patched.body.data.notes === 'Reprogramado', 'notes updated');

    // === GET suggested-plan ===
    const plan = await http('GET', `/patients/${PATIENT_ID}/preventive-care/suggested-plan`, token);
    assert(plan.status === 200, `suggested-plan 200 (got ${plan.status})`);
    assert(['dog', 'cat', 'exotic'].includes(plan.body.data.species), 'species set');
    assert(['puppy', 'adult', 'senior'].includes(plan.body.data.life_stage), 'life_stage set');
    assert(Array.isArray(plan.body.data.items) && plan.body.data.items.length > 0, 'plan has items');
    const rabies = plan.body.data.items.find((i) => i.name === 'Antirrábica');
    if (rabies) {
      assert(rabies.applied === true, 'plan flags antirrábica as already applied');
    }

    // === POST apply-next (deworming_external) — kind filter, garantiza que hay item pendiente ===
    // Borramos primero el deworming_external que sembramos para que apply-next lo encuentre pendiente.
    await admin.from('patient_preventive_care').delete().eq('id', id2);
    const idx = created.indexOf(id2);
    if (idx >= 0) created.splice(idx, 1);

    const applyExt = await http('POST', `/patients/${PATIENT_ID}/preventive-care/apply-next`, token, {
      kind: 'deworming_external',
    });
    assert(applyExt.status === 201, `apply-next ext 201 (got ${applyExt.status} ${JSON.stringify(applyExt.body)})`);
    assert(applyExt.body.data.kind === 'deworming_external', 'apply-next ext kind correct');
    assert(applyExt.body.data.mode === 'plan', 'apply-next ext mode = plan');
    const todayCheck = new Date().toISOString().slice(0, 10);
    assert(applyExt.body.data.applied_at === todayCheck, 'apply-next ext applied_at = today');
    assert(applyExt.body.data.applied_by_vet_id, 'apply-next ext applied_by_vet_id set');
    assert(applyExt.body.data.source_item, 'apply-next ext returns source_item meta');
    created.push(applyExt.body.data.id);

    // === POST apply-next sin filtro — debería traer próximo core pendiente (probablemente vaccination) ===
    // Borramos también la vacuna sembrada para liberar Antirrábica como "no aplicada".
    await admin.from('patient_preventive_care').delete().eq('id', id1);
    const idx2 = created.indexOf(id1);
    if (idx2 >= 0) created.splice(idx2, 1);

    const applyAny = await http('POST', `/patients/${PATIENT_ID}/preventive-care/apply-next`, token, {});
    assert(applyAny.status === 201, `apply-next any 201 (got ${applyAny.status} ${JSON.stringify(applyAny.body)})`);
    assert(['vaccination', 'deworming_internal', 'deworming_external'].includes(applyAny.body.data.kind), 'apply-next any returned a valid kind');
    assert(applyAny.body.data.mode === 'plan', 'apply-next any mode = plan');
    created.push(applyAny.body.data.id);

    console.log('\nALL v2.5 CHECKS PASSED');
  } finally {
    if (created.length) {
      await admin.from('patient_preventive_care').delete().in('id', created);
    }
    console.log('cleanup done');
  }
})().catch((e) => { console.error('ERR:', e); process.exit(1); });
