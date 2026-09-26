/* SQUARE — Adaptive Health Questionnaire logic (Screen 9): a section is
 * shown only when the uploaded report touched a lab in that section's
 * triggerDomains, plus any section whose triggerDomains is empty (always
 * shown — used for the safety-relevant "Medication & History" section).
 */
window.SQ = window.SQ || {};
SQ.engines = SQ.engines || {};

(function () {
  "use strict";

  // presentDomains: array of domain keys with at least one uploaded/verified lab value.
  function activeSections(presentDomains) {
    const domains = presentDomains || [];
    return SQ.questionnaireSections.filter((section) =>
      section.triggerDomains.length === 0 || section.triggerDomains.some((d) => domains.includes(d))
    );
  }

  function domainsPresentInLabs(labValues) {
    const present = new Set();
    Object.keys(labValues || {}).forEach((code) => {
      const meta = SQ.labDictionary[code];
      if (meta && labValues[code] != null) present.add(meta.domain);
    });
    return Array.from(present);
  }

  function isComplete(section, answers) {
    return section.questions.every((q) => {
      const v = answers[q.id];
      if (q.type === "bp-pair") return v && v.sbp != null && v.dbp != null;
      if (q.type === "choice-with-text") return v != null && v !== "";
      return v != null && v !== "";
    });
  }

  SQ.engines.questionEngine = { activeSections, domainsPresentInLabs, isComplete };
})();
