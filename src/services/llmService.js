const openai = require('../config/openaiClient');
const safeJsonParse = require('../utils/safeJsonParse');
const logger = require('../utils/logger');

async function processWithLLM(prompt, transcribedText) {
  logger.info('Procesando texto con LLM...');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: transcribedText },
    ],
    temperature: 0.2,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0].message.content.trim();
  const parsed = safeJsonParse(content);

  logger.info('Respuesta LLM procesada correctamente');
  return parsed;
}

module.exports = { processWithLLM };
