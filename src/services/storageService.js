const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabaseClient');
const logger = require('../utils/logger');

const BUCKET_NAME = 'consultations-audio';

async function uploadAudio(filePath, originalName) {
  const ext = path.extname(originalName);
  const fileName = `${uuidv4()}${ext}`;

  logger.info('Subiendo audio a Supabase Storage:', fileName);

  const fileBuffer = fs.readFileSync(filePath);

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, fileBuffer, {
      contentType: 'audio/mpeg',
      upsert: false,
    });

  if (error) {
    logger.error('Error al subir audio:', error.message);
    throw new Error(`Error al subir audio a Storage: ${error.message}`);
  }

  logger.info('Audio subido exitosamente:', data.path);
  return data.path;
}

function deleteLocalFile(filePath) {
  try {
    fs.unlinkSync(filePath);
    logger.info('Archivo temporal eliminado:', filePath);
  } catch (err) {
    logger.warn('No se pudo eliminar archivo temporal:', err.message);
  }
}

module.exports = { uploadAudio, deleteLocalFile };
