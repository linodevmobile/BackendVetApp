const SECTION_LABELS = {
  chief_complaint: {
    main_complaint: 'Motivo principal',
  },
  anamnesis: {
    previous_illnesses: 'Enfermedades previas',
    sterilized: 'Esterilizado',
    lives_with_other_animals: 'Convive con otros animales',
    number_of_births: 'Número de partos',
    previous_surgeries: 'Cirugías previas',
    vaccination: 'Vacunación',
    recent_treatments: 'Tratamientos recientes',
    recent_travel: 'Viajes recientes',
    deworming: 'Desparasitación',
  },
  physical_exam: {
    skin_and_coat: 'Piel y pelaje',
    respiratory_system: 'Sistema respiratorio',
    gastrointestinal_system: 'Sistema gastrointestinal',
    genitourinary_system: 'Sistema genitourinario',
    cardiovascular_system: 'Sistema cardiovascular',
    reproductive_system: 'Sistema reproductivo',
    musculoskeletal_system: 'Sistema musculoesquelético',
    nervous_system: 'Sistema nervioso',
    ophthalmological_system: 'Sistema oftalmológico',
    otic_system: 'Sistema ótico',
    lymph_nodes: 'Ganglios linfáticos',
    oral_cavity: 'Cavidad oral',
    other: 'Otros',
  },
  problems: {
    main_problems: 'Problemas principales',
    clinical_signs: 'Signos clínicos',
    reported_symptoms: 'Síntomas reportados',
    observations: 'Observaciones',
  },
  diagnostic_approach: {
    problems: 'Problemas',
    differential_diagnoses: 'Diagnósticos diferenciales',
    master_list: 'Lista maestra',
  },
  complementary_exams: {
    requested_lab_tests: 'Laboratorios solicitados',
    lab_results: 'Resultados de laboratorio',
    requested_imaging: 'Imágenes solicitadas',
    imaging_results: 'Resultados de imagen',
    other_exams: 'Otros exámenes',
    general_interpretation: 'Interpretación general',
  },
  presumptive_diagnosis: {
    presumptive_diagnosis: 'Diagnóstico presuntivo',
  },
  definitive_diagnosis: {
    definitive_diagnosis: 'Diagnóstico definitivo',
    confirmatory_findings: 'Hallazgos confirmatorios',
  },
  prescription: {
    prescription: 'Receta',
  },
  prognosis: {
    prognosis: 'Pronóstico',
    evolution: 'Evolución',
  },
};

function getLabel(section, key) {
  const sectionMap = SECTION_LABELS[section];
  if (sectionMap && sectionMap[key]) return sectionMap[key];
  return key.replace(/_/g, ' ');
}

module.exports = { SECTION_LABELS, getLabel };
