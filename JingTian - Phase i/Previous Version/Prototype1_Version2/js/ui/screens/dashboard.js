/* SQUARE — Screen 6: Dashboard (User Control Centre). */
window.SQ = window.SQ || {};
SQ.screens = SQ.screens || {};

(function () {
  "use strict";
  const U = () => SQ.ui;

  function render() {
    const report = SQ.store.getActiveReport();
    if (!report) return emptyDashboard();

    const analysis = SQ.store.getAnalysis(report.id) || SQ.store.runAnalysis(report.id);
    const cv = analysis.cv;
    const safety = analysis.safety;
    const recs = analysis.recommendations;
    const doneCount = recs.filter((r) => SQ.store.state.actionPlanDone[r.code]).length;

    const safetyBanner = safety.overall === "emergency" || safety.overall === "urgent"
      ? U().callout(safety.overall === "emergency" ? "bad" : "warn", safety.level.label, U().esc(safety.level.description) + " " + U().esc(safety.level.action) + ` <a href="#/referral">View guidance →</a>`)
      : "";

    return `
    ${safetyBanner}
    <div class="section-title" style="margin-top:${safetyBanner ? "18px" : "0"}">Your latest snapshot</div>
    <div class="grid cols-4">
      ${U().snapTile("Blood pressure", cv.bp ? cv.bp.sbp + "/" + cv.bp.dbp : "—", false)}
      ${U().snapTile("LDL cholesterol", cv.lipids.ldl.value != null ? cv.lipids.ldl.value + " mmol/L" : "—")}
      ${U().snapTile("10-yr CV risk", cv.framingham.eligible ? cv.framingham.riskPercent + "%" : "N/A", true)}
      ${U().snapTile("Action items done", doneCount + " / " + recs.length)}
    </div>

    <div class="section-title">Health domains</div>
    <div class="grid cols-3">
      ${SQ.DOMAIN_ORDER.map((key) => {
        const d = SQ.DOMAINS[key];
        let summaryText = "Not yet reviewed";
        let pillHtml = "";
        if (key === "cardiovascular") {
          summaryText = cv.bp ? cv.bp.label + " · " + (cv.lipids.ldl.value != null ? "LDL " + cv.lipids.ldl.value : "") : "Real clinical logic";
          pillHtml = U().pill(cv.bp ? cv.bp.tone : "info", "Real spec");
        } else {
          const dom = analysis[key];
          summaryText = dom ? dom.note.split("—")[0].trim() : "Illustrative";
          pillHtml = U().pill("neutral", "Illustrative");
        }
        return U().domainCard(key, summaryText, { clickable: true, onclick: `SQ.router.navigate('domain/${key}')`, pill: pillHtml });
      }).join("")}
    </div>

    <div class="grid cols-2" style="margin-top:22px">
      ${U().card(`<h3 style="font-size:1.05rem">Continue your action plan</h3>
        <p style="color:var(--muted);font-size:.88rem;margin-top:6px">${recs.length} personalised recommendations from this report.</p>
        <div style="margin-top:14px">${U().btn("Open action plan", { href: "action-plan" })}</div>`)}
      ${U().card(`<h3 style="font-size:1.05rem">Full report</h3>
        <p style="color:var(--muted);font-size:.88rem;margin-top:6px">Download or print a structured summary of this result.</p>
        <div style="margin-top:14px">${U().btn("View full report", { href: "report", variant: "outline" })}</div>`)}
    </div>

    <div class="section-title">Report used for this snapshot</div>
    ${U().card(`<div class="card-row">
      <div><strong>${U().esc(report.fileName)}</strong><div style="color:var(--muted);font-size:.85rem;margin-top:4px">${U().esc(report.lab)} · ${U().esc(report.reportDate)}</div></div>
      <div style="display:flex;gap:8px">${U().btn("View library", { href: "reports", variant: "outline", sm: true })}${U().btn("Upload new", { href: "upload", sm: true })}</div>
    </div>`)}
    `;
  }

  function emptyDashboard() {
    return `
    ${U().card(`
      <div class="empty-state">
        <h3 style="color:var(--navy)">No reports yet</h3>
        <p style="margin-top:8px;color:var(--muted)">Upload a blood report to get your first personalised health snapshot, or load a sample to explore SQUARE.</p>
        <div style="display:flex;gap:10px;justify-content:center;margin-top:18px;flex-wrap:wrap">
          ${U().btn("Upload a report", { href: "upload" })}
          ${U().btn("Load routine sample", { variant: "outline", onclick: "SQ.act.tryDemo('routine')" })}
          ${U().btn("Load urgent sample", { variant: "outline", onclick: "SQ.act.tryDemo('urgent')" })}
        </div>
      </div>`)}
    `;
  }

  SQ.screens.dashboard = { render };
})();
