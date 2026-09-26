/* SQUARE — Central client-side state store.
 *
 * A small hand-rolled store (no framework): one plain state object,
 * mutator functions that call save() + notify(), and a subscribe() list the
 * router re-renders from. Persisted to localStorage so a refresh doesn't
 * lose progress — safe here because this file ships to run standalone in
 * the user's own browser (see file header note in README.md).
 */
window.SQ = window.SQ || {};

(function () {
  "use strict";

  const STORAGE_KEY = "square_proto2_state_v1";

  function defaultState() {
    return {
      version: 1,
      session: { loggedIn: false, user: null },
      consent: { required: {}, optional: {}, acceptedTermsVersion: null, timestamp: null },
      library: [],          // uploaded/seeded reports
      activeReportId: null,
      questionnaire: {},    // { [reportId]: answers }
      analysisByReport: {}, // { [reportId]: { cv, metabolic, liver, renal, haematology, anthropometric, safety, recs, report } }
      actionPlanDone: {},   // { [recCode]: true }
      settings: { units: "metric", notifications: true, theme: "light" },
      demoScenario: null,
    };
  }

  let state = defaultState();
  const listeners = [];

  function notify() { listeners.forEach((fn) => { try { fn(state); } catch (e) { console.error(e); } }); }
  function subscribe(fn) { listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable — continue in-memory only */ }
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) { state = Object.assign(defaultState(), JSON.parse(raw)); return true; }
    } catch (e) { /* corrupt/blocked storage — fall back to defaults */ }
    return false;
  }

  function init() {
    load();
    notify();
  }

  function reset() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    state = defaultState();
    save(); notify();
  }

  // ---- Session / onboarding ----
  function register(fullName, email) {
    state.session = { loggedIn: true, user: { fullName, email } };
    save(); notify();
  }
  function login(email) {
    state.session = { loggedIn: true, user: state.session.user && state.session.user.email === email ? state.session.user : { fullName: email.split("@")[0], email } };
    save(); notify();
  }
  function logout() { state.session = { loggedIn: false, user: null }; save(); notify(); }

  function acceptTerms() {
    state.consent.acceptedTermsVersion = SQ.ORG.version;
    save(); notify();
  }
  function setConsent(kind, id, value) {
    state.consent[kind][id] = value;
    if (kind === "required") state.consent.timestamp = new Date().toISOString();
    save(); notify();
  }
  function requiredConsentComplete() {
    return SQ.consentRequired.every((c) => !!state.consent.required[c.id]);
  }

  // ---- Reports library ----
  function addReport(report) {
    const withId = Object.assign({ id: report.id || ("rep_" + Date.now()), status: "pending-verify", uploadedAt: new Date().toISOString() }, report);
    state.library.unshift(withId);
    state.activeReportId = withId.id;
    save(); notify();
    return withId.id;
  }

  function setActiveReport(id) { state.activeReportId = id; save(); notify(); }
  function getActiveReport() { return state.library.find((r) => r.id === state.activeReportId) || null; }
  function getReport(id) { return state.library.find((r) => r.id === id) || null; }

  function verifyReport(id, verifiedLabs) {
    const r = getReport(id);
    if (!r) return;
    r.labsVerified = Object.assign({}, r.labsRaw, verifiedLabs || {});
    r.status = "verified";
    save(); notify();
  }

  // ---- Questionnaire ----
  function saveAnswers(reportId, patch) {
    state.questionnaire[reportId] = Object.assign({}, state.questionnaire[reportId], patch);
    save(); notify();
  }
  function getAnswers(reportId) { return state.questionnaire[reportId] || {}; }

  // ---- Findings assembly + analysis ----
  function assembleFindings(reportId) {
    const report = getReport(reportId);
    if (!report) return null;
    const labs = report.labsVerified || report.labsRaw || {};
    const q = getAnswers(reportId);
    const profile = Object.assign({}, report.profile, (state.session.user || {}));

    const cv = SQ.engines.cardiovascular.analyze({ profile, labs, questionnaire: q });
    const metabolic = SQ.engines.otherDomains.analyzeMetabolic(labs, q);
    const liver = SQ.engines.otherDomains.analyzeLiver(labs, q);
    const renal = SQ.engines.otherDomains.analyzeRenal(labs, q);
    const haematology = SQ.engines.otherDomains.analyzeHaematology(labs, q);
    const anthropometric = SQ.engines.otherDomains.analyzeAnthropometric(profile);

    const fh = {
      cv: cv.summary,
      profile: { smokingStatus: q.smokingStatus, age: profile.age, sex: profile.sex },
      metabolic: metabolic.summary,
      liver: liver.summary,
      renal: renal.summary,
      haematology: haematology.summary,
      anthro: { bmiCategory: anthropometric.bmiCategory, waistFlag: anthropometric.waistFlag },
    };

    return { profile, labs, q, cv, metabolic, liver, renal, haematology, anthropometric, fh };
  }

  function runAnalysis(reportId) {
    const bundle = assembleFindings(reportId);
    if (!bundle) return null;
    const safety = SQ.engines.safetyEngine.evaluate({ cv: bundle.cv, metabolic: bundle.metabolic, liver: bundle.liver, renal: bundle.renal, haematology: bundle.haematology });
    const recs = SQ.engines.recommendationEngine.evaluate(bundle.fh);
    const report = SQ.engines.reportGenerator.build(getReport(reportId), bundle.cv, { metabolic: bundle.metabolic, liver: bundle.liver, renal: bundle.renal, haematology: bundle.haematology }, safety, recs);

    const result = {
      computedAt: new Date().toISOString(),
      cv: bundle.cv, metabolic: bundle.metabolic, liver: bundle.liver, renal: bundle.renal,
      haematology: bundle.haematology, anthropometric: bundle.anthropometric,
      fh: bundle.fh, safety, recommendations: recs, report,
    };
    state.analysisByReport[reportId] = result;
    save(); notify();
    return result;
  }

  function getAnalysis(reportId) { return state.analysisByReport[reportId] || null; }

  // ---- Action plan ----
  function toggleActionItem(code) {
    state.actionPlanDone[code] = !state.actionPlanDone[code];
    save(); notify();
  }

  // ---- Settings ----
  function updateSettings(patch) {
    state.settings = Object.assign({}, state.settings, patch);
    save(); notify();
  }

  // ---- Simulated upload: adds a report from a sample scenario without
  // running verify/questionnaire/analysis yet, so the Upload → Verify →
  // Questions → Analyse flow stays meaningful even though this prototype
  // has no real OCR behind it. ----
  function addSampleReport(scenarioKey, fileNameOverride) {
    const scenario = SQ.sampleScenarios[scenarioKey];
    if (!scenario) return null;
    if (!state.session.loggedIn) state.session = { loggedIn: true, user: { fullName: scenario.profile.fullName, email: scenario.profile.email } };
    const reportId = addReport({
      id: "up_" + Date.now(),
      fileName: fileNameOverride || scenario.fileName, lab: scenario.lab, reportDate: scenario.reportDate,
      profile: scenario.profile, labsRaw: scenario.labs, labConfidence: scenario.labConfidence,
      originalText: scenario.originalText, trendHistory: scenario.trendHistory,
    });
    // Pre-fill questionnaire defaults (still fully editable on the Questions screen).
    saveAnswers(reportId, scenario.questionnaireDefaults);
    return reportId;
  }

  // ---- Demo seeding (full pipeline — used by "try it instantly" shortcuts) ----
  function seedDemo(scenarioKey) {
    const scenario = SQ.sampleScenarios[scenarioKey];
    if (!scenario) return null;
    state.demoScenario = scenarioKey;
    if (!state.session.loggedIn) state.session = { loggedIn: true, user: { fullName: scenario.profile.fullName, email: scenario.profile.email } };
    const reportId = addReport({
      id: "seed_" + scenarioKey,
      fileName: scenario.fileName, lab: scenario.lab, reportDate: scenario.reportDate,
      profile: scenario.profile, labsRaw: scenario.labs, labConfidence: scenario.labConfidence,
      originalText: scenario.originalText, trendHistory: scenario.trendHistory,
    });
    verifyReport(reportId, scenario.labs);
    saveAnswers(reportId, scenario.questionnaireDefaults);
    runAnalysis(reportId);
    return reportId;
  }

  SQ.store = {
    init, reset, subscribe, save,
    get state() { return state; },
    register, login, logout,
    acceptTerms, setConsent, requiredConsentComplete,
    addReport, setActiveReport, getActiveReport, getReport, verifyReport,
    saveAnswers, getAnswers,
    assembleFindings, runAnalysis, getAnalysis,
    toggleActionItem, seedDemo, addSampleReport, updateSettings,
  };
})();
