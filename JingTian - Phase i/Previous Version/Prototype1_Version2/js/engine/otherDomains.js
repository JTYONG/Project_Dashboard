/* SQUARE — Simplified logic for Metabolic, Liver, Renal, Haematology and
 * Anthropometric domains. Per the agreed scope for this prototype, only
 * Cardiovascular has a real specification document behind it; these four
 * domains use clearly-labelled illustrative thresholds (see labDictionary.js
 * #simpleRanges / #anthroRules) so the UI can still show a full six-domain
 * experience without overstating what's clinically validated.
 */
window.SQ = window.SQ || {};
SQ.engines = SQ.engines || {};

(function () {
  "use strict";
  const RE = () => SQ.engines.ruleEngine;

  function analyzeMetabolic(labs, q) {
    const glucose = RE().classifyByRange("LAB_GLU_FAST", labs.LAB_GLU_FAST);
    const hba1c = RE().classifyByRange("LAB_HBA1C", labs.LAB_HBA1C);
    const glucoseFlag = !!(glucose && glucose.tone !== "good") || !!(hba1c && hba1c.tone !== "good") || q.diagnosedDiabetes === "Yes";
    const urgency = (glucose && glucose.band === "severe-high") || (hba1c && hba1c.band === "severe-high") ? "prompt" : "routine";
    return {
      status: "illustrative", domain: "metabolic",
      results: [glucose, hba1c].filter(Boolean),
      summary: { glucoseFlag, urgency },
      note: "Illustrative demo thresholds — pending a full metabolic domain specification.",
    };
  }

  function analyzeLiver(labs, q) {
    const alt = RE().classifyByRange("LAB_ALT", labs.LAB_ALT);
    const ast = RE().classifyByRange("LAB_AST", labs.LAB_AST);
    const altFlag = !!(alt && alt.tone !== "good");
    const urgency = (alt && alt.band === "severe-high") || (ast && ast.band === "severe-high") ? "prompt" : "routine";
    return {
      status: "illustrative", domain: "liver",
      results: [alt, ast].filter(Boolean),
      summary: { altFlag, urgency },
      note: "Illustrative demo thresholds — pending a full liver domain specification.",
    };
  }

  function analyzeRenal(labs, q) {
    const creat = RE().classifyByRange("LAB_CREAT", labs.LAB_CREAT);
    const egfr = RE().classifyByRange("LAB_EGFR", labs.LAB_EGFR);
    const egfrFlag = !!(egfr && egfr.tone !== "good");
    const urgency = (egfr && egfr.band === "severe-low") ? "prompt" : "routine";
    return {
      status: "illustrative", domain: "renal",
      results: [creat, egfr].filter(Boolean),
      summary: { egfrFlag, urgency },
      note: "Illustrative demo thresholds — pending a full renal domain specification.",
    };
  }

  function analyzeHaematology(labs, q) {
    const hb = RE().classifyByRange("LAB_HB", labs.LAB_HB);
    const wbc = RE().classifyByRange("LAB_WBC", labs.LAB_WBC);
    const plt = RE().classifyByRange("LAB_PLT", labs.LAB_PLT);
    const anyFlag = [hb, wbc, plt].some((r) => r && r.tone !== "good");
    const urgency = (hb && hb.band === "severe-low") ? "prompt" : "routine";
    return {
      status: "illustrative", domain: "haematology",
      results: [hb, wbc, plt].filter(Boolean),
      summary: { anyFlag, urgency },
      note: "Illustrative demo thresholds — pending a full haematology domain specification.",
    };
  }

  function bmi(heightCm, weightKg) {
    if (!heightCm || !weightKg) return null;
    const m = heightCm / 100;
    return Math.round((weightKg / (m * m)) * 10) / 10;
  }

  function bmiCategory(value) {
    if (value == null) return null;
    const band = (SQ.anthroRules.bmi || []).find((b) => value <= b.max);
    return band ? band.label : "Obese";
  }

  function analyzeAnthropometric(profile) {
    const value = bmi(profile.height, profile.weight);
    const category = bmiCategory(value);
    const cutoff = profile.sex === "F" ? SQ.anthroRules.waist.women : SQ.anthroRules.waist.men;
    const waistFlag = profile.waist != null && cutoff != null && profile.waist >= cutoff;
    return {
      status: "illustrative", domain: "anthropometric",
      bmi: value, bmiCategory: category,
      waist: profile.waist, waistCutoff: cutoff, waistFlag,
      summary: { bmiCategory: category, waistFlag },
      note: "BMI bands are general illustrative ranges; waist cut-off uses Asian population thresholds referenced in the Cardiovascular Domain Specification's metabolic-syndrome criterion.",
    };
  }

  SQ.engines.otherDomains = {
    analyzeMetabolic, analyzeLiver, analyzeRenal, analyzeHaematology, analyzeAnthropometric, bmi, bmiCategory,
  };
})();
