// Smoke test for v2.4: hospitalizations, appointments, attachments per patient.
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
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, body: json };
}

async function uploadFile(path, token, fields, fileName, fileBytes, mime) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  fd.append('file', new Blob([fileBytes], { type: mime }), fileName);
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, body: json };
}

(async () => {
  let appointmentId;
  let hospitalizationId;
  let attachmentId;
  let consultationIdForHosp;

  try {
    const login = await http('POST', '/auth/login', null, { email: EMAIL, password: PASSWORD });
    const token = login.body?.data?.session?.access_token;
    assert(!!token, 'login ok');

    // === seed: appointment, hospitalization (needs consultation), attachment is uploaded later ===
    const { data: appt } = await admin.from('appointments').insert({
      patient_id: PATIENT_ID,
      veterinarian_id: VET_ID,
      scheduled_at: '2026-05-15T10:00:00Z',
      reason: 'Control post-op',
      status: 'scheduled',
      urgent: false,
    }).select('id').single();
    appointmentId = appt.id;

    const { data: cons } = await admin.from('consultations').insert({
      patient_id: PATIENT_ID,
      veterinarian_id: VET_ID,
      type: 'emergency',
      status: 'signed',
      primary_diagnosis: 'Gastroenteritis hemorrágica',
      signed_at: new Date().toISOString(),
    }).select('id').single();
    consultationIdForHosp = cons.id;

    const { data: hosp } = await admin.from('hospitalizations').insert({
      patient_id: PATIENT_ID,
      consultation_id: consultationIdForHosp,
      admission_date: new Date().toISOString(),
      status: 'active',
      notes: 'Internado por GHE',
    }).select('id').single();
    hospitalizationId = hosp.id;

    // === GET /patients/:id/hospitalizations ===
    const hList = await http('GET', `/patients/${PATIENT_ID}/hospitalizations`, token);
    assert(hList.status === 200, `hospitalizations 200 (got ${hList.status})`);
    const ourHosp = hList.body.data?.find((h) => h.id === hospitalizationId);
    assert(!!ourHosp, 'hospitalization visible');
    assert(ourHosp.status === 'active', 'status active');
    assert(ourHosp.consultation?.primary_diagnosis === 'Gastroenteritis hemorrágica', 'consultation enriched (primary_diagnosis)');
    assert(ourHosp.consultation?.veterinarian?.full_name === 'Andres Mena', 'vet name embedded');

    // === GET /patients/:id/appointments?upcoming=true ===
    const aList = await http('GET', `/patients/${PATIENT_ID}/appointments?upcoming=true&limit=10`, token);
    assert(aList.status === 200, `appointments 200 (got ${aList.status})`);
    const ourAppt = aList.body.data?.find((x) => x.id === appointmentId);
    assert(!!ourAppt, 'upcoming appointment visible');
    assert(ourAppt.status === 'scheduled', 'status scheduled');

    // === GET /patients/:id/appointments?upcoming=false (history) ===
    const aHist = await http('GET', `/patients/${PATIENT_ID}/appointments?upcoming=false&limit=20`, token);
    assert(aHist.status === 200, `appointments history 200 (got ${aHist.status})`);
    assert(Array.isArray(aHist.body.data), 'history returns array');

    // === POST /patients/:id/attachments (upload) ===
    const fileBytes = Buffer.from('PNG fake content');
    const up = await uploadFile(
      `/patients/${PATIENT_ID}/attachments`,
      token,
      { category: 'image', label: 'Foto del lomo' },
      'lomo.png', fileBytes, 'image/png'
    );
    assert(up.status === 201 || up.status === 200, `attachment upload 2xx (got ${up.status} ${JSON.stringify(up.body)})`);
    attachmentId = up.body?.data?.id;
    assert(!!attachmentId, 'attachment id returned');
    assert(up.body.data.patient_id === PATIENT_ID, 'patient_id set');
    assert(up.body.data.consultation_id === null, 'consultation_id null (patient-level)');
    assert(up.body.data.category === 'image', 'category = image');

    // === GET /patients/:id/attachments?category=image ===
    const list = await http('GET', `/patients/${PATIENT_ID}/attachments?category=image&limit=20`, token);
    assert(list.status === 200, `attachments list 200 (got ${list.status})`);
    const ours = list.body.data?.find((x) => x.id === attachmentId);
    assert(!!ours, 'uploaded attachment visible by category=image');

    // === GET /patients/:id/attachments without category — should also include ours ===
    const all = await http('GET', `/patients/${PATIENT_ID}/attachments`, token);
    assert(all.status === 200, 'attachments all 200');
    assert(all.body.data?.some((x) => x.id === attachmentId), 'attachment visible without category filter');

    // === GET /patients/:id/attachments?category=laboratory — should NOT include ours ===
    const lab = await http('GET', `/patients/${PATIENT_ID}/attachments?category=laboratory`, token);
    assert(lab.status === 200, 'attachments lab 200');
    assert(!lab.body.data?.some((x) => x.id === attachmentId), 'image attachment NOT in laboratory filter');

    // === Trigger test: insert attachment with only consultation_id, expect patient_id auto-filled ===
    const { data: trigRow } = await admin.from('attachments').insert({
      consultation_id: consultationIdForHosp,
      storage_path: 'test/trig.png',
      mime_type: 'image/png',
    }).select('id, patient_id, consultation_id').single();
    assert(trigRow.patient_id === PATIENT_ID, `trigger filled patient_id (got ${trigRow.patient_id})`);
    await admin.from('attachments').delete().eq('id', trigRow.id);
    console.log('PASS: BEFORE-INSERT trigger autofills patient_id from consultation');

    console.log('\nALL v2.4 CHECKS PASSED');
  } finally {
    if (attachmentId) await admin.from('attachments').delete().eq('id', attachmentId);
    if (hospitalizationId) await admin.from('hospitalizations').delete().eq('id', hospitalizationId);
    if (consultationIdForHosp) await admin.from('consultations').delete().eq('id', consultationIdForHosp);
    if (appointmentId) await admin.from('appointments').delete().eq('id', appointmentId);
    console.log('cleanup done');
  }
})().catch((e) => { console.error('ERR:', e); process.exit(1); });
