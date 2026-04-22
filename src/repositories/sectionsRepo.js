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

async function listByConsultation(supabase, consultationId) {
  const { data, error } = await supabase
    .from('consultation_sections')
    .select('*')
    .eq('consultation_id', consultationId);
  if (error) throw error;
  return data || [];
}

module.exports = { upsert, updateText, listByConsultation };
