// Smoke test for v2.3 patient_measurements via real repos (service-role client).
// Creates a consultation, populates vitals + physical_exam, signs it, asserts the
// measurement row + cache, then cleans up.

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const consultationsRepo = require('../src/repositories/consultationsRepo');
const measurementsRepo = require('../src/repositories/measurementsRepo');

const PATIENT_ID = 'ed7685f6-9f0e-4ca1-92a4-5b20ca1199a1'; // Verona
const VET_ID = 'c6b98f27-7146-4498-b3ac-dbfc38f4ebaa';     // Andres

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
    throw new Error(msg);
  }
  console.log('PASS:', msg);
}

async function snapshotPatientWeight() {
  const { data } = await supabase.from('patients').select('weight_kg').eq('id', PATIENT_ID).single();
  return data?.weight_kg;
}

(async () => {
  let consultationId;
  const originalWeight = await snapshotPatientWeight();
  console.log('baseline patients.weight_kg =', originalWeight);

  try {
    process.on('unhandledRejection', (e) => console.error('UNHANDLED:', e));
    // 1. create consultation
    const c = await consultationsRepo.create(supabase, VET_ID, { patient_id: PATIENT_ID, type: 'routine' });
    consultationId = c.id;
    console.log('created consultation', consultationId);

    // 2. upsert vitals + physical_exam sections
    const { error: secErr } = await supabase.from('consultation_sections').insert([
      { consultation_id: consultationId, section: 'vitals', content: { weight_kg: 14.5, temperature_c: 38.7, heart_rate_bpm: 110, respiratory_rate_rpm: 24 } },
      { consultation_id: consultationId, section: 'physical_exam', content: { bcs: '5/9', mucosa: 'pink' } },
    ]);
    if (secErr) { console.error('sections insert err:', secErr); throw secErr; }

    // 3. sign → triggers syncFromConsultation
    await consultationsRepo.sign(supabase, VET_ID, consultationId, { result: 'discharge' });

    // 4. assert measurement row
    const { data: m } = await supabase
      .from('patient_measurements')
      .select('*')
      .eq('consultation_id', consultationId)
      .single();
    assert(m, 'measurement row exists for signed consultation');
    assert(m.source === 'consultation', 'source = consultation');
    assert(Number(m.weight_kg) === 14.5, `weight_kg = 14.5 (got ${m.weight_kg})`);
    assert(Number(m.temperature_c) === 38.7, `temperature_c = 38.7 (got ${m.temperature_c})`);
    assert(m.heart_rate_bpm === 110, 'heart_rate_bpm = 110');
    assert(m.respiratory_rate_rpm === 24, 'respiratory_rate_rpm = 24');
    assert(m.bcs === '5/9', 'bcs = 5/9 (from physical_exam)');
    assert(m.measured_by_vet_id === VET_ID, 'measured_by_vet_id set');

    // 5. assert cache
    const cached = await snapshotPatientWeight();
    assert(Number(cached) === 14.5, `patients.weight_kg cache = 14.5 (got ${cached})`);

    // 6. idempotency: re-sign updates same row
    await supabase.from('consultation_sections')
      .update({ content: { weight_kg: 15.2, temperature_c: 38.7, heart_rate_bpm: 108, respiratory_rate_rpm: 22 } })
      .eq('consultation_id', consultationId).eq('section', 'vitals');
    await consultationsRepo.sign(supabase, VET_ID, consultationId, { result: 'discharge' });

    const { data: rows } = await supabase
      .from('patient_measurements')
      .select('id, weight_kg')
      .eq('consultation_id', consultationId);
    assert(rows.length === 1, `re-sync keeps single row (got ${rows.length})`);
    assert(Number(rows[0].weight_kg) === 15.2, `re-sync updated weight to 15.2 (got ${rows[0].weight_kg})`);

    const cached2 = await snapshotPatientWeight();
    assert(Number(cached2) === 15.2, `cache moved to 15.2 (got ${cached2})`);

    // 7. listByPatient endpoint
    const { items, total } = await measurementsRepo.listByPatient(supabase, PATIENT_ID, { metric: 'weight_kg', limit: 10, offset: 0 });
    assert(total >= 1, `listByPatient total >= 1 (got ${total})`);
    assert(items[0].weight_kg !== null, 'top item has weight');

    console.log('\nALL CHECKS PASSED');
  } finally {
    // cleanup
    if (consultationId) {
      await supabase.from('patient_measurements').delete().eq('consultation_id', consultationId);
      await supabase.from('consultation_sections').delete().eq('consultation_id', consultationId);
      await supabase.from('consultations').delete().eq('id', consultationId);
    }
    if (originalWeight !== undefined) {
      await supabase.from('patients').update({ weight_kg: originalWeight }).eq('id', PATIENT_ID);
    }
    console.log('cleanup done; patient weight restored to', originalWeight);
  }
})();
