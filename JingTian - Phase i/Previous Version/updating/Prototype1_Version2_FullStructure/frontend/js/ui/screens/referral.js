/* EVA SQUARE — Screen 15: Referral & Next Steps (four-level safety
 * ladder). Ported from frontend-v2 — content unchanged.
 */
window.SQ = window.SQ || {};
SQ.screens = SQ.screens || {};

(function () {
  "use strict";
  const U = () => SQ.ui;

  function render() {
    if (!SQ.store.state.activeReportId) return U().emptyState("No report yet — upload one first.");
    const report = SQ.store.getActiveReport();
    if (!report) return U().loadingState("Loading report…");
    if (report.status !== "verified") return U().notReady(report);
    const analysis = SQ.store.getAnalysis(report.id);
    if (!analysis) return U().loadingState("Analysing your results…");
    const safety = analysis.safety;

    const reasonRows = safety.reasons.length
      ? `<table class="data-table" style="margin-top:16px"><thead><tr><th>Domain</th><th>Trigger</th><th>Level</th></tr></thead><tbody>
          ${safety.reasons.map((r) => `<tr><td>${U().esc(r.domain)}</td><td>${U().esc(r.reason)}</td><td>${U().pill(r.level === "emergency" || r.level === "urgent" ? "bad" : "warn", r.level)}</td></tr>`).join("")}
        </tbody></table>`
      : "";

    return `
    ${safety.overall === "emergency" ? U().callout("bad", "This looks like it may need emergency care", "If you have chest pain, severe breathlessness, sudden weakness, facial droop or speech difficulty — call 999 or go to the nearest emergency department now.") : ""}
    ${U().card(`
      <h3 style="font-size:1.05rem">Recommended pathway</h3>
      <p style="color:var(--muted);font-size:.87rem;margin:6px 0 16px">Based on every safety trigger across your cardiovascular results and the other illustrative domains.</p>
      ${U().safetyLadder(SQ.referralLevels, safety.overall)}
      ${reasonRows}
    `)}
    <div style="margin-top:18px;display:flex;gap:10px;flex-wrap:wrap">
      ${U().btn("View action plan", { href: "action-plan", variant: "outline" })}
      ${U().btn("View full report", { href: "report" })}
    </div>
    <div style="margin-top:18px">${U().callout("info", "Not a substitute for professional care", "EVA SQUARE does not diagnose or treat. This referral guidance reflects the information you provided and should be confirmed with a qualified healthcare professional.")}</div>
    `;
  }

  SQ.screens.referral = { render };
})();
