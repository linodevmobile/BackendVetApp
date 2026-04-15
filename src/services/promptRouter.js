const ANAMNESIS_PROMPT = require('../prompts/anamnesisPrompt');
const PHYSICAL_EXAM_PROMPT = require('../prompts/physical-examPrompt');
const DIAGNOSTIC_APPROACH_PROMPT = require('../prompts/diagnostic-approachPrompt');
const PRESUMPTIVE_DIAGNOSIS_PROMPT = require('../prompts/presumptive-diagnosisPrompt');
const DEFINITIVE_DIAGNOSIS_PROMPT = require('../prompts/definitive-diagnosisPrompt');
const TREATMENT_PLAN_PROMPT = require('../prompts/treatment-planPrompt');
const PROGNOSIS_PROMPT = require('../prompts/prognosisPrompt');

const PROMPTS = {
  anamnesis: ANAMNESIS_PROMPT,
  examen_fisico: PHYSICAL_EXAM_PROMPT,
  abordaje_diagnostico: DIAGNOSTIC_APPROACH_PROMPT,
  diagnostico_presuntivo: PRESUMPTIVE_DIAGNOSIS_PROMPT,
  diagnostico_definitivo: DEFINITIVE_DIAGNOSIS_PROMPT,
  plan_terapeutico: TREATMENT_PLAN_PROMPT,
  pronostico_evolucion: PROGNOSIS_PROMPT,
};

const VALID_SECTIONS = Object.keys(PROMPTS);

function getPrompt(section) {
  return PROMPTS[section] || null;
}

function isValidSection(section) {
  return VALID_SECTIONS.includes(section);
}

module.exports = { getPrompt, isValidSection, VALID_SECTIONS };
