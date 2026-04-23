const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { supabaseAdmin } = require('../config/supabaseClient');
const logger = require('../utils/logger');

const AUDIO_BUCKET = 'consultations-audio';
const ATTACHMENTS_BUCKET = 'consultation-attachments';

async function uploadFile(bucket, filePath, originalName, mimeType) {
  if (!supabaseAdmin) {
    throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY para subir archivos');
  }

  const ext = path.extname(originalName);
  const fileName = `${uuidv4()}${ext}`;
  const fileBuffer = fs.readFileSync(filePath);

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(fileName, fileBuffer, {
      contentType: mimeType || 'application/octet-stream',
      upsert: false,
    });

  if (error) {
    logger.error(`Error al subir archivo al bucket ${bucket}:`, error.message);
    throw new Error(`Error al subir archivo: ${error.message}`);
  }
  return data.path;
}

async function uploadAudio(filePath, originalName, mimeType) {
  return uploadFile(AUDIO_BUCKET, filePath, originalName, mimeType || 'audio/mpeg');
}

async function uploadAttachment(filePath, originalName, mimeType) {
  return uploadFile(ATTACHMENTS_BUCKET, filePath, originalName, mimeType);
}

function deleteLocalFile(filePath) {
  try {
    fs.unlinkSync(filePath);
  } catch (err) {
    logger.warn('No se pudo eliminar archivo temporal:', err.message);
  }
}

module.exports = { uploadAudio, uploadAttachment, deleteLocalFile };
