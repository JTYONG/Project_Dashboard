/* EVA SQUARE — Screen 18: Health Profile. Ported from frontend-v2 —
 * content unchanged; account/consent come from the backend session,
 * profile/answers/BMI come from the active report + its (possibly still
 * loading) analysis, each gated independently since none of them block
 * the rest of the page the way a dedicated analysis screen would.
 */
window.SQ = window.SQ || {};
SQ.screens = SQ.screens || {};

(function () {
  "use strict";
  const U = () => SQ.ui;

  function render() {
    const user = SQ.store.state.user || {};
    const report = SQ.store.getActiveReport();
    const profile = report ? (report.profile || {}) : {};
    const answers = report ? SQ.store.getAnswers(report.id) : null;
    const analysis = (report && report.status === "verified") ? SQ.store.getAnalysis(report.id) : null;
    const anthro = analysis ? analysis.anthropometric : null;

    return `
    <div class="grid cols-2">
      ${U().card(`
        <h3 style="font-size:1.02rem">Account</h3>
        ${U().kvGrid([
          { k: "Name", v: U().esc(user.fullName || "—") },
          { k: "Email", v: U().esc(user.email || "—") },
          { k: "Country", v: U().esc(profile.country || "—") },
        ])}
      `)}
      ${U().card(`
        <h3 style="font-size:1.02rem">Demographics &amp; anthropometrics</h3>
        ${U().kvGrid([
          { k: "Age", v: (profile.age != null ? profile.age : "—") },
          { k: "Sex", v: profile.sex === "M" ? "Male" : profile.sex === "F" ? "Female" : "—" },
          { k: "Height", v: (profile.height != null ? profile.height + " cm" : "—") },
          { k: "Weight", v: (profile.weight != null ? profile.weight + " kg" : "—") },
          { k: "Waist", v: (profile.waist != null ? profile.waist + " cm" : "—") },
          { k: "BMI", v: anthro ? anthro.bmi + " (" + anthro.bmiCategory + ")" : "—" },
        ])}
      `)}
    </div>
    <div class="section-title">Lifestyle &amp; history (from your questionnaire)</div>
    ${report ? (answers ? U().card(`
      <ul class="list-plain">
        ${Object.keys(answers).filter((k) => typeof answers[k] === "string").map((k) => `<li>${humanLabel(k)}<span>${U().esc(answers[k])}</span></li>`).join("")}
      </ul>
    `) : U().loadingState("Loading questionnaire…")) : U().emptyState("Answer the questionnaire on a report to populate this section.")}
    <div class="section-title">Consent status</div>
    ${SQ.store.state.consent ? U().card(`
      ${SQ.consentRequired.map((c) => `<div class="card-row" style="margin-bottom:8px"><span>${U().esc(c.title)}</span>${U().pill(SQ.store.state.consent.required[c.id] ? "good" : "bad", SQ.store.state.consent.required[c.id] ? "Given" : "Not given")}</div>`).join("")}
      ${SQ.consentOptional.map((c) => `<div class="card-row" style="margin-bottom:8px"><span>${U().esc(c.title)}</span>${U().pill(SQ.store.state.consent.optional[c.id] ? "good" : "neutral", SQ.store.state.consent.optional[c.id] ? "Opted in" : "Opted out")}</div>`).join("")}
      <div style="margin-top:10px">${U().btn("Manage consent in Settings", { href: "settings", variant: "outline", sm: true })}</div>
    `) : U().loadingState("Loading consent status…")}
    `;
  }

  function humanLabel(key) {
    const map = {
      everDiagnosedHighBP: "Diagnosed with high blood pressure", bpMedication: "On BP medication",
      familyHistoryPrematureCVD: "Family history of premature CVD", diagnosedDiabetes: "Diagnosed with diabetes",
      diabetesMedication: "On diabetes medication", familyHistoryDiabetes: "Family history of diabetes",
      activityLevel: "Activity level", alcoholIntake: "Alcohol intake", fattyLiverHistory: "Fatty liver history",
      smokingStatus: "Smoking status", regularMedication: "Regular medication", kidneyDisease: "Kidney disease",
      pregnancyStatus: "Pregnancy status",
    };
    return U().esc(map[key] || key);
  }

  SQ.screens.profile = { render };
})();
