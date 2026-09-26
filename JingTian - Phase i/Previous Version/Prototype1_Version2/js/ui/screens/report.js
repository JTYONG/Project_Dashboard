/* SQUARE — Screen 16: Full structured report (printable/downloadable). */
window.SQ = window.SQ || {};
SQ.screens = SQ.screens || {};

(function () {
  "use strict";
  const U = () => SQ.ui;

  function render() {
    const report = SQ.store.getActiveReport();
    if (!report) return U().emptyState("No report yet — upload one first.");
    const analysis = SQ.store.getAnalysis(report.id) || SQ.store.runAnalysis(report.id);
    const r = analysis.report;

    return `
    <div class="card-row print-hidden" style="margin-bottom:16px">
      <div style="color:var(--muted);font-size:.85rem">Generated ${new Date(r.generatedAt).toLocaleString()}</div>
      <div style="display:flex;gap:10px">${U().btn("Print / Save as PDF", { onclick: "window.print()", variant: "outline", sm: true })}</div>
    </div>
    ${U().card(`
      <h2 style="font-size:1.4rem">SQUARE Health Report</h2>
      <p style="color:var(--muted);font-size:.88rem;margin-top:4px">${U().esc(r.scenario)} · ${U().esc(report.reportDate)} · ${U().esc(SQ.ORG.legalName)}</p>
      <div class="hr"></div>
      ${r.blocks.map((b) => `
        <div class="legal-section">
          <h3 style="font-size:1.02rem">${U().esc(b.title)}</h3>
          <p style="white-space:pre-line;color:#33405a;font-size:.9rem;margin-top:6px">${U().nl2br(b.body)}</p>
        </div>
      `).join("")}
      <div class="hr"></div>
      <p style="font-size:.78rem;color:var(--muted-2)">This report is generated for informational and educational purposes only and is not a medical diagnosis. If you may have a medical emergency, call 999.</p>
    `)}
    `;
  }

  SQ.screens.report = { render };
})();
