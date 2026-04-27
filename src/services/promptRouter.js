const CHIEF_COMPLAINT_PROMPT = require('../prompts/chief-complaintPrompt');
const ANAMNESIS_PROMPT = require('../prompts/anamnesisPrompt');
const PHYSICAL_EXAM_PROMPT = require('../prompts/physical-examPrompt');
const PROBLEMS_PROMPT = require('../prompts/problemsPrompt');
const DIAGNOSTIC_APPROACH_PROMPT = require('../prompts/diagnostic-approachPrompt');
const COMPLEMENTARY_EXAMS_PROMPT = require('../prompts/complementary-examsPrompt');
const CLINICAL_DIAGNOSIS_PROMPT = require('../prompts/clinical-diagnosisPrompt');
const PRESCRIPTION_PROMPT = require('../prompts/prescriptionPrompt');
const PROGNOSIS_PROMPT = require('../prompts/prognosisPrompt');

// Sections that go through /ai/process-section. Keys match DB enum `clinical_section`.
const PROMPTS = {
  chief_complaint: CHIEF_COMPLAINT_PROMPT,
  anamnesis: ANAMNESIS_PROMPT,
  physical_exam: PHYSICAL_EXAM_PROMPT,
  problems: PROBLEMS_PROMPT,
  diagnostic_approach: DIAGNOSTIC_APPROACH_PROMPT,
  complementary_exams: COMPLEMENTARY_EXAMS_PROMPT,
  clinical_diagnosis: CLINICAL_DIAGNOSIS_PROMPT,
  prescription: PRESCRIPTION_PROMPT,
  prognosis: PROGNOSIS_PROMPT,
};

const AI_SECTIONS = Object.keys(PROMPTS);

// Tap-only sections persisted via PATCH but NOT routed through the AI utility
// (frontend writes structured `content` directly).
const TAP_ONLY_SECTIONS = ['food', 'vitals', 'treatment'];

// Superset accepted by PATCH /consultation/:id/sections/:section and attachment uploads.
const VALID_SECTIONS = [...AI_SECTIONS, ...TAP_ONLY_SECTIONS];

function getPrompt(section) {
  return PROMPTS[section] || null;
}

function isAiSection(section) {
  return AI_SECTIONS.includes(section);
}

function isValidSection(section) {
  return VALID_SECTIONS.includes(section);
}

module.exports = {
  getPrompt,
  isAiSection,
  isValidSection,
  AI_SECTIONS,
  TAP_ONLY_SECTIONS,
  VALID_SECTIONS,
};
