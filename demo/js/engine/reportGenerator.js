/**
 * Module 19 (Report Generation Module).
 * Assembles the outputs of every other engine into one structured report
 * object. Rendering that object to HTML is a UI concern and lives in
 * app.js -- this file only assembles data, per the "medical logic vs.
 * front-end" separation described in the technical architecture.
 */
window.MHR = window.MHR || {};

MHR.generateReport = function (state) {
  var findings = MHR.runRuleEngine(state);
  var overallSeverity = findings.reduce(function (m, f) { return Math.max(m, f.severity); }, 0);
  var fh = MHR.buildFindingsHelper(findings, state, overallSeverity);

  var redFlag = MHR.runRedFlagEngine(findings);
  var domains = MHR.runDomainEngine(findings);
  var risk = MHR.runRiskEngine(state, findings);
  var triggeredQuestions = MHR.runQuestionEngine(fh);

  // Principle 3 -- safety overrides wellness: only compute/display
  // recommendations on the Routine or Medical-Review pathways; suppress
  // routine wellness framing entirely on Prompt/Urgent pathways.
  var recs = { top: [], secondary: [] };
  if (redFlag.pathway.key === "ROUTINE" || redFlag.pathway.key === "MEDICAL_REVIEW") {
    recs = MHR.runRecommendationEngine(fh);
  }

  return {
    generatedAt: state.__now || new Date().toISOString(),
    userId: state.userId,
    demographics: state.demographics,
    anthro: state.anthro,
    findings: findings,
    overallSeverity: overallSeverity,
    domains: domains,
    risk: risk,
    redFlag: redFlag,
    triggeredQuestions: triggeredQuestions,
    recommendations: recs,
    versions: MHR.VERSION,
  };
};
