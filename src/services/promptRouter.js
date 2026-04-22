const ANAMNESIS_PROMPT = require('../prompts/anamnesisPrompt');
const PHYSICAL_EXAM_PROMPT = require('../prompts/physical-examPrompt');
const PROBLEMS_PROMPT = require('../prompts/problemsPrompt');
const DIAGNOSTIC_APPROACH_PROMPT = require('../prompts/diagnostic-approachPrompt');
const COMPLEMENTARY_EXAMS_PROMPT = require('../prompts/complementary-examsPrompt');
const PRESUMPTIVE_DIAGNOSIS_PROMPT = require('../prompts/presumptive-diagnosisPrompt');
const DEFINITIVE_DIAGNOSIS_PROMPT = require('../prompts/definitive-diagnosisPrompt');
const TREATMENT_PLAN_PROMPT = require('../prompts/treatment-planPrompt');
const PROGNOSIS_PROMPT = require('../prompts/prognosisPrompt');

// Keys match DB enum `clinical_section` (Spanish) — no translation layer.
const PROMPTS = {
  anamnesis: ANAMNESIS_PROMPT,
  examen_fisico: PHYSICAL_EXAM_PROMPT,
  problemas: PROBLEMS_PROMPT,
  abordaje_diagnostico: DIAGNOSTIC_APPROACH_PROMPT,
  examenes_complementarios: COMPLEMENTARY_EXAMS_PROMPT,
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
