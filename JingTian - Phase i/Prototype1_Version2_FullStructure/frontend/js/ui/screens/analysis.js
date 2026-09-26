/* EVA SQUARE — Screen 10 (Analysis Loading) & Screen 11 (Analysis
 * Summary). Ported from frontend-v2 — the loading screen is still a
 * purely decorative fixed animation (real analysis already ran via
 * SQ.act.confirmQuestions() → POST /analyze before this screen shows);
 * summary now reads analysis async with a loading/not-ready gate.
 */
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
    if (!SQ.store.state.activeReportId) return U().emptyState("No report yet — upload one first.");
    const report = SQ.store.getActiveReport();
    if (!report) return U().loadingState("Loading report…");
    if (report.status !== "verified") return U().notReady(report);
    const analysis = SQ.store.getAnalysis(report.id);
    if (!analysis) return U().loadingState("Analysing your results…");
    const cv = analysis.cv;
    const safety = analysis.safety;

    const safetyBlock = safety.overall === "self"
      ? U().callout("good", "No emergency or urgent flags", "Nothing in this report needs immediate action. Continue to your action plan for routine, preventive steps.")
      : U().callout(safety.overall === "emergency" ? "bad" : safety.overall === "urgent" ? "bad" : "warn", safety.level.label, U().esc(safety.level.description) + " " + U().esc(safety.level.action));

    return `
    <div class="section-title" style="margin-top:0">${U().esc(cv.headline || headlineFallback(cv))}</div>
    ${safetyBlock}
    <div style="height:16px"></div>
    <div class="grid cols-3">
      ${SQ.DOMAIN_ORDER.map((key) => U().domainCard(key, U().anatomy.domainSummary(key, analysis), {
        clickable: true, onclick: `SQ.router.navigate('domain/${key}')`,
        pill: key === "cardiovascular" ? U().pill("info", "Real spec") : U().pill("neutral", "Illustrative"),
      })).join("")}
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

  // report_generator.headline() is only exposed server-side via the
  // "headline" report block, not as a standalone field — this mirrors its
  // logic client-side for the one place (this summary heading) that needs
  // it in isolation rather than the full report.
  function headlineFallback(cv) {
    if (!cv) return "Your report is ready to review.";
    const bits = [];
    if (cv.bp) bits.push(cv.bp.label.toLowerCase() + " blood pressure");
    const ldl = (cv.lipids || {}).ldl || {};
    if (ldl.value != null) bits.push((ldl.value >= 3.4 ? "elevated" : "acceptable") + " LDL-cholesterol");
    if (cv.framingham && cv.framingham.eligible) bits.push(cv.framingham.band.toLowerCase() + " estimated 10-year cardiovascular risk");
    if (!bits.length) return "Your cardiovascular results are summarised below.";
    return "This report shows " + bits.join(", ") + ".";
  }

  SQ.screens.analysis = { loading, afterLoading, summary };
})();
