// Shared block for clinical prompts where the speaker is the veterinarian.
// NOT used in chief_complaint (owner's voice — must stay literal).
const TRANSCRIPTION_RULES = `REGLAS DE CORRECCIÓN DE TRANSCRIPCIÓN:
La transcripción de audio puede contener errores fonéticos. Corrige términos médicos mal capturados cuando estés 90%+ seguro:
- Anatomía: "vaso" (en contexto abdominal/órgano) → "bazo"; "higado" → "hígado"; "rinion"/"riñon" → "riñón".
- Medicamentos: respeta el nombre exacto, NO agregues letras inexistentes (ej: "homeprazol" → "omeprazol"; "amoxixilina" → "amoxicilina").
- Términos clínicos: corrige acentuación y ortografía solo cuando el término sea inequívoco.
Si un término es ambiguo, déjalo como aparece y márcalo entre [corchetes] para revisión humana.
NO inventes términos. NO sustituyas con dudas.`;

module.exports = TRANSCRIPTION_RULES;
