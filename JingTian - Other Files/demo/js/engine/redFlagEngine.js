/**
 * Module 13 (Red Flag / Escalation Module).
 * Runs BEFORE recommendations are generated (Principle: safety overrides
 * wellness advice). Returns one of four pathways.
 */
window.MHR = window.MHR || {};

MHR.PATHWAYS = {
  ROUTINE: { key: "ROUTINE", label: "Routine Wellness Pathway", tone: "good" },
  MEDICAL_REVIEW: { key: "MEDICAL_REVIEW", label: "Medical Review Recommended", tone: "warn" },
  PROMPT: { key: "PROMPT", label: "Prompt Medical Assessment", tone: "bad" },
  URGENT: { key: "URGENT", label: "Urgent Medical Assessment", tone: "critical" },
};

MHR.runRedFlagEngine = function (findings) {
  var anyRedFlag = findings.some(function (f) { return f.redFlag; });
  var maxSeverity = findings.reduce(function (m, f) { return Math.max(m, f.severity); }, 0);
  var sev4Count = findings.filter(function (f) { return f.severity === 4; }).length;
  var sev3Count = findings.filter(function (f) { return f.severity === 3; }).length;

  var pathway;
  if (anyRedFlag || maxSeverity >= 5) {
    pathway = MHR.PATHWAYS.URGENT;
  } else if (maxSeverity === 4 || sev4Count > 0) {
    pathway = MHR.PATHWAYS.PROMPT;
  } else if (maxSeverity === 3 || sev3Count >= 2) {
    pathway = MHR.PATHWAYS.MEDICAL_REVIEW;
  } else {
    pathway = MHR.PATHWAYS.ROUTINE;
  }

  var triggeredBy = findings.filter(function (f) {
    return f.redFlag || (pathway.key === "PROMPT" && f.severity === 4) ||
           (pathway.key === "MEDICAL_REVIEW" && f.severity === 3);
  });

  return { pathway: pathway, maxSeverity: maxSeverity, triggeredBy: triggeredBy };
};
