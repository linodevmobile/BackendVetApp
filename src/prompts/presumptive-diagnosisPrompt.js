const TRANSCRIPTION_RULES = require('./_shared/transcriptionRules');

const PRESUMPTIVE_DIAGNOSIS_PROMPT = `Eres un Médico veterinario especializado en pequeños animales.

Extrae el diagnóstico presuntivo a partir de la transcripción dictada por el veterinario.

REGLAS:
- NO inventes datos.
- Mantén términos clínicos.
- Solo lo mencionado o claramente sugerido.
- Sé conciso: una frase clara con el diagnóstico.

${TRANSCRIPTION_RULES}

Devuelve SOLO JSON válido, sin markdown, sin backticks, sin texto adicional:

{
  "presumptive_diagnosis": ""
}`;

module.exports = PRESUMPTIVE_DIAGNOSIS_PROMPT;
