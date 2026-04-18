const ANAMNESIS_PROMPT = require('../prompts/anamnesisPrompt');
const PHYSICAL_EXAM_PROMPT = require('../prompts/physical-examPrompt');
const DIAGNOSTIC_APPROACH_PROMPT = require('../prompts/diagnostic-approachPrompt');
const PRESUMPTIVE_DIAGNOSIS_PROMPT = require('../prompts/presumptive-diagnosisPrompt');
const DEFINITIVE_DIAGNOSIS_PROMPT = require('../prompts/definitive-diagnosisPrompt');
const TREATMENT_PLAN_PROMPT = require('../prompts/treatment-planPrompt');
const PROGNOSIS_PROMPT = require('../prompts/prognosisPrompt');

// API keys (Spanish) → prompt mapping
const PROMPTS = {
  anamnesis: ANAMNESIS_PROMPT,
  examen_fisico: PHYSICAL_EXAM_PROMPT,
  abordaje_diagnostico: DIAGNOSTIC_APPROACH_PROMPT,
  diagnostico_presuntivo: PRESUMPTIVE_DIAGNOSIS_PROMPT,
  diagnostico_definitivo: DEFINITIVE_DIAGNOSIS_PROMPT,
  plan_terapeutico: TREATMENT_PLAN_PROMPT,
  pronostico_evolucion: PROGNOSIS_PROMPT,
};

// API keys (Spanish) → DB enum values (English)
const SECTION_TO_DB = {
  anamnesis: 'anamnesis',
  examen_fisico: 'physical_exam',
  abordaje_diagnostico: 'diagnostic_approach',
  diagnostico_presuntivo: 'presumptive_diagnosis',
  diagnostico_definitivo: 'definitive_diagnosis',
  plan_terapeutico: 'treatment_plan',
  pronostico_evolucion: 'prognosis',
};

const VALID_SECTIONS = Object.keys(PROMPTS);

function getPrompt(section) {
  return PROMPTS[section] || null;
}

function isValidSection(section) {
  return VALID_SECTIONS.includes(section);
}

function getDbSection(section) {
  return SECTION_TO_DB[section] || null;
}

module.exports = { getPrompt, isValidSection, getDbSection, VALID_SECTIONS };
