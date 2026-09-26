/**
 * Module 11 (Question Trigger Engine) + Module 9 (Master Trigger Matrix).
 * Each trigger inspects the finding set and, if it matches, contributes a
 * small set of targeted questions -- never the whole questionnaire.
 * `when(findings)` receives a lookup helper; `questions` are answered
 * UNKNOWN / YES / NO / NOT APPLICABLE per the Health History Module rule.
 */
window.MHR = window.MHR || {};

MHR.questionTriggers = [
  {
    id: "TRIG_ALT",
    label: "ALT elevated",
    when: function (f) { return f.sevOf("LAB_ALT") >= 2; },
    questions: [
      "Regular alcohol intake?",
      "Any regular medication or recent new medication?",
      "Any supplements or herbal / traditional products?",
      "Known fatty liver disease?",
      "Recent unusually strenuous exercise?",
      "Any history of hepatitis?",
    ],
  },
  {
    id: "TRIG_GLYCAEMIA",
    label: "Glucose / HbA1c elevated",
    when: function (f) { return f.sevOf("LAB_GLU_FAST") >= 2 || f.sevOf("LAB_HBA1C") >= 2; },
    questions: [
      "Family history of diabetes?",
      "Symptoms of excess thirst, frequent urination, or unexplained weight loss?",
      "Any previous abnormal glucose reading?",
      "Currently on any glucose-lowering medication?",
    ],
  },
  {
    id: "TRIG_LIPID",
    label: "Cholesterol / LDL / Triglycerides elevated",
    when: function (f) { return f.sevOf("LAB_LDL") >= 2 || f.sevOf("LAB_TC") >= 2 || f.sevOf("LAB_TG") >= 2; },
    questions: [
      "Regular intake of sugary drinks or refined carbohydrates?",
      "Family history of early heart disease?",
      "Current smoking status?",
      "Recent significant weight gain?",
    ],
  },
  {
    id: "TRIG_HB_LOW",
    label: "Haemoglobin low",
    when: function (f) { return f.sevOf("LAB_HB") >= 2; },
    questions: [
      "Any bleeding symptoms (e.g. blood in stool, prolonged menstrual bleeding)?",
      "Dietary iron intake -- do you eat red meat / iron-rich foods regularly?",
      "Any previous history of anaemia?",
      "Any gastrointestinal symptoms?",
      "Currently pregnant or breastfeeding? (if applicable)",
    ],
  },
  {
    id: "TRIG_BP",
    label: "Blood pressure elevated",
    when: function (f) { return f.sevOf("SBP") >= 2 || f.sevOf("DBP") >= 2; },
    questions: [
      "High salt / processed food intake?",
      "Current stress level (low / moderate / high)?",
      "Family history of hypertension?",
      "Currently on any blood-pressure medication?",
    ],
  },
  {
    id: "TRIG_RENAL",
    label: "Creatinine elevated",
    when: function (f) { return f.sevOf("LAB_CREAT") >= 2; },
    questions: [
      "Known kidney disease?",
      "Regular use of NSAIDs / painkillers?",
      "Adequate fluid intake recently?",
      "Any swelling in legs/ankles or change in urine output?",
    ],
  },
];
