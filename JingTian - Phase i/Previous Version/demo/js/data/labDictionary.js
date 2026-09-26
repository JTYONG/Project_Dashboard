/**
 * Module 6 (Laboratory Test Master Database) + Module 8 (Reference Range
 * Database) + Module 9 (Clinical Classification Standard Database), merged
 * into one demo dataset for simplicity.
 *
 * IMPORTANT: The ranges below are commonly-cited illustrative thresholds
 * (ADA/NCEP-ATP-III-style cut points) included so this prototype has
 * something real to compute against. They are NOT validated clinical
 * content and must be replaced by the Four Master Matrices (see the
 * technical architecture deck, Module 9 / Module 22) before any real
 * clinical use. Every rule below carries a "source" field for exactly
 * this reason -- so it is obvious, at a glance, what still needs sign-off.
 */
window.MHR = window.MHR || {};

MHR.SEVERITY = {
  0: { label: "Within expected range", color: "#2f9e44" },
  1: { label: "Optimisation opportunity", color: "#66a80f" },
  2: { label: "Mild abnormality", color: "#e8b339" },
  3: { label: "Clinically relevant", color: "#e8590c" },
  4: { label: "High-risk finding", color: "#d9480f" },
  5: { label: "Potential critical finding", color: "#c92a2a" },
};

// Domain tags mirror Module 14 (Health Domain Analysis)
MHR.DOMAINS = {
  GLYCAEMIC: "Glycaemic Health",
  LIPID: "Lipid Health",
  LIVER: "Liver Health",
  KIDNEY: "Kidney Health",
  HAEM: "Haematological Health",
  CARDIO: "Cardiovascular Health",
  METABOLIC: "Metabolic Health",
};

MHR.labDictionary = [
  {
    code: "LAB_GLU_FAST",
    name: "Fasting Plasma Glucose",
    altNames: ["FBS", "FPG"],
    unit: "mmol/L",
    domain: MHR.DOMAINS.GLYCAEMIC,
    source: "Demo threshold (ADA-style) -- pending clinical validation",
    ranges: [
      { max: 5.6, label: "Normal", severity: 0 },
      { min: 5.6, max: 7.0, label: "Impaired fasting glucose (prediabetes range)", severity: 2 },
      { min: 7.0, max: 15.0, label: "Diabetes range", severity: 3 },
      { min: 15.0, label: "Markedly elevated", severity: 5, redFlag: true },
    ],
  },
  {
    code: "LAB_HBA1C",
    name: "HbA1c",
    altNames: ["Glycated Hb"],
    unit: "%",
    domain: MHR.DOMAINS.GLYCAEMIC,
    source: "Demo threshold (ADA-style) -- pending clinical validation",
    ranges: [
      { max: 5.7, label: "Normal", severity: 0 },
      { min: 5.7, max: 6.5, label: "Prediabetes range", severity: 2 },
      { min: 6.5, max: 10.0, label: "Diabetes range", severity: 3 },
      { min: 10.0, label: "Markedly elevated", severity: 5, redFlag: true },
    ],
  },
  {
    code: "LAB_TC",
    name: "Total Cholesterol",
    altNames: [],
    unit: "mmol/L",
    domain: MHR.DOMAINS.LIPID,
    source: "Demo threshold (NCEP ATP III-style) -- pending clinical validation",
    ranges: [
      { max: 5.2, label: "Desirable", severity: 0 },
      { min: 5.2, max: 6.2, label: "Borderline high", severity: 1 },
      { min: 6.2, label: "High", severity: 2 },
    ],
  },
  {
    code: "LAB_LDL",
    name: "LDL Cholesterol",
    altNames: ["LDL-C"],
    unit: "mmol/L",
    domain: MHR.DOMAINS.LIPID,
    source: "Demo threshold (NCEP ATP III-style) -- pending clinical validation",
    ranges: [
      { max: 2.6, label: "Optimal", severity: 0 },
      { min: 2.6, max: 3.4, label: "Near optimal", severity: 0 },
      { min: 3.4, max: 4.1, label: "Borderline high", severity: 1 },
      { min: 4.1, max: 4.9, label: "High", severity: 2 },
      { min: 4.9, label: "Very high", severity: 3 },
    ],
  },
  {
    code: "LAB_HDL",
    name: "HDL Cholesterol",
    altNames: ["HDL-C"],
    unit: "mmol/L",
    domain: MHR.DOMAINS.LIPID,
    source: "Demo threshold -- pending clinical validation",
    higherIsBetter: true,
    ranges: [
      { max: 1.0, label: "Low (risk factor)", severity: 2 },
      { min: 1.0, max: 1.55, label: "Acceptable", severity: 0 },
      { min: 1.55, label: "High (protective)", severity: 0 },
    ],
  },
  {
    code: "LAB_TG",
    name: "Triglycerides",
    altNames: [],
    unit: "mmol/L",
    domain: MHR.DOMAINS.LIPID,
    source: "Demo threshold (NCEP ATP III-style) -- pending clinical validation",
    ranges: [
      { max: 1.7, label: "Normal", severity: 0 },
      { min: 1.7, max: 2.3, label: "Borderline high", severity: 1 },
      { min: 2.3, max: 5.6, label: "High", severity: 2 },
      { min: 5.6, label: "Very high", severity: 4, redFlag: true },
    ],
  },
  {
    code: "LAB_ALT",
    name: "ALT",
    altNames: ["SGPT"],
    unit: "U/L",
    domain: MHR.DOMAINS.LIVER,
    source: "Demo threshold -- pending clinical validation",
    ranges: [
      { max: 41, label: "Normal", severity: 0 },
      { min: 41, max: 82, label: "Mildly elevated (up to 2x ULN)", severity: 2 },
      { min: 82, max: 205, label: "Moderately elevated", severity: 3 },
      { min: 205, label: "Markedly elevated", severity: 5, redFlag: true },
    ],
  },
  {
    code: "LAB_CREAT",
    name: "Creatinine",
    altNames: ["Serum Creatinine"],
    unit: "µmol/L",
    domain: MHR.DOMAINS.KIDNEY,
    source: "Demo threshold -- pending clinical validation",
    ranges: [
      { max: 106, label: "Normal", severity: 0 },
      { min: 106, max: 150, label: "Mildly elevated", severity: 2 },
      { min: 150, max: 300, label: "Elevated", severity: 3 },
      { min: 300, label: "Markedly elevated", severity: 5, redFlag: true },
    ],
  },
  {
    code: "LAB_HB",
    name: "Haemoglobin",
    altNames: ["Hb"],
    unit: "g/L",
    domain: MHR.DOMAINS.HAEM,
    source: "Demo threshold -- pending clinical validation",
    lowerIsBad: true,
    ranges: [
      { max: 90, label: "Markedly low", severity: 5, redFlag: true },
      { min: 90, max: 110, label: "Moderately low", severity: 3 },
      { min: 110, max: 130, label: "Mildly low", severity: 2 },
      { min: 130, max: 170, label: "Normal", severity: 0 },
      { min: 170, label: "Elevated", severity: 1 },
    ],
  },
];

MHR.labByCode = {};
MHR.labDictionary.forEach(function (t) { MHR.labByCode[t.code] = t; });
