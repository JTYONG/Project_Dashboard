/* EVA SQUARE — Screen 14: Action Plan (Intervention & Escalation).
 * Ported from frontend-v2 — content unchanged; analysis + completion
 * state now come from the backend (GET /api/reports/:id/analysis,
 * GET/POST /api/action-plan — see js/store.js).
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
    const recs = analysis.recommendations;
    const done = SQ.store.state.actionPlanDone;
    const doneCount = recs.filter((r) => done[r.code]).length;

    const cards = recs.map((r, i) => `
      ${U().card(`
        <div class="priority-card">
          <div class="top-row">
            ${U().numBadge(i + 1)}
            <div style="flex:1">
              <h4>${U().esc(r.issue)}</h4>
              <p>${U().esc(r.action)}</p>
            </div>
            ${U().toggle("done-" + r.code, !!done[r.code], `SQ.act.toggleAction('${r.code}')`)}
          </div>
          <div class="hr"></div>
          <p style="font-size:.84rem;color:#33405a"><strong>Why:</strong> ${U().esc(r.why)}</p>
          <p style="font-size:.84rem;color:#33405a;margin-top:6px"><strong>Benefit:</strong> ${U().esc(r.benefit)}</p>
          <div class="actions">
            <span style="color:var(--warn)">⚠ ${U().esc(r.precaution)}</span>
            <span style="color:var(--muted)">Follow-up: ${U().esc(r.followUp)}</span>
          </div>
        </div>
      `)}
    `).join("");

    return `
    <div class="grid cols-3" style="margin-bottom:20px">
      ${U().snapTile("Recommendations", recs.length)}
      ${U().snapTile("Completed", doneCount + " / " + recs.length)}
      ${U().snapTile("Overall pathway", analysis.safety.level.label, true)}
    </div>
    ${recs.length ? `<div class="stack">${cards}</div>` : U().emptyState("No recommendations were triggered for this report.")}
    `;
  }

  SQ.screens.actionPlan = { render };
})();
