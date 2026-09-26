/* SQUARE — Assembles the printable/downloadable report (Screen 17) in the
 * block order defined by the Cardiovascular Domain Specification's
 * "report-generation rules": Safety status → Headline → BP → 10-year risk →
 * Core lipids → Advanced lipids → Supplementary indices → Risk modifiers →
 * "Why this result" → Actions → Follow-up. Illustrative domains are
 * appended after the cardiovascular blocks, clearly labelled.
 */
window.SQ = window.SQ || {};
SQ.engines = SQ.engines || {};

(function () {
  "use strict";

  function headline(cv) {
    if (!cv) return "Your report is ready to review.";
    const bits = [];
    if (cv.bp) bits.push(cv.bp.label.toLowerCase() + " blood pressure");
    if (cv.lipids && cv.lipids.ldl && cv.lipids.ldl.value != null) {
      bits.push((cv.lipids.ldl.value >= 3.4 ? "elevated" : "acceptable") + " LDL-cholesterol");
    }
    if (cv.framingham && cv.framingham.eligible) bits.push(cv.framingham.band.toLowerCase() + " estimated 10-year cardiovascular risk");
    if (!bits.length) return "Your cardiovascular results are summarised below.";
    return "This report shows " + bits.join(", ") + ".";
  }

  function build(scenario, cv, others, safety, recs) {
    const blocks = [];

    blocks.push({ id: "safety", title: "Safety status",
      body: safety.overall === "self" ? "No emergency or urgent flags were identified in this report." :
        (safety.level.description + " " + safety.level.action) });

    blocks.push({ id: "headline", title: "Headline", body: headline(cv) });

    if (cv && cv.bp) {
      blocks.push({ id: "bp", title: "Blood pressure",
        body: cv.bp.sbp + "/" + cv.bp.dbp + " mmHg — " + cv.bp.label + ". " + cv.bp.note });
    }

    if (cv && cv.framingham) {
      blocks.push({ id: "risk", title: "10-year cardiovascular risk",
        body: cv.framingham.eligible
          ? "Estimated at " + cv.framingham.riskPercent + "% (" + cv.framingham.band + "). " + cv.framingham.caution
          : "Not calculated: " + cv.framingham.reasons.join(" ") });
    }

    if (cv && cv.lipids) {
      blocks.push({ id: "core-lipids", title: "Core lipids",
        body: "Total cholesterol " + cv.lipids.tc + " mmol/L, LDL-C " + (cv.lipids.ldl.value != null ? cv.lipids.ldl.value + " mmol/L" + (cv.lipids.ldl.measured ? "" : " (calculated)") : "not available") +
          ", HDL-C " + cv.lipids.hdl + " mmol/L, Triglycerides " + cv.lipids.tg + " mmol/L, Non-HDL-C " + cv.lipids.nonHdl + " mmol/L." });
    }

    if (cv && cv.advanced && (cv.advanced.apoB || cv.advanced.lpa)) {
      const parts = [];
      if (cv.advanced.apoB) parts.push("ApoB " + cv.advanced.apoB.value + " mg/dL (goal <" + cv.advanced.apoB.target + " mg/dL for your risk category)");
      if (cv.advanced.apoRatio) parts.push("ApoB/ApoA-I ratio " + cv.advanced.apoRatio.value);
      if (cv.advanced.lpa) parts.push("Lp(a) " + cv.advanced.lpa.value + " " + cv.advanced.lpa.unit + " (" + cv.advanced.lpa.band + ")");
      blocks.push({ id: "advanced-lipids", title: "Advanced lipids", body: parts.join("; ") + "." });
    }

    if (cv && cv.supplementary) {
      const s = cv.supplementary;
      const parts = [];
      if (s.aip) parts.push("AIP " + s.aip.value + " (" + s.aip.band + ")");
      if (s.castelliI) parts.push("Castelli I " + s.castelliI.value);
      if (s.castelliII) parts.push("Castelli II " + s.castelliII.value);
      blocks.push({ id: "supplementary", title: "Supplementary indices",
        body: (parts.join(", ") || "Not available") + ". These are supplementary and do not override the core lipid or risk results above." });
    }

    if (cv && (cv.fh.triggered || (cv.metabolicSyndrome && cv.metabolicSyndrome.positive) || (cv.advanced.lpa && cv.advanced.lpa.band === "Elevated / risk-enhancing"))) {
      const parts = [];
      if (cv.fh.triggered) parts.push("Possible familial hypercholesterolaemia pathway flagged: " + cv.fh.flags.join(" "));
      if (cv.metabolicSyndrome && cv.metabolicSyndrome.positive) parts.push("Metabolic syndrome criteria met (" + cv.metabolicSyndrome.criteriaMet + " of 5).");
      if (cv.advanced.lpa && cv.advanced.lpa.band === "Elevated / risk-enhancing") parts.push("Elevated Lp(a) adds inherited residual risk.");
      blocks.push({ id: "modifiers", title: "Risk modifiers", body: parts.join(" ") });
    }

    if (cv && cv.discordanceNotes && cv.discordanceNotes.length) {
      blocks.push({ id: "why", title: "Why this result", body: cv.discordanceNotes.map((n) => n.title + " — " + n.text).join("\n\n") });
    }

    if (recs && recs.length) {
      blocks.push({ id: "actions", title: "Actions", body: recs.slice(0, 5).map((r) => "• " + r.action).join("\n") });
    }

    blocks.push({ id: "followup", title: "Follow-up",
      body: safety.overall === "emergency" || safety.overall === "urgent"
        ? "Follow the urgent guidance above before your next scheduled review."
        : "Repeat a fasting lipid panel and blood pressure check at your next routine interval, or sooner if advised." });

    if (others) {
      Object.keys(others).forEach((key) => {
        const d = others[key];
        if (!d) return;
        blocks.push({ id: "domain-" + key, title: (SQ.DOMAINS[key] ? SQ.DOMAINS[key].label : key) + " (illustrative)",
          body: (d.note || "") });
      });
    }

    return { generatedAt: new Date().toISOString(), scenario: scenario.label, blocks };
  }

  SQ.engines.reportGenerator = { build, headline };
})();
