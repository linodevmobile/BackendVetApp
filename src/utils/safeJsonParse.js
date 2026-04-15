const logger = require('./logger');

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch (firstError) {
    logger.warn('JSON parse directo falló, intentando limpiar respuesta...');

    // Remove markdown code blocks if present
    const cleaned = text
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch (secondError) {
      logger.error('No se pudo parsear JSON después de limpiar:', secondError.message);
      throw new Error('La respuesta de OpenAI no es JSON válido');
    }
  }
}

module.exports = safeJsonParse;
