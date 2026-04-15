const fs = require('fs');
const openai = require('../config/openaiClient');
const logger = require('../utils/logger');

async function transcribeAudio(filePath) {
  logger.info('Iniciando transcripción de audio:', filePath);

  const fileStream = fs.createReadStream(filePath);

  const response = await openai.audio.transcriptions.create({
    file: fileStream,
    model: 'gpt-4o-transcribe',
  });

  const text = response.text.trim();
  logger.info('Transcripción completada, longitud:', text.length);

  return text;
}

module.exports = { transcribeAudio };
