/* SQUARE — Screen 12: single-marker result detail. Route: results/:code */
window.SQ = window.SQ || {};
SQ.screens = SQ.screens || {};

(function () {
  "use strict";
  const U = () => SQ.ui;

  function render(params) {
    const code = params[0];
    const report = SQ.store.getActiveReport();
    if (!report) return U().emptyState("No report yet — upload one first.");
    if (!code) return U().emptyState("Choose a marker from your report to see its detail here.");
    const meta = SQ.labDictionary[code];
    if (!meta) return U().emptyState("Unknown marker.");
    const analysis = SQ.store.getAnalysis(report.id) || SQ.store.runAnalysis(report.id);
    const value = (report.labsVerified || report.labsRaw || {})[code];
    const history = (report.trendHistory && report.trendHistory[code]) || [];

    let band, tone, explanation, source;
    if (meta.domain === "cardiovascular") {
      band = "See domain tab for full classification"; tone = "info"; source = "Cardiovascular Domain Specification";
    } else {
      const r = SQ.engines.ruleEngine.classifyByRange(code, value);
      band = r ? r.label : "Not classified"; tone = r ? r.tone : "neutral"; source = r ? r.source : "";
    }
    const eduCode = { LAB_LDL: "EDU_LDL_001", LAB_APOB: "EDU_APOB_001", LAB_LPA: "EDU_LPA_001", LAB_GLU_FAST: "EDU_GLUCOSE_001", LAB_ALT: "EDU_ALT_001" }[code];
    explanation = (eduCode && SQ.education[eduCode]) || "This value is compared against a reference range to help you understand whether it needs attention.";

    return `
    <div class="card-row" style="margin-bottom:16px">
      <div><h2 style="font-size:1.3rem;color:var(--navy)">${U().esc(meta.name)}</h2>
      <p style="color:var(--muted);font-size:.88rem;margin-top:4px">${U().esc(meta.altNames.join(", "))}</p></div>
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
    `;
  }

  SQ.screens.results = { render };
})();
