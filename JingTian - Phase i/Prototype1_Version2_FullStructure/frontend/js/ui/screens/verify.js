/* EVA SQUARE — Screen 8: Verify Extracted Results (Data Acquisition &
 * Processing, step 2). Ported from frontend-v2 — content unchanged; only
 * addition is a loading gate for the (usually instant) case where the
 * active report isn't cached yet.
 */
window.SQ = window.SQ || {};
SQ.screens = SQ.screens || {};

(function () {
  "use strict";
  const U = () => SQ.ui;

  function confidencePill(pct) {
    if (pct == null) return "";
    const tone = pct >= 95 ? "good" : pct >= 80 ? "warn" : "bad";
    return U().pill(tone, pct + "% confidence");
  }

  function render() {
    if (!SQ.store.state.activeReportId) return U().emptyState("No report to verify yet — upload one first.");
    const report = SQ.store.getActiveReport();
    if (!report) return U().loadingState("Loading report…");
    const labs = report.labsRaw || {};
    const conf = report.labConfidence || {};

    const rows = Object.keys(labs).map((code) => {
      const meta = SQ.labDictionary[code];
      if (!meta) return "";
      return `<tr>
        <td>${U().esc(meta.name)}${meta.source === "illustrative" ? ` <span class="pill neutral" style="margin-left:6px">illustrative</span>` : ""}</td>
        <td><input type="number" step="any" id="verify-${code}" value="${labs[code]}"></td>
        <td>${U().esc(meta.unit)}</td>
        <td>${confidencePill(conf[code])}</td>
      </tr>`;
    }).join("");

    return `
    ${U().stepper(["Upload", "Verify", "Answer", "Analyse"], 1)}
    <div class="grid cols-2" style="align-items:start">
      ${U().card(`
        <h3 style="font-size:1.05rem">Extracted results</h3>
        <p style="color:var(--muted);font-size:.86rem;margin:6px 0 14px">Compare each value against your original report. Edit anything that looks wrong before continuing.</p>
        <table class="data-table"><thead><tr><th>Test</th><th>Value</th><th>Unit</th><th>Confidence</th></tr></thead><tbody>${rows}</tbody></table>
        <div style="margin-top:18px;display:flex;gap:10px;flex-wrap:wrap">
          ${U().btn("Confirm & continue", { onclick: "SQ.act.confirmVerify()" })}
          ${U().btn("Re-upload instead", { href: "upload", variant: "outline" })}
        </div>
      `)}
      ${U().card(`
        <h3 style="font-size:1.05rem">Original report text</h3>
        <p style="color:var(--muted);font-size:.86rem;margin:6px 0 14px">${U().esc(report.fileName)} · ${U().esc(report.lab)} · ${U().esc(report.reportDate)}</p>
        <pre style="white-space:pre-wrap;font-size:.78rem;background:#f8f9fb;border:1px solid var(--border-2);border-radius:8px;padding:14px;max-height:420px;overflow:auto">${U().esc(report.originalText || "")}</pre>
      `)}
    </div>
    `;
  }

  SQ.screens.verify = { render };
})();
