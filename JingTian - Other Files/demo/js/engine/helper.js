/**
 * Small shared helper passed into trigger/recommendation `when()` functions
 * so they can query findings without re-implementing lookups everywhere.
 */
window.MHR = window.MHR || {};

MHR.buildFindingsHelper = function (findings, state, overallSeverity) {
  return {
    findings: findings,
    answers: (state && state.answers) || {},
    overallSeverity: overallSeverity,
    sevOf: function (code) {
      var f = findings.find(function (x) { return x.code === code; });
      return f ? f.severity : 0;
    },
    has: function (code) {
      return findings.some(function (x) { return x.code === code; });
    },
  };
};

/** Module 11: Question Trigger Engine -- returns only the triggers that fired. */
MHR.runQuestionEngine = function (findingsHelper) {
  return MHR.questionTriggers.filter(function (t) { return t.when(findingsHelper); });
};

/** Module 15/16: Recommendation Engine -- returns matching recommendations, ranked. */
MHR.runRecommendationEngine = function (findingsHelper) {
  var matched = MHR.recommendations.filter(function (r) { return r.when(findingsHelper); });
  // De-duplicate the "everything normal" fallback if any real recommendation matched
  if (matched.length > 1) matched = matched.filter(function (r) { return r.code !== "REC_MONITOR_001"; });
  matched.sort(function (a, b) { return b.weight - a.weight; });
  return {
    top: matched.slice(0, 3),
    secondary: matched.slice(3),
  };
};
