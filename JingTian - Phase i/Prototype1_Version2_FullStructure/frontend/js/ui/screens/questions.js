/* EVA SQUARE — Screen 9: Triggered Health Questionnaire (adaptive, per
 * section). Ported from frontend-v2 — content and behaviour unchanged.
 * The one addition is a small client-side re-implementation of
 * question_engine.py's domainsPresentInLabs()/activeSections() (a ~10
 * line pure function): v2 had this in js/engine/questionEngine.js as a
 * local module; here it's inlined since it's the only screen that needs
 * it and pulling in a whole "engine" layer for one filter function would
 * be pure overhead — the *actual* clinical/questionnaire content
 * (SQ.questionnaireSections) still comes straight from the backend
 * (GET /api/meta/questionnaire-sections), this just decides which
 * sections to show.
 */
window.SQ = window.SQ || {};
SQ.screens = SQ.screens || {};

(function () {
  "use strict";
  const U = () => SQ.ui;

  function domainsPresentInLabs(labValues) {
    const present = new Set();
    Object.keys(labValues || {}).forEach((code) => {
      const meta = SQ.labDictionary[code];
      if (meta && labValues[code] != null) present.add(meta.domain);
    });
    return Array.from(present);
  }
  function activeSections(presentDomains) {
    return (SQ.questionnaireSections || []).filter((s) => !s.triggerDomains || !s.triggerDomains.length || s.triggerDomains.some((d) => presentDomains.indexOf(d) >= 0));
  }

  function choiceRowFor(qid, options, selected) {
    return `<div class="choice-row">${options.map((o) =>
      U().choiceBtn(o, o === selected, `SQ.act.setAnswer('${qid}','${o.replace(/'/g, "\\'")}')`)
    ).join("")}</div>`;
  }

  function questionHtml(q, answers) {
    const val = answers[q.id];
    if (q.type === "bp-pair") {
      const v = val || {};
      return `<div class="field"><label>${U().esc(q.prompt)}</label>
        <div style="display:flex;gap:10px;align-items:center;max-width:260px">
          <input type="number" placeholder="Systolic" value="${v.sbp != null ? v.sbp : ""}" onchange="SQ.act.setBP('${q.id}', this.value, null)">
          <span style="color:var(--muted)">/</span>
          <input type="number" placeholder="Diastolic" value="${v.dbp != null ? v.dbp : ""}" onchange="SQ.act.setBP('${q.id}', null, this.value)">
          <span style="color:var(--muted);font-size:.8rem">mmHg</span>
        </div>
        <span class="hint">${U().esc(q.why)}</span></div>`;
    }
    if (q.type === "choice-with-text") {
      return `<div class="field"><label>${U().esc(q.prompt)}</label>
        ${choiceRowFor(q.id, q.options, val)}
        ${val === "Yes" ? `<input type="text" style="margin-top:10px" placeholder="${U().esc(q.textLabel)}" value="${U().esc(answers[q.id + "Text"] || "")}" onchange="SQ.act.setAnswerText('${q.id}Text', this.value)">` : ""}
        <span class="hint">${U().esc(q.why)}</span></div>`;
    }
    return `<div class="field"><label>${U().esc(q.prompt)}</label>
      ${choiceRowFor(q.id, q.options, val)}
      <span class="hint">${U().esc(q.why)}</span></div>`;
  }

  function render() {
    if (!SQ.store.state.activeReportId) return U().emptyState("No report yet — upload one first.");
    const report = SQ.store.getActiveReport();
    if (!report) return U().loadingState("Loading report…");
    const answers = SQ.store.getAnswers(report.id);
    if (!answers) return U().loadingState("Loading questionnaire…");

    const labs = report.labsVerified || report.labsRaw || {};
    const presentDomains = domainsPresentInLabs(labs);
    const sections = activeSections(presentDomains);

    const body = sections.map((section) => `
      ${U().card(`
        <h3 style="font-size:1.02rem">${section.icon} ${U().esc(section.label)}</h3>
        <div style="margin-top:14px">${section.questions.map((q) => questionHtml(q, answers)).join("")}</div>
      `)}
    `).join("<div style='height:16px'></div>");

    return `
    ${U().stepper(["Upload", "Verify", "Answer", "Analyse"], 2)}
    ${U().callout("info", null, "These questions adapt to what was found in your report — sections only appear when relevant.")}
    <div style="height:14px"></div>
    ${body}
    <div style="margin-top:20px">${U().btn("Continue to analysis", { onclick: "SQ.act.confirmQuestions()" })}</div>
    `;
  }

  SQ.screens.questions = { render };
})();
