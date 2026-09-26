/* SQUARE — Screen 10 (Analysis Loading) & Screen 11 (Analysis Summary). */
window.SQ = window.SQ || {};
SQ.screens = SQ.screens || {};

(function () {
  "use strict";
  const U = () => SQ.ui;

  function loading() {
    const steps = [
      { label: "Reading verified results", status: "done" },
      { label: "Applying cardiovascular calculators", status: "done" },
      { label: "Cross-checking risk modifiers", status: "active" },
      { label: "Preparing your report", status: "pending" },
    ];
    return `
    ${U().stepper(["Upload", "Verify", "Answer", "Analyse"], 3)}
    ${U().card(`
      ${U().progressRing(72)}
      <p style="text-align:center;color:var(--muted);margin-top:16px;font-size:.9rem">Analysing your results against the Cardiovascular Domain Specification…</p>
      <div style="max-width:360px;margin:20px auto 0">${U().checkSteps(steps)}</div>
    `)}
    `;
  }

  function afterLoading() {
    setTimeout(() => { if (SQ.router.parseHash().route === "analysis-loading") SQ.router.navigate("analysis-summary"); }, 1300);
  }

  function summary() {
    const report = SQ.store.getActiveReport();
    if (!report) return U().emptyState("No report yet — upload one first.");
    const analysis = SQ.store.getAnalysis(report.id) || SQ.store.runAnalysis(report.id);
    const cv = analysis.cv;
    const safety = analysis.safety;

    const safetyBlock = safety.overall === "self"
      ? U().callout("good", "No emergency or urgent flags", "Nothing in this report needs immediate action. Continue to your action plan for routine, preventive steps.")
      : U().callout(safety.overall === "emergency" ? "bad" : safety.overall === "urgent" ? "bad" : "warn", safety.level.label, U().esc(safety.level.description) + " " + U().esc(safety.level.action));

    return `
    <div class="section-title" style="margin-top:0">${U().esc(SQ.engines.reportGenerator.headline(cv))}</div>
    ${safetyBlock}
    <div style="height:16px"></div>
    <div class="grid cols-3">
      ${SQ.DOMAIN_ORDER.map((key) => {
        const dom = key === "cardiovascular" ? null : analysis[key];
        let summaryText = "Reviewed";
        if (key === "cardiovascular") summaryText = cv.bp ? cv.bp.label : "Reviewed";
        else if (key === "anthropometric") summaryText = dom ? dom.bmiCategory + (dom.waistFlag ? " · waist above cut-off" : "") : "Reviewed";
        else if (dom && dom.results) summaryText = dom.results.filter((r) => r.tone !== "good").length + " finding(s) to review";
        return U().domainCard(key, summaryText, {
          clickable: true, onclick: `SQ.router.navigate('domain/${key}')`,
          pill: key === "cardiovascular" ? U().pill("info", "Real spec") : U().pill("neutral", "Illustrative"),
        });
      }).join("")}
    </div>
    <div class="grid cols-2" style="margin-top:20px">
      ${U().card(`<h3 style="font-size:1.02rem">Why this result</h3>
        <div class="stack" style="margin-top:12px">${(cv.discordanceNotes.length ? cv.discordanceNotes : [{ title: "Consistent picture", text: "Your core results point in the same direction — no discordant patterns were flagged this time." }]).map((n) => U().callout("info", n.title, U().esc(n.text))).join("")}</div>`)}
      ${U().card(`<h3 style="font-size:1.02rem">What's next</h3>
        <div class="stack" style="margin-top:12px">
          <a class="link-row" href="#/action-plan">✅ Review your personalised action plan →</a>
          <a class="link-row" href="#/referral">🏥 See referral &amp; escalation guidance →</a>
          <a class="link-row" href="#/report">🧾 View the full structured report →</a>
          <a class="link-row" href="#/trends">📈 Track this over time →</a>
        </div>`)}
    </div>
    `;
  }

  SQ.screens.analysis = { loading, afterLoading, summary };
})();
