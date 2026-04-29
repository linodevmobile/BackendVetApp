// HTTP-level smoke test for v2.3 patient_measurements.
// Boots assumed: server already running on PORT (default 3000).
// Logs in as Andres, creates consultation, PATCHes vitals + physical_exam,
// signs, GETs measurements, asserts, then cleans up via service-role client.

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';
const EMAIL = 'andres.mena@test.com';
const PASSWORD = 'secret123';
const PATIENT_ID = 'ed7685f6-9f0e-4ca1-92a4-5b20ca1199a1';

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; throw new Error(msg); }
  console.log('PASS:', msg);
}

async function http(method, path, token, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, body: json };
}

(async () => {
  let consultationId;
  let originalWeight;

  try {
    const snap = await admin.from('patients').select('weight_kg').eq('id', PATIENT_ID).single();
    originalWeight = snap.data?.weight_kg;
    console.log('baseline patients.weight_kg =', originalWeight);

    // 1. login
    const login = await http('POST', '/auth/login', null, { email: EMAIL, password: PASSWORD });
    assert(login.status === 200, `POST /auth/login status 200 (got ${login.status} ${JSON.stringify(login.body)})`);
    const token = login.body?.data?.access_token || login.body?.access_token || login.body?.data?.session?.access_token || login.body?.session?.access_token;
    assert(!!token, 'login returns access_token');

    // 2. create consultation
    const created = await http('POST', '/consultations', token, { patient_id: PATIENT_ID, type: 'routine' });
    assert(created.status === 201 || created.status === 200, `POST /consultations status 2xx (got ${created.status} ${JSON.stringify(created.body)})`);
    consultationId = created.body?.data?.id || created.body?.id;
    assert(!!consultationId, 'consultation id returned');

    // 3. PATCH vitals
    const vitals = await http('PATCH', `/consultation/${consultationId}/sections/vitals`, token, {
      content: { weight_kg: 14.5, temperature_c: 38.7, heart_rate_bpm: 110, respiratory_rate_rpm: 24 },
    });
    assert(vitals.status === 200, `PATCH vitals 200 (got ${vitals.status} ${JSON.stringify(vitals.body)})`);

    // 4. PATCH physical_exam
    const phys = await http('PATCH', `/consultation/${consultationId}/sections/physical_exam`, token, {
      content: { bcs: '5/9', mucosa: 'pink', dehydration_percent: 0, attitude_owner: 'friendly', attitude_vet: 'friendly', pulse: 'normal', tllc_seconds: 1, trcp_seconds: 1, systems_affected: 'normal' },
    });
    assert(phys.status === 200, `PATCH physical_exam 200 (got ${phys.status} ${JSON.stringify(phys.body)})`);

    // 5. sign
    const signed = await http('PATCH', `/consultation/${consultationId}/sign`, token, { result: 'discharge', summary: 'test', primary_diagnosis: 'test' });
    assert(signed.status === 200, `PATCH sign 200 (got ${signed.status} ${JSON.stringify(signed.body)})`);

    // 6. GET measurements
    const list = await http('GET', `/patients/${PATIENT_ID}/measurements?metric=weight_kg&limit=10`, token);
    assert(list.status === 200, `GET measurements 200 (got ${list.status})`);
    const items = list.body?.data || [];
    const ourRow = items.find((r) => r.consultation_id === consultationId);
    assert(!!ourRow, 'measurement row visible via GET /patients/:id/measurements');
    assert(Number(ourRow.weight_kg) === 14.5, `row.weight_kg = 14.5 (got ${ourRow.weight_kg})`);
    assert(Number(ourRow.temperature_c) === 38.7, 'row.temperature_c = 38.7');
    assert(ourRow.bcs === '5/9', 'row.bcs = 5/9');
    assert(ourRow.source === 'consultation', 'row.source = consultation');

    // 7. patient cache
    const patient = await http('GET', `/patients/${PATIENT_ID}`, token);
    assert(patient.status === 200, 'GET patient 200');
    const cached = patient.body?.data?.weight_kg;
    assert(Number(cached) === 14.5, `patients.weight_kg cache = 14.5 (got ${cached})`);

    console.log('\nALL HTTP CHECKS PASSED');
  } finally {
    if (consultationId) {
      await admin.from('patient_measurements').delete().eq('consultation_id', consultationId);
      await admin.from('consultation_sections').delete().eq('consultation_id', consultationId);
      await admin.from('consultations').delete().eq('id', consultationId);
    }
    if (originalWeight !== undefined) {
      await admin.from('patients').update({ weight_kg: originalWeight }).eq('id', PATIENT_ID);
    }
    console.log('cleanup done; weight restored to', originalWeight);
  }
})().catch((e) => { console.error('ERR:', e); process.exit(1); });
