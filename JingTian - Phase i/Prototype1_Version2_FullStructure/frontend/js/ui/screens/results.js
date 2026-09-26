/* EVA SQUARE — Screen 12: single-marker result detail. Route: results/:code
 * Ported from frontend-v2. Cardiovascular classification text still says
 * "see domain tab" (v2 didn't have a scale visual); this build additionally
 * shows the quantity's full reference scale (Requirement #2) right on this
 * page — always expanded here, since the whole screen is already about
 * this one marker.
 */
window.SQ = window.SQ || {};
SQ.screens = SQ.screens || {};

(function () {
  "use strict";
  const U = () => SQ.ui;

  function render(params) {
    const code = params[0];
    if (!SQ.store.state.activeReportId) return U().emptyState("No report yet — upload one first.");
    const report = SQ.store.getActiveReport();
    if (!report) return U().loadingState("Loading report…");
    if (!code) return U().emptyState("Choose a marker from your report to see its detail here.");
    const meta = SQ.labDictionary[code];
    if (!meta) return U().emptyState("Unknown marker.");
    if (report.status !== "verified") return U().notReady(report);
    const analysis = SQ.store.getAnalysis(report.id);
    if (!analysis) return U().loadingState("Analysing your results…");
    const value = (report.labsVerified || report.labsRaw || {})[code];
    const history = (report.trendHistory && report.trendHistory[code]) || [];

    let band, tone, source;
    if (meta.domain === "cardiovascular") {
      band = "See domain tab for full classification"; tone = "info"; source = "Cardiovascular Domain Specification";
    } else {
      const scale = SQ.referenceScales ? SQ.referenceScales[code] : null;
      const b = scale && value != null ? (scale.bands || []).find((x) => value >= x.from && value <= x.to) : null;
      band = b ? b.label : "Not classified"; tone = b ? b.tone : "neutral"; source = scale ? scale.source : "";
    }
    const eduCode = { LAB_LDL: "EDU_LDL_001", LAB_APOB: "EDU_APOB_001", LAB_LPA: "EDU_LPA_001", LAB_GLU_FAST: "EDU_GLUCOSE_001", LAB_ALT: "EDU_ALT_001" }[code];
    const explanation = (eduCode && SQ.education[eduCode]) || "This value is compared against a reference range to help you understand whether it needs attention.";
    const scaleKey = SQ.referenceScales && SQ.referenceScales[code] ? code : null;

    return `
    <div class="card-row" style="margin-bottom:16px">
      <div><h2 style="font-size:1.3rem;color:var(--navy)">${U().esc(meta.name)}</h2>
      <p style="color:var(--muted);font-size:.88rem;margin-top:4px">${U().esc((meta.altNames || []).join(", "))}</p></div>
      ${U().btn("Back to domain", { onclick: `SQ.router.navigate('domain/${meta.domain}')`, variant: "outline", sm: true })}
    </div>
    <div class="grid cols-3">
      ${U().snapTile("Latest value", value != null ? value + " " + meta.unit : "—")}
      ${U().snapTile("Classification", band, true)}
      ${U().snapTile("Source", meta.source === "real" ? "Clinical spec" : "Illustrative", true)}
    </div>
    <div style="height:16px"></div>
    <div class="grid cols-2">
      ${U().card(`<h3 style="font-size:1rem">What this means</h3><p style="margin-top:10px;color:#33405a;font-size:.9rem">${U().esc(explanation)}</p>${source ? `<p style="margin-top:10px;font-size:.76rem;color:var(--muted-2)">Source: ${U().esc(source)}</p>` : ""}`)}
      ${U().card(history.length ? `<h3 style="font-size:1rem">Trend</h3><div style="margin-top:14px">${U().timeline(history.map((h) => ({ label: h.value, sub: h.date })))}</div>` : `<h3 style="font-size:1rem">Trend</h3><p style="margin-top:10px;color:var(--muted);font-size:.88rem">Not enough history yet — this value will appear on Trends after your next report.</p>`)}
    </div>
    ${scaleKey ? `<div style="height:16px"></div>${U().card(U().scaleRow.standalone(scaleKey, value))}` : ""}
    `;
  }

  SQ.screens.results = { render };
})();
