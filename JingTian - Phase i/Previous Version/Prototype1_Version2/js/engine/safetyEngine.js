/* SQUARE — Aggregates the Cardiovascular safety/escalation matrix (real,
 * per spec) with the other domains' simplified urgency signals into one
 * overall pathway: EMERGENCY > URGENT > PROMPT > ROUTINE > SELF, matching
 * the four-level referral ladder shown on Screen 15.
 */
window.SQ = window.SQ || {};
SQ.engines = SQ.engines || {};

(function () {
  "use strict";

  const ORDER = ["emergency", "urgent", "prompt", "routine", "self"];

  function worst(levels) {
    let best = "self";
    for (const l of levels) {
      if (!l) continue;
      if (ORDER.indexOf(l) < ORDER.indexOf(best)) best = l;
    }
    return best;
  }

  // analysis = { cv, metabolic, liver, renal, haematology, anthropometric }
  function evaluate(analysis) {
    const reasons = [];
    const levels = [];

    if (analysis.cv) {
      levels.push(analysis.cv.urgency);
      (analysis.cv.urgencyReasons || []).forEach((r) => reasons.push({ domain: "cardiovascular", level: r.level, reason: r.reason }));
    }
    ["metabolic", "liver", "renal", "haematology"].forEach((key) => {
      const d = analysis[key];
      if (d && d.summary && d.summary.urgency && d.summary.urgency !== "routine") {
        levels.push(d.summary.urgency);
        reasons.push({ domain: key, level: d.summary.urgency, reason: "Illustrative " + key + " finding outside the demo reference range." });
      }
    });

    let overall = worst(levels);
    if (overall === "routine" && reasons.length === 0) overall = "self";

    const level = SQ.referralLevels.find((r) => r.id === overall) || SQ.referralLevels[SQ.referralLevels.length - 1];

    return { overall, level, reasons };
  }

  SQ.engines.safetyEngine = { evaluate, worst, ORDER };
})();
