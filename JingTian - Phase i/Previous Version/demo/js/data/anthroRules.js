/**
 * Module 3 (Anthropometric Profile) derived-value classifications, stored
 * separately from raw values per the "raw vs. calculated vs. classification"
 * rule in the framework. Also demo thresholds -- see labDictionary.js header.
 */
window.MHR = window.MHR || {};

MHR.anthroRules = {
  BMI: {
    name: "BMI",
    unit: "kg/m²",
    domain: MHR.DOMAINS.METABOLIC,
    source: "Demo threshold (WHO-style, general population) -- pending clinical validation",
    ranges: [
      { max: 18.5, label: "Underweight", severity: 1 },
      { min: 18.5, max: 23, label: "Normal", severity: 0 },
      { min: 23, max: 27.5, label: "Overweight", severity: 1 },
      { min: 27.5, label: "Obese", severity: 2 },
    ],
  },
  WAIST: {
    name: "Waist Circumference",
    unit: "cm",
    domain: MHR.DOMAINS.METABOLIC,
    source: "Demo threshold (Asian cut-points, illustrative) -- pending clinical validation",
    // sex-specific: handled in code, thresholds passed at call time
  },
  SBP: {
    name: "Systolic Blood Pressure",
    unit: "mmHg",
    domain: MHR.DOMAINS.CARDIO,
    source: "Demo threshold -- pending clinical validation",
    ranges: [
      { max: 120, label: "Normal", severity: 0 },
      { min: 120, max: 130, label: "Elevated", severity: 1 },
      { min: 130, max: 140, label: "Stage 1 Hypertension", severity: 2 },
      { min: 140, max: 180, label: "Stage 2 Hypertension", severity: 3 },
      { min: 180, label: "Hypertensive crisis range", severity: 5, redFlag: true },
    ],
  },
  DBP: {
    name: "Diastolic Blood Pressure",
    unit: "mmHg",
    domain: MHR.DOMAINS.CARDIO,
    source: "Demo threshold -- pending clinical validation",
    ranges: [
      { max: 80, label: "Normal", severity: 0 },
      { min: 80, max: 90, label: "Stage 1 Hypertension", severity: 2 },
      { min: 90, max: 120, label: "Stage 2 Hypertension", severity: 3 },
      { min: 120, label: "Hypertensive crisis range", severity: 5, redFlag: true },
    ],
  },
};
