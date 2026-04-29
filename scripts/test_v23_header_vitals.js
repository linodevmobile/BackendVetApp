// Smoke test for latest_bcs / latest_* fields on GET /patients/:id.
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const BASE = 'http://localhost:3000';
const EMAIL = 'andres.mena@test.com';
const PASSWORD = 'secret123';
const PATIENT_ID = 'ed7685f6-9f0e-4ca1-92a4-5b20ca1199a1';
const VET_ID = 'c6b98f27-7146-4498-b3ac-dbfc38f4ebaa';

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
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

(async () => {
  let measurementIds = [];
  try {
    // seed: 2 measurements (older w/ bcs only, newer w/ vitals only) to test "first non-null per metric"
    const { data: m1 } = await admin.from('patient_measurements').insert({
      patient_id: PATIENT_ID, measured_by_vet_id: VET_ID, source: 'manual',
      measured_at: '2026-04-20T10:00:00Z', bcs: '6/9',
    }).select('id').single();
    measurementIds.push(m1.id);

    const { data: m2 } = await admin.from('patient_measurements').insert({
      patient_id: PATIENT_ID, measured_by_vet_id: VET_ID, source: 'manual',
      measured_at: '2026-04-29T10:00:00Z', temperature_c: 38.4, heart_rate_bpm: 105, respiratory_rate_rpm: 22,
    }).select('id').single();
    measurementIds.push(m2.id);

    const login = await http('POST', '/auth/login', null, { email: EMAIL, password: PASSWORD });
    const token = login.body?.data?.session?.access_token;
    assert(!!token, 'login ok');

    const get = await http('GET', `/patients/${PATIENT_ID}`, token);
    assert(get.status === 200, `GET /patients/:id 200 (got ${get.status})`);
    const p = get.body.data;
    console.log('header fields:', {
      latest_bcs: p.latest_bcs,
      latest_temperature_c: p.latest_temperature_c,
      latest_heart_rate_bpm: p.latest_heart_rate_bpm,
      latest_respiratory_rate_rpm: p.latest_respiratory_rate_rpm,
      latest_measured_at: p.latest_measured_at,
      visits_count: p.visits_count,
      weight_kg: p.weight_kg,
    });
    assert(p.latest_bcs === '6/9', `latest_bcs = '6/9' (got ${p.latest_bcs})`);
    assert(Number(p.latest_temperature_c) === 38.4, `latest_temperature_c = 38.4 (got ${p.latest_temperature_c})`);
    assert(p.latest_heart_rate_bpm === 105, 'latest_heart_rate_bpm = 105');
    assert(p.latest_respiratory_rate_rpm === 22, 'latest_respiratory_rate_rpm = 22');
    assert(!!p.latest_measured_at, 'latest_measured_at set');

    console.log('\nALL HEADER CHECKS PASSED');
  } finally {
    if (measurementIds.length) {
      await admin.from('patient_measurements').delete().in('id', measurementIds);
    }
    // restore weight cache (trigger may have moved it)
    await admin.from('patients').update({ weight_kg: 12 }).eq('id', PATIENT_ID);
    console.log('cleanup done');
  }
})().catch((e) => { console.error('ERR:', e); process.exit(1); });
