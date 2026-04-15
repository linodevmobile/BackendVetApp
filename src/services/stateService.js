const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabaseClient');
const logger = require('../utils/logger');

const TABLE_NAME = 'consultations';

async function createConsultation() {
  const id = uuidv4();

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert({ id })
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
    .from(TABLE_NAME)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    logger.error('Error al obtener consulta:', error.message);
    throw new Error(`Error al obtener consulta: ${error.message}`);
  }

  return data;
}

async function updateSection(id, section, sectionData) {
  logger.info(`Actualizando sección "${section}" de consulta ${id}`);

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update({ [section]: sectionData })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error('Error al actualizar sección:', error.message);
    throw new Error(`Error al actualizar sección: ${error.message}`);
  }

  logger.info('Sección actualizada correctamente');
  return data;
}

module.exports = { createConsultation, getConsultation, updateSection };
