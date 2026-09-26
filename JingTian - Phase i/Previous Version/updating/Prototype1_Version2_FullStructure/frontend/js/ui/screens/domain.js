/* EVA SQUARE — Screen 13: Domain detail (6-tab view), used for all six
 * domains. Cardiovascular renders from the real engine result; the other
 * five render from the illustrative otherDomains engine, always visibly
 * labelled. Ported from frontend-v2's ui/screens/domain.js.
 *
 * Requirement #2 addition: every quantity row in the "Results" tab now
 * carries an expand chevron (▾) that reveals the quantity's full
 * reference scale beneath it (js/ui/scaleRow.js), coloured band-by-band,
 * with the patient's value marked on it. SQ.act.toggleScale() (js/app.js)
 * toggles the hidden row.
 */
window.SQ = window.SQ || {};
SQ.screens = SQ.screens || {};

(function () {
  "use strict";
  const U = () => SQ.ui;
  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "results", label: "Results" },
    { id: "how", label: "How It's Calculated" },
    { id: "modifiers", label: "Risk & Modifiers" },
    { id: "recs", label: "Recommendations" },
    { id: "education", label: "Education" },
  ];

  function render(params) {
    const key = params[0] || "cardiovascular";
    const tab = params[1] || "overview";
    if (!SQ.store.state.activeReportId) return U().emptyState("No report yet — upload one first.");
    const report = SQ.store.getActiveReport();
    if (!report) return U().loadingState("Loading report…");
    if (report.status !== "verified") return U().notReady(report);
    const analysis = SQ.store.getAnalysis(report.id);
    if (!analysis) return U().loadingState("Analysing your results…");
    const d = SQ.DOMAINS[key];
    if (!d) return U().emptyState("Unknown domain.");

    const tabsHtml = U().tabsNav(TABS.map((t) => ({ id: t.id, label: t.label, onclick: `SQ.router.navigate('domain/${key}/${t.id}')` })), tab);

    let body;
    if (key === "cardiovascular") body = cardiovascularTab(tab, analysis);
    else body = otherDomainTab(tab, key, analysis, report);

    return `
    <div class="card-row" style="margin-bottom:16px">
      <div style="display:flex;gap:14px;align-items:center">
        <div class="dic" style="width:46px;height:46px;border-radius:12px;background:${d.color}1a;color:${d.color};display:flex;align-items:center;justify-content:center;font-size:1.3rem">${d.icon}</div>
        <div><h2 style="font-size:1.3rem;color:var(--navy)">${U().esc(d.label)}</h2>
        ${key === "cardiovascular" ? U().pill("info", "Real clinical specification") : U().pill("neutral", "Illustrative demo logic")}</div>
      </div>
      ${U().btn("Back to domains", { href: "dashboard", variant: "outline", sm: true })}
    </div>
    ${tabsHtml}
    ${body}
    `;
  }

  // Builds a [main <tr>, hidden scale <tr>] pair for one results row.
  function resultRow(id, cells, tone, scaleKey, value) {
    const main = `<tr><td>${cells[0]}</td><td>${cells[1]}</td><td>${cells[2]}</td><td>${U().dotInd(tone)}</td>${U().scaleRow.toggleCell(id)}</tr>`;
    const panel = U().scaleRow.panelRow(id, scaleKey, value, 5);
    return main + panel;
  }

  function cardiovascularTab(tab, analysis) {
    const cv = analysis.cv;
    if (tab === "results") {
      // scaleKey is null where no reference-scale entry exists (e.g. the
      // ApoB/ApoA-I ratio, which has no single-number cut-off) — the
      // expand row then explains that instead of showing a scale.
      const rows = [
        { id: "cv-bp", cells: ["CV-01 Blood pressure", cv.bp ? cv.bp.sbp + "/" + cv.bp.dbp + " mmHg" : "—", cv.bp ? cv.bp.label : "—"], tone: cv.bp ? cv.bp.tone : "neutral", scaleKey: "BP_SYSTOLIC", value: cv.bp ? cv.bp.sbp : null },
        { id: "cv-frs", cells: ["CV-02 Framingham 10-yr risk", cv.framingham.eligible ? cv.framingham.riskPercent + "%" : "N/A", cv.framingham.eligible ? cv.framingham.band : "Not eligible"], tone: cv.framingham.eligible ? cv.framingham.tone : "neutral", scaleKey: "FRS_RISK", value: cv.framingham.eligible ? cv.framingham.riskPercent : null },
        { id: "cv-nonhdl", cells: ["CV-03 Non-HDL-C", cv.lipids.nonHdl + " mmol/L", "—"], tone: "neutral", scaleKey: "NON_HDL", value: cv.lipids.nonHdl },
        { id: "cv-ldl", cells: ["CV-04 LDL-C", cv.lipids.ldl.value + " mmol/L" + (cv.lipids.ldl.measured ? "" : " (calculated)"), "—"], tone: "neutral", scaleKey: "LAB_LDL", value: cv.lipids.ldl.value },
        { id: "cv-aip", cells: ["CV-05 AIP", cv.supplementary.aip ? cv.supplementary.aip.value : "—", cv.supplementary.aip ? cv.supplementary.aip.band : "—"], tone: cv.supplementary.aip ? cv.supplementary.aip.tone : "neutral", scaleKey: "AIP", value: cv.supplementary.aip ? cv.supplementary.aip.value : null },
        { id: "cv-castelli1", cells: ["CV-06 Castelli I", cv.supplementary.castelliI ? cv.supplementary.castelliI.value : "—", cv.supplementary.castelliI ? cv.supplementary.castelliI.band : "—"], tone: cv.supplementary.castelliI ? cv.supplementary.castelliI.tone : "neutral", scaleKey: "CASTELLI_I", value: cv.supplementary.castelliI ? cv.supplementary.castelliI.value : null },
        { id: "cv-castelli2", cells: ["CV-07 Castelli II", cv.supplementary.castelliII ? cv.supplementary.castelliII.value : "—", cv.supplementary.castelliII ? cv.supplementary.castelliII.band : "—"], tone: cv.supplementary.castelliII ? cv.supplementary.castelliII.tone : "neutral", scaleKey: "CASTELLI_II", value: cv.supplementary.castelliII ? cv.supplementary.castelliII.value : null },
        { id: "cv-apob", cells: ["CV-09 ApoB", cv.advanced.apoB ? cv.advanced.apoB.value + " mg/dL" : "—", cv.advanced.apoB ? (cv.advanced.apoB.aboveGoal ? "Above goal" : "At/under goal") : "—"], tone: cv.advanced.apoB ? (cv.advanced.apoB.aboveGoal ? "warn" : "good") : "neutral", scaleKey: "LAB_APOB", value: cv.advanced.apoB ? cv.advanced.apoB.value : null },
        { id: "cv-apor", cells: ["CV-10 ApoB/ApoA-I", cv.advanced.apoRatio ? cv.advanced.apoRatio.value : "—", "Lower is more favourable"], tone: "neutral", scaleKey: null, value: null },
        { id: "cv-lpa", cells: ["CV-11 Lp(a)", cv.advanced.lpa ? cv.advanced.lpa.value + " " + cv.advanced.lpa.unit : "—", cv.advanced.lpa ? cv.advanced.lpa.band : "—"], tone: cv.advanced.lpa ? cv.advanced.lpa.tone : "neutral", scaleKey: "LAB_LPA", value: cv.advanced.lpa ? cv.advanced.lpa.value : null },
        { id: "cv-tg", cells: ["CV-14 Triglycerides", cv.lipids.tg + " mmol/L", cv.tgSafety ? cv.tgSafety.tier : "—"], tone: cv.tgSafety ? cv.tgSafety.tone : "neutral", scaleKey: "LAB_TG", value: cv.lipids.tg },
      ];
      return U().card(`<table class="data-table"><thead><tr><th>Calculator</th><th>Value</th><th>Classification</th><th></th><th></th></tr></thead><tbody>
        ${rows.map((r) => resultRow(r.id, r.cells, r.tone, r.scaleKey, r.value)).join("")}
      </tbody></table>`);
    }
    if (tab === "how") {
      return U().card(`
        <div class="connect-flow">
          <div class="connect-node" style="background:var(--info-bg);color:var(--info)">TC · HDL-C · TG</div>
          <div class="connect-arrow">→</div>
          <div class="connect-node" style="background:var(--teal-lighter);color:var(--teal-dark)">Friedewald<br>LDL-C engine</div>
          <div class="connect-arrow">→</div>
          <div class="connect-node" style="background:${cv.lipids.ldl.value >= 3.4 ? "var(--warn-bg);color:var(--warn)" : "var(--good-bg);color:var(--good)"}">LDL-C<br>${cv.lipids.ldl.value} mmol/L</div>
        </div>
        <div class="connect-result"><span class="pill-lg">ℹ️ ${cv.lipids.ldl.measured ? "Measured directly by the lab" : (cv.lipids.ldl.calc.valid ? "Calculated via Friedewald formula (TG < 4.5 mmol/L)" : cv.lipids.ldl.calc.reason)}</span></div>
        <div class="hr"></div>
        <p style="font-size:.88rem;color:var(--muted)">Every cardiovascular figure on this screen traces back to the Cardiovascular Domain Specification's calculator register (CV-01–CV-14) — nothing here is a hard-coded guess.</p>
      `);
    }
    if (tab === "modifiers") {
      return `<div class="stack">
        ${U().callout(cv.fh.triggered ? "warn" : "good", "Familial hypercholesterolaemia trigger", U().esc(cv.fh.triggered ? cv.fh.flags.join(" ") + " " + cv.fh.note : "No FH trigger flags present. " + cv.fh.note))}
        ${U().callout(cv.metabolicSyndrome.positive ? "warn" : "info", "Metabolic syndrome (3 of 5 criteria)", `${cv.metabolicSyndrome.criteriaMet} of ${cv.metabolicSyndrome.criteriaKnown || 5} criteria met.` + (cv.metabolicSyndrome.note ? " " + U().esc(cv.metabolicSyndrome.note) : ""))}
        ${cv.discordanceNotes.map((n) => U().callout("info", n.title, U().esc(n.text))).join("")}
      </div>`;
    }
    if (tab === "recs") return recsList("cardiovascular", analysis);
    if (tab === "education") return educationList(["EDU_LDL_001", "EDU_APOB_001", "EDU_BP_001", "EDU_FRS_001", "EDU_LPA_001"]);
    return `<div class="grid cols-3">
      ${U().snapTile("Blood pressure", cv.bp ? cv.bp.sbp + "/" + cv.bp.dbp : "—")}
      ${U().snapTile("10-yr CV risk", cv.framingham.eligible ? cv.framingham.riskPercent + "%" : "N/A")}
      ${U().snapTile("LDL-C", cv.lipids.ldl.value + " mmol/L")}
    </div>
    <div style="height:16px"></div>
    ${U().card(`<h3 style="font-size:1rem">Headline</h3><p style="margin-top:8px;color:#33405a">${U().esc(headlineText(cv))}</p>`)}
    `;
  }

  function headlineText(cv) {
    if (!cv) return "Your report is ready to review.";
    const bits = [];
    if (cv.bp) bits.push(cv.bp.label.toLowerCase() + " blood pressure");
    const ldl = (cv.lipids || {}).ldl || {};
    if (ldl.value != null) bits.push((ldl.value >= 3.4 ? "elevated" : "acceptable") + " LDL-cholesterol");
    if (cv.framingham && cv.framingham.eligible) bits.push(cv.framingham.band.toLowerCase() + " estimated 10-year cardiovascular risk");
    if (!bits.length) return "Your cardiovascular results are summarised below.";
    return "This report shows " + bits.join(", ") + ".";
  }

  function otherDomainTab(tab, key, analysis, report) {
    const dom = analysis[key];
    if (tab === "results") {
      const results = key === "anthropometric"
        ? [
            { id: "anthro-bmi", name: "BMI", value: dom.bmi, band: dom.bmiCategory, tone: dom.bmiCategory === "Normal" ? "good" : "warn", scaleKey: "BMI" },
            { id: "anthro-waist", name: "Waist circumference", value: dom.waist, band: dom.waistFlag ? "Above cut-off" : "Within cut-off", tone: dom.waistFlag ? "warn" : "good", scaleKey: (report.profile && report.profile.sex === "F") ? "WAIST_F" : "WAIST_M" }
          ].map((r) => ({ id: r.id, cells: [r.name, r.scaleKey === "BMI" ? r.value : r.value + " cm", r.band], tone: r.tone, scaleKey: r.scaleKey, value: r.value }))
        : (dom.results || []).map((r) => ({ id: "res-" + r.code, cells: [r.name, r.value + (r.unit ? " " + r.unit : ""), r.label || r.band], tone: r.tone, scaleKey: r.code, value: r.value }));
      if (!results.length) return U().emptyState("No results available for this domain in the current report.");
      return U().card(`<table class="data-table"><thead><tr><th>Test</th><th>Value</th><th>Band</th><th></th><th></th></tr></thead><tbody>
        ${results.map((r) => resultRow(r.id, r.cells, r.tone, r.scaleKey, r.value)).join("")}
      </tbody></table>`);
    }
    if (tab === "how") return U().card(`${U().callout("info", "Illustrative logic", U().esc((dom.note || "") + " Values are compared against simple fixed thresholds, not a validated clinical model."))}`);
    if (tab === "modifiers") return U().card(`<p style="color:var(--muted);font-size:.9rem">No cross-marker modifier logic is implemented for this illustrative domain yet — it will be added alongside a real domain specification.</p>`);
    if (tab === "recs") return recsList(key, analysis);
    if (tab === "education") {
      const map = { metabolic: ["EDU_GLUCOSE_001"], liver: ["EDU_ALT_001"], renal: [], haematology: [], anthropometric: [] };
      return educationList(map[key] || []);
    }
    const flagged = (dom.results || []).filter((r) => r.tone !== "good");
    return `${U().callout("info", null, U().esc(dom.note || ""))}
    <div style="height:14px"></div>
    ${U().card(flagged.length ? `<h3 style="font-size:1rem">${flagged.length} result(s) outside the demo range</h3><ul class="list-plain" style="margin-top:10px">${flagged.map((r) => `<li>${U().esc(r.name)}<span>${r.value} ${U().esc(r.unit || "")}</span></li>`).join("")}</ul>` : `<p>All illustrative results for this domain are within the demo reference range.</p>`)}`;
  }

  function recsList(domain, analysis) {
    const recs = analysis.recommendations.filter((r) => r.domain === domain || r.domain === "general");
    if (!recs.length) return U().emptyState("No specific recommendations for this domain right now.");
    return `<div class="stack">${recs.map((r) => `
      ${U().card(`<div class="card-row"><div><h4 style="font-size:.95rem;color:var(--navy)">${U().esc(r.issue)}</h4><p style="margin-top:6px;color:#33405a;font-size:.88rem">${U().esc(r.action)}</p></div>${U().pill("teal", r.category)}</div>`)}
    `).join("")}</div>`;
  }

  function educationList(codes) {
    const items = codes.map((c) => SQ.education[c]).filter(Boolean).map((text) => ({ text }));
    if (!items.length) return U().emptyState("No education notes linked to this domain yet.");
    return `<div class="stack">${items.map((e) => U().card(`<p style="font-size:.9rem;color:#33405a">${U().esc(e.text)}</p>`)).join("")}</div>`;
  }

  SQ.screens.domain = { render };
})();
