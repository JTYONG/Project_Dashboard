/**
 * Module 10 (Rule Engine / Medical Logic Engine).
 * Pure functions: given raw data, return structured findings. Nothing in
 * this file renders UI or hard-codes wording -- it only returns
 * classification codes and severities (see the "never hard-code medical
 * knowledge into the front-end" principle in the technical architecture).
 */
window.MHR = window.MHR || {};

MHR.VERSION = {
  ruleEngine: "0.1.0-demo",
  referenceRanges: "0.1.0-demo (illustrative, unvalidated)",
  riskEngine: "0.1.0-demo (simplified additive score, not a validated calculator)",
  recommendationEngine: "0.1.0-demo",
};

/** Classify a numeric value against an ordered list of {min?,max?,label,severity,redFlag} ranges. */
MHR.classify = function (value, ranges) {
  if (value === null || value === undefined || value === "" || isNaN(value)) return null;
  var v = parseFloat(value);
  for (var i = 0; i < ranges.length; i++) {
    var r = ranges[i];
    var minOk = r.min === undefined || v >= r.min;
    var maxOk = r.max === undefined || v < r.max;
    if (minOk && maxOk) {
      return { label: r.label, severity: r.severity, redFlag: !!r.redFlag };
    }
  }
  return { label: "Unclassified", severity: 0, redFlag: false };
};

/**
 * Runs every entered lab result + anthropometric derived value through its
 * classification rules and returns one flat findings array.
 * Each finding: { code, name, unit, value, domain, classification, severity, redFlag, source }
 */
MHR.runRuleEngine = function (state) {
  var findings = [];

  // --- Lab results (Module 6/8/9 -> Module 10) ---
  Object.keys(state.labResults || {}).forEach(function (code) {
    var raw = state.labResults[code];
    if (raw === "" || raw === null || raw === undefined) return;
    var test = MHR.labByCode[code];
    if (!test) return;
    var cls = MHR.classify(raw, test.ranges);
    if (!cls) return;
    findings.push({
      code: code,
      name: test.name,
      unit: test.unit,
      value: parseFloat(raw),
      domain: test.domain,
      classification: cls.label,
      severity: cls.severity,
      redFlag: cls.redFlag,
      source: test.source,
    });
  });

  // --- Anthropometric derived values (Module 3 -> Module 10) ---
  var a = state.anthro || {};
  if (a.height && a.weight) {
    var hM = a.height / 100;
    var bmi = a.weight / (hM * hM);
    var bmiCls = MHR.classify(bmi, MHR.anthroRules.BMI.ranges);
    findings.push({
      code: "BMI", name: "BMI", unit: "kg/m²", value: Math.round(bmi * 10) / 10,
      domain: MHR.anthroRules.BMI.domain, classification: bmiCls.label, severity: bmiCls.severity,
      redFlag: bmiCls.redFlag, source: MHR.anthroRules.BMI.source,
    });
  }
  if (a.waist) {
    var waistThreshold = state.demographics && state.demographics.sex === "F" ? 80 : 90;
    var wCls = a.waist >= waistThreshold
      ? { label: "Central obesity risk (above sex-specific cut-point)", severity: 2 }
      : { label: "Within expected range", severity: 0 };
    findings.push({
      code: "WAIST", name: "Waist Circumference", unit: "cm", value: a.waist,
      domain: MHR.anthroRules.WAIST.domain, classification: wCls.label, severity: wCls.severity,
      redFlag: false, source: MHR.anthroRules.WAIST.source,
    });
  }
  if (a.sbp) {
    var sCls = MHR.classify(a.sbp, MHR.anthroRules.SBP.ranges);
    findings.push({
      code: "SBP", name: "Systolic BP", unit: "mmHg", value: a.sbp,
      domain: MHR.anthroRules.SBP.domain, classification: sCls.label, severity: sCls.severity,
      redFlag: sCls.redFlag, source: MHR.anthroRules.SBP.source,
    });
  }
  if (a.dbp) {
    var dCls = MHR.classify(a.dbp, MHR.anthroRules.DBP.ranges);
    findings.push({
      code: "DBP", name: "Diastolic BP", unit: "mmHg", value: a.dbp,
      domain: MHR.anthroRules.DBP.domain, classification: dCls.label, severity: dCls.severity,
      redFlag: dCls.redFlag, source: MHR.anthroRules.DBP.source,
    });
  }

  return findings;
};
