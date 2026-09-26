/* SQUARE — Evaluates data/recommendations.js#SQ.recommendations against the
 * assembled findings object ("fh") produced by store.js, and ranks the
 * matches for the Action Plan screen (Screen 14).
 */
window.SQ = window.SQ || {};
SQ.engines = SQ.engines || {};

(function () {
  "use strict";

  function evaluate(fh) {
    if (!fh) return [];
    return SQ.recommendations
      .filter((r) => {
        try { return !!r.when(fh); } catch (e) { return false; }
      })
      .sort((a, b) => b.weight - a.weight);
  }

  function educationFor(codes) {
    return (codes || []).map((c) => ({ code: c, text: SQ.education[c] })).filter((e) => e.text);
  }

  SQ.engines.recommendationEngine = { evaluate, educationFor };
})();
