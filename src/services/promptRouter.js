const CHIEF_COMPLAINT_PROMPT = require('../prompts/chief-complaintPrompt');
const ANAMNESIS_PROMPT = require('../prompts/anamnesisPrompt');
const PHYSICAL_EXAM_PROMPT = require('../prompts/physical-examPrompt');
const PROBLEMS_PROMPT = require('../prompts/problemsPrompt');
const DIAGNOSTIC_APPROACH_PROMPT = require('../prompts/diagnostic-approachPrompt');
const COMPLEMENTARY_EXAMS_PROMPT = require('../prompts/complementary-examsPrompt');
const PRESUMPTIVE_DIAGNOSIS_PROMPT = require('../prompts/presumptive-diagnosisPrompt');
const DEFINITIVE_DIAGNOSIS_PROMPT = require('../prompts/definitive-diagnosisPrompt');
const PRESCRIPTION_PROMPT = require('../prompts/prescriptionPrompt');
const PROGNOSIS_PROMPT = require('../prompts/prognosisPrompt');

// Keys match DB enum `clinical_section` (English, no translation layer).
const PROMPTS = {
  chief_complaint: CHIEF_COMPLAINT_PROMPT,
  anamnesis: ANAMNESIS_PROMPT,
  physical_exam: PHYSICAL_EXAM_PROMPT,
  problems: PROBLEMS_PROMPT,
  diagnostic_approach: DIAGNOSTIC_APPROACH_PROMPT,
  complementary_exams: COMPLEMENTARY_EXAMS_PROMPT,
  presumptive_diagnosis: PRESUMPTIVE_DIAGNOSIS_PROMPT,
  definitive_diagnosis: DEFINITIVE_DIAGNOSIS_PROMPT,
  prescription: PRESCRIPTION_PROMPT,
  prognosis: PROGNOSIS_PROMPT,
};

const VALID_SECTIONS = Object.keys(PROMPTS);

function getPrompt(section) {
  return PROMPTS[section] || null;
}

function isValidSection(section) {
  return VALID_SECTIONS.includes(section);
}

module.exports = { getPrompt, isValidSection, VALID_SECTIONS };
