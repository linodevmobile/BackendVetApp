const measurementsRepo = require('./measurementsRepo');

const MEASUREMENT_SECTIONS = ['vitals', 'physical_exam'];

// If the section is a measurement source AND its consultation is already signed,
// re-sync patient_measurements so post-sign edits propagate to the history.
async function maybeResyncMeasurement(supabase, consultationId, section) {
  if (!MEASUREMENT_SECTIONS.includes(section)) return;
  const { data: consultation } = await supabase
    .from('consultations')
    .select('status')
    .eq('id', consultationId)
    .maybeSingle();
  if (consultation?.status === 'signed') {
    await measurementsRepo.syncFromConsultation(supabase, { consultationId });
  }
}

async function upsert(supabase, { consultationId, section, transcription, aiSuggested, text, audioUrl, overwriteText }) {
  const { data: existing } = await supabase
    .from('consultation_sections')
    .select('id, text')
    .eq('consultation_id', consultationId)
    .eq('section', section)
    .maybeSingle();

  const finalText = overwriteText || !existing?.text ? text : existing.text;

  const row = {
    consultation_id: consultationId,
    section,
    transcription: transcription ?? null,
    ai_suggested: aiSuggested ?? {},
    text: finalText,
    content: aiSuggested ?? null,
    audio_url: audioUrl ?? null,
    processed_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('consultation_sections')
    .upsert(row, { onConflict: 'consultation_id,section' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

async function updateText(supabase, { consultationId, section, text, content }) {
  const patch = { processed_at: new Date().toISOString() };
  if (text !== undefined) patch.text = text;
  if (content !== undefined) patch.content = content;

  const { data, error } = await supabase
    .from('consultation_sections')
    .update(patch)
    .eq('consultation_id', consultationId)
    .eq('section', section)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

// Partial upsert: updates only provided fields, inserts row if missing.
// Used by PATCH /consultations/:id/sections/:section to accept incremental
// drafts from the client (text, content, transcription, ai_suggested, audio_url).
async function upsertPartial(supabase, { consultationId, section, fields }) {
  const patch = { processed_at: new Date().toISOString(), ...fields };

  const { data: existing } = await supabase
    .from('consultation_sections')
    .select('id')
    .eq('consultation_id', consultationId)
    .eq('section', section)
    .maybeSingle();

  let result;
  if (existing) {
    const { data, error } = await supabase
      .from('consultation_sections')
      .update(patch)
      .eq('consultation_id', consultationId)
      .eq('section', section)
      .select('*')
      .single();
    if (error) throw error;
    result = data;
  } else {
    const { data, error } = await supabase
      .from('consultation_sections')
      .insert({ consultation_id: consultationId, section, ...patch })
      .select('*')
      .single();
    if (error) throw error;
    result = data;
  }

  await maybeResyncMeasurement(supabase, consultationId, section);
  return result;
}

async function listByConsultation(supabase, consultationId) {
  const { data, error } = await supabase
    .from('consultation_sections')
    .select('*')
    .eq('consultation_id', consultationId);
  if (error) throw error;
  return data || [];
}

module.exports = { upsert, updateText, upsertPartial, listByConsultation };
