const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabaseClient');
const logger = require('../utils/logger');

// --- Consultations ---

async function createConsultation(patientId, veterinarianId) {
  const id = uuidv4();

  const { data, error } = await supabase
    .from('consultations')
    .insert({ id, patient_id: patientId, veterinarian_id: veterinarianId })
    .select()
    .single();

  if (error) {
    logger.error('Error al crear consulta:', error.message);
    throw new Error(`Error al crear consulta: ${error.message}`);
  }

  logger.info('Consulta creada:', id);
  return data;
}

async function getConsultation(id) {
  const { data, error } = await supabase
    .from('consultations')
    .select('*, consultation_drafts(*)')
    .eq('id', id)
    .single();

  if (error) {
    logger.error('Error al obtener consulta:', error.message);
    throw new Error(`Error al obtener consulta: ${error.message}`);
  }

  return data;
}

async function closeConsultation(id, result, chiefComplaint, primaryDiagnosis) {
  const updateData = {
    status: 'completed',
    closed_at: new Date().toISOString(),
  };
  if (result) updateData.result = result;
  if (chiefComplaint) updateData.chief_complaint = chiefComplaint;
  if (primaryDiagnosis) updateData.primary_diagnosis = primaryDiagnosis;

  const { data, error } = await supabase
    .from('consultations')
    .update(updateData)
    .eq('id', id)
    .select('*, consultation_drafts(*)')
    .single();

  if (error) {
    logger.error('Error al cerrar consulta:', error.message);
    throw new Error(`Error al cerrar consulta: ${error.message}`);
  }

  logger.info('Consulta cerrada:', id);
  return data;
}

// --- Consultation Drafts (AI capture layer) ---

async function upsertDraft(consultationId, section, content, audioUrl, transcription) {
  logger.info(`Guardando borrador sección "${section}" de consulta ${consultationId}`);

  const { data, error } = await supabase
    .from('consultation_drafts')
    .upsert(
      {
        consultation_id: consultationId,
        section,
        content,
        audio_url: audioUrl,
        transcription,
      },
      { onConflict: 'consultation_id,section' }
    )
    .select()
    .single();

  if (error) {
    logger.error('Error al guardar borrador:', error.message);
    throw new Error(`Error al guardar borrador: ${error.message}`);
  }

  logger.info('Borrador guardado correctamente');
  return data;
}

// --- Patients ---

async function createPatient(patientData) {
  const id = uuidv4();

  const { data, error } = await supabase
    .from('patients')
    .insert({ id, ...patientData })
    .select()
    .single();

  if (error) {
    logger.error('Error al crear paciente:', error.message);
    throw new Error(`Error al crear paciente: ${error.message}`);
  }

  logger.info('Paciente creado:', id);
  return data;
}

async function getPatient(id) {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    logger.error('Error al obtener paciente:', error.message);
    throw new Error(`Error al obtener paciente: ${error.message}`);
  }

  return data;
}

async function listPatients() {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Error al listar pacientes:', error.message);
    throw new Error(`Error al listar pacientes: ${error.message}`);
  }

  return data;
}

async function updatePatient(id, updates) {
  const { data, error } = await supabase
    .from('patients')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error('Error al actualizar paciente:', error.message);
    throw new Error(`Error al actualizar paciente: ${error.message}`);
  }

  return data;
}

// --- Veterinarians ---

async function getVeterinarian(id) {
  const { data, error } = await supabase
    .from('veterinarians')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    logger.error('Error al obtener veterinario:', error.message);
    throw new Error(`Error al obtener veterinario: ${error.message}`);
  }

  return data;
}

async function listVeterinarians() {
  const { data, error } = await supabase
    .from('veterinarians')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Error al listar veterinarios:', error.message);
    throw new Error(`Error al listar veterinarios: ${error.message}`);
  }

  return data;
}

module.exports = {
  createConsultation,
  getConsultation,
  closeConsultation,
  upsertDraft,
  createPatient,
  getPatient,
  listPatients,
  updatePatient,
  getVeterinarian,
  listVeterinarians,
};
