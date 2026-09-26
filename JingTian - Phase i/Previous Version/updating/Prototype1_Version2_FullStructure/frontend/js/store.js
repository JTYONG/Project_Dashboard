/* EVA SQUARE — client-side cache over the backend REST API.
 *
 * Unlike frontend-v2 (which computed everything locally and persisted to
 * localStorage), this FullStructure build treats the backend as the source
 * of truth: every mutation calls the API, then updates this in-memory
 * cache and notifies subscribers (the router) to re-render. `localStorage`
 * is used ONLY for the session bearer token — a per-browser convenience so
 * a refresh doesn't log you out — never for clinical data.
 *
 * `SQ.store.need(cacheValue, key, loaderFn)` is the pattern screens use to
 * read data that might not be cached yet: it returns the cached value if
 * present, otherwise kicks off `loaderFn()` (once — de-duplicated by
 * `key`) and returns `null` to tell the screen to render a loading state.
 * When the load resolves, listeners are notified and the router re-renders
 * with the now-cached value.
 */
window.SQ = window.SQ || {};

(function () {
  "use strict";

  function defaultState() {
    return {
      booted: false,
      user: null,
      consent: null,          // {required, optional, acceptedTermsVersion, requiredComplete}
      settings: null,
      meta: null,              // {domains, domainOrder, labDictionary, simpleRanges, anthroRules,
                                //  questionnaireSections, legal, referenceScales, referralLevels, education, sampleScenarios}
      reports: null,            // summary list
      activeReportId: null,
      reportDetail: {},          // { [id]: full report }
      questionnaireAnswers: {},   // { [id]: answers }
      analysisByReport: {},        // { [id]: analysis result }
      trendsByReport: {},           // { [id]: trends }
      actionPlanDone: {},
    };
  }

  let state = defaultState();
  const listeners = [];
  const inflight = new Set();

  function notify() { listeners.forEach((fn) => { try { fn(state); } catch (e) { console.error(e); } }); }
  function subscribe(fn) { listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; }

  function need(cacheValue, key, loaderFn) {
    if (cacheValue !== undefined && cacheValue !== null) return cacheValue;
    if (!inflight.has(key)) {
      inflight.add(key);
      loaderFn().catch((e) => console.error("load failed:", key, e)).finally(() => { inflight.delete(key); notify(); });
    }
    return null;
  }

  // Bind rarely-changing reference content onto plain `SQ.*` globals once
  // loaded, mirroring frontend-v2's data/*.js globals (SQ.DOMAINS,
  // SQ.labDictionary, SQ.ORG, ...) so screen templates ported from v2 need
  // almost no changes to how they reference static content.
  function bindMetaGlobals() {
    const m = state.meta;
    if (!m) return;
    SQ.DOMAINS = m.domains;
    SQ.DOMAIN_ORDER = m.domainOrder;
    SQ.labDictionary = m.labDictionary;
    SQ.simpleRanges = m.simpleRanges;
    SQ.anthroRules = m.anthroRules;
    SQ.questionnaireSections = m.questionnaireSections;
    SQ.ORG = m.legal.org;
    SQ.termsSections = m.legal.terms;
    SQ.consentRequired = m.legal.consentRequired;
    SQ.consentOptional = m.legal.consentOptional;
    SQ.referenceScales = m.referenceScales;
    SQ.referralLevels = m.referralLevels;
    SQ.education = m.education;
    SQ.sampleScenarios = m.sampleScenarios;
  }

  // ---- boot ----
  async function init() {
    const metaCalls = await Promise.all([
      SQ.api.metaDomains(), SQ.api.metaLabDictionary(), SQ.api.metaQuestionnaireSections(),
      SQ.api.metaLegal(), SQ.api.metaReferenceScales(), SQ.api.metaReferralLevels(),
      SQ.api.metaEducation(), SQ.api.metaSampleScenarios(),
    ]);
    const [domains, labDict, qSections, legal, refScales, referral, education, scenarios] = metaCalls;
    state.meta = {
      domains: domains.domains, domainOrder: domains.order,
      labDictionary: labDict.labs, simpleRanges: labDict.simpleRanges, anthroRules: labDict.anthroRules,
      questionnaireSections: qSections.sections, legal, referenceScales: refScales,
      referralLevels: referral.levels, education: education.education, sampleScenarios: scenarios,
    };
    bindMetaGlobals();

    if (SQ.api.getToken()) {
      try {
        const me = await SQ.api.me();
        state.user = me.user; state.consent = me.consent; state.settings = me.settings;
        await refreshReports();
        await refreshActionPlan();
      } catch (e) {
        SQ.api.setToken(null);
      }
    }
    state.booted = true;
    notify();
  }

  async function refreshReports() {
    state.reports = await SQ.api.listReports();
    if (!state.activeReportId && state.reports.length) state.activeReportId = state.reports[0].id;
  }
  async function refreshActionPlan() {
    const r = await SQ.api.getActionPlan();
    state.actionPlanDone = r.done;
  }
  async function refreshConsent() {
    state.consent = await SQ.api.getConsent();
  }

  // ---- auth ----
  async function afterLogin(authOut) {
    SQ.api.setToken(authOut.token);
    state.user = authOut.user;
    const me = await SQ.api.me();
    state.consent = me.consent; state.settings = me.settings;
    await refreshReports();
    await refreshActionPlan();
    notify();
  }
  async function register(fullName, email, password) { await afterLogin(await SQ.api.register(fullName, email, password)); }
  async function login(email, password) { await afterLogin(await SQ.api.login(email, password)); }
  async function demoLogin(scenario) { await afterLogin(await SQ.api.demoLogin(scenario)); }
  async function logout() {
    try { await SQ.api.logout(); } catch (e) { /* token already invalid — fine */ }
    SQ.api.setToken(null);
    state = defaultState();
    state.meta = state.meta; // meta refetched lazily on next init if needed
    await init();
  }

  // ---- consent ----
  async function acceptTerms() { await SQ.api.acceptTerms(); await refreshConsent(); notify(); }
  async function setConsent(kind, id, value) { state.consent = await SQ.api.patchConsent(kind, id, value); notify(); }
  function requiredConsentComplete() { return !!(state.consent && state.consent.requiredComplete); }

  // ---- reports ----
  // Convenience getters: cache-or-fetch via `need()`. Screens call these
  // directly (mirroring frontend-v2's synchronous getters); a `null`
  // return means "fetch kicked off, re-render pending" — screens should
  // treat that as a loading state, not "doesn't exist" (they can tell the
  // two apart via state.activeReportId / report.status, since a fetch is
  // only ever kicked off when there's something to fetch).
  function getReport(id) {
    if (!id) return null;
    return need(state.reportDetail[id], "report:" + id, () => ensureReportDetail(id));
  }
  function getActiveReport() { return state.activeReportId ? getReport(state.activeReportId) : null; }
  function getReportSummary(id) { return (state.reports || []).find((r) => r.id === id) || null; }
  async function ensureReportDetail(id) {
    const detail = await SQ.api.getReport(id);
    state.reportDetail[id] = detail;
    return detail;
  }
  async function setActiveReport(id) { state.activeReportId = id; if (!state.reportDetail[id]) await ensureReportDetail(id); notify(); }
  function getAnswers(id) {
    if (!id) return null;
    return need(state.questionnaireAnswers[id], "answers:" + id, () => ensureAnswers(id));
  }
  function getAnalysis(id) {
    if (!id) return null;
    return need(state.analysisByReport[id], "analysis:" + id, () => ensureAnalysis(id));
  }
  function getTrends(id) {
    if (!id) return null;
    return need(state.trendsByReport[id], "trends:" + id, () => ensureTrends(id));
  }

  async function addSampleReport(scenario, fileName) {
    const report = await SQ.api.createSampleReport(scenario, fileName, false);
    state.reportDetail[report.id] = report;
    state.activeReportId = report.id;
    await refreshReports();
    notify();
    return report.id;
  }
  async function uploadFile(file) {
    const report = await SQ.api.uploadReport(file);
    state.reportDetail[report.id] = report;
    state.activeReportId = report.id;
    await refreshReports();
    notify();
    return report.id;
  }
  async function seedDemo(scenario) {
    await demoLogin(scenario);
    const report = await SQ.api.createSampleReport(scenario, null, true);
    state.reportDetail[report.id] = report;
    state.activeReportId = report.id;
    state.analysisByReport[report.id] = await SQ.api.getAnalysis(report.id);
    await refreshReports();
    notify();
    return report.id;
  }

  async function verifyReport(id, values) {
    const report = await SQ.api.verifyReport(id, values);
    state.reportDetail[id] = report;
    notify();
  }

  async function ensureAnswers(id) {
    const r = await SQ.api.getQuestionnaire(id);
    state.questionnaireAnswers[id] = r.answers;
    return r.answers;
  }
  async function saveAnswers(id, patchObj) {
    const r = await SQ.api.patchQuestionnaire(id, patchObj);
    state.questionnaireAnswers[id] = r.answers;
    notify();
  }

  async function runAnalysis(id) {
    const result = await SQ.api.analyzeReport(id);
    state.analysisByReport[id] = result;
    notify();
    return result;
  }
  async function ensureAnalysis(id) {
    const result = await SQ.api.getAnalysis(id);
    state.analysisByReport[id] = result;
    return result;
  }
  async function ensureTrends(id) {
    const result = await SQ.api.getTrends(id);
    state.trendsByReport[id] = result;
    return result;
  }

  async function toggleActionItem(code) {
    const r = await SQ.api.toggleActionItem(code);
    state.actionPlanDone = r.done;
    notify();
  }

  async function updateSettings(patchObj) {
    state.settings = await SQ.api.patchSettings(patchObj);
    notify();
  }

  SQ.store = {
    init, subscribe, notify, need,
    get state() { return state; },
    register, login, demoLogin, logout, reset: logout,
    acceptTerms, setConsent, requiredConsentComplete,
    getReport, getActiveReport, getReportSummary, setActiveReport, ensureReportDetail,
    addSampleReport, uploadFile, seedDemo, verifyReport,
    getAnswers, ensureAnswers, saveAnswers,
    getAnalysis, runAnalysis, ensureAnalysis,
    getTrends, ensureTrends,
    toggleActionItem, updateSettings, refreshReports,
  };
})();
