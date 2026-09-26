/* EVA SQUARE — Bootstrap: wires the store, router, and every cross-screen
 * action (SQ.act.*) that screen templates reference via inline onclick /
 * onchange handlers. Loaded last, after every data/engine/UI file.
 *
 * Ported from frontend-v2's app.js. The store is now backed by a real
 * REST API (see js/store.js / js/api.js) rather than localStorage, so
 * every action that used to be a synchronous local mutation is now
 * `async` and `await`s the store call — critically, *before* navigating,
 * so the router's login-gate (js/ui/router.js) sees the freshly-updated
 * session/report state rather than racing it (a plain v2-style
 * "mutate then navigate" would occasionally bounce a just-registered user
 * back to Welcome because the router re-renders on the hashchange before
 * the async register() call resolves).
 */
window.SQ = window.SQ || {};

(function () {
  "use strict";

  function getReportId() { return SQ.store.state.activeReportId; }

  SQ.act = {
    // ---- Demo shortcuts ----
    async tryDemo(scenarioKey) {
      await SQ.store.seedDemo(scenarioKey);
      SQ.ui.toast(scenarioKey === "urgent" ? "Loaded the urgent-pathway sample — see how EVA SQUARE escalates." : "Loaded a routine sample report.", "good");
      SQ.router.navigate("analysis-summary");
    },
    async startSampleUpload(scenarioKey) {
      await SQ.store.addSampleReport(scenarioKey);
      SQ.ui.toast("Sample report loaded — verify the extracted values below.", "good");
      SQ.router.navigate("verify");
    },
    async handleFileUpload(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      await SQ.store.uploadFile(file);
      SQ.ui.toast("This prototype has no live OCR yet, so “" + file.name + "” was matched to a realistic sample lab panel for you to verify.", "info");
      SQ.router.navigate("verify");
    },

    // ---- Auth / onboarding ----
    async submitRegister(event) {
      event.preventDefault();
      const name = document.getElementById("reg-name").value.trim();
      const email = document.getElementById("reg-email").value.trim();
      const password = document.getElementById("reg-pw").value;
      if (!name || !email || !password) { SQ.ui.toast("Please fill in your name, email and password.", "bad"); return; }
      try {
        await SQ.store.register(name, email, password);
        SQ.router.navigate("terms");
      } catch (e) { SQ.ui.toast(e.message || "Could not create your account.", "bad"); }
    },
    async submitLogin(event) {
      event.preventDefault();
      const email = document.getElementById("login-email").value.trim();
      const password = document.getElementById("login-pw").value;
      if (!email || !password) { SQ.ui.toast("Please enter your email and password.", "bad"); return; }
      try {
        await SQ.store.login(email, password);
        SQ.router.navigate("dashboard");
      } catch (e) { SQ.ui.toast(e.message || "Incorrect email or password.", "bad"); }
    },
    async continueFromTerms() {
      const agree = document.getElementById("tc-agree");
      if (!agree || !agree.checked) { SQ.ui.toast("Please confirm you've read the Terms to continue.", "bad"); return; }
      await SQ.store.acceptTerms();
      SQ.router.navigate("consent");
    },
    continueFromConsent() {
      if (!SQ.store.requiredConsentComplete()) { SQ.ui.toast("All three required consents are needed to continue.", "bad"); return; }
      SQ.router.navigate("dashboard");
    },
    setConsent(kind, id, value) { SQ.store.setConsent(kind, id, value); },
    async logout() { await SQ.store.logout(); SQ.router.navigate("welcome"); },
    resetDemo() { SQ.act.logout(); },

    // ---- User menu ----
    toggleUserMenu(event) {
      event.stopPropagation();
      const menu = document.getElementById("user-menu");
      if (menu) menu.hidden = !menu.hidden;
    },

    // ---- Dashboard toolbar (Requirement #2) ----
    // Several toolbar actions (manual health-reading entry, custom date
    // ranges, reminders, data export) have no backend support in this
    // basis version — no endpoint, no storage for them. Rather than fake
    // a result, every one of these routes through this single honest
    // "not implemented yet" toast, matching the app's existing convention
    // for other unfinished basis-version features (see Appointments,
    // reports.py's OCR note).
    notImplemented(feature) {
      SQ.ui.toast((feature || "This") + " isn't available in this prototype yet.", "info");
    },
    setReminder() {
      SQ.ui.toast("Reminders aren't available in this prototype yet — check back on your next visit instead.", "info");
    },
    toggleMoreMenu(event) {
      event.stopPropagation();
      const menu = document.getElementById("dash-more-menu");
      if (menu) menu.hidden = !menu.hidden;
    },

    // ---- Verify screen ----
    async confirmVerify() {
      const report = SQ.store.getActiveReport();
      if (!report) return;
      const patch = {};
      Object.keys(report.labsRaw || {}).forEach((code) => {
        const el = document.getElementById("verify-" + code);
        if (el && el.value !== "") patch[code] = parseFloat(el.value);
      });
      await SQ.store.verifyReport(report.id, patch);
      SQ.ui.toast("Results confirmed.", "good");
      SQ.router.navigate("questions");
    },

    // ---- Questionnaire ----
    setAnswer(qid, value) { SQ.store.saveAnswers(getReportId(), { [qid]: value }); },
    setAnswerText(field, value) { SQ.store.saveAnswers(getReportId(), { [field]: value }); },
    setBP(qid, sbp, dbp) {
      const current = (SQ.store.state.questionnaireAnswers[getReportId()] || {})[qid] || {};
      const next = Object.assign({}, current);
      if (sbp != null) next.sbp = sbp === "" ? undefined : parseFloat(sbp);
      if (dbp != null) next.dbp = dbp === "" ? undefined : parseFloat(dbp);
      SQ.store.saveAnswers(getReportId(), { [qid]: next });
    },
    async confirmQuestions() {
      const reportId = getReportId();
      if (!reportId) return;
      SQ.router.navigate("analysis-loading");
      await SQ.store.runAnalysis(reportId);
    },

    // ---- Action plan ----
    toggleAction(code) { SQ.store.toggleActionItem(code); },

    // ---- Reports library ----
    async openReport(id) {
      await SQ.store.setActiveReport(id);
      const report = SQ.store.state.reportDetail[id];
      if (!report) return;
      SQ.router.navigate(report.status === "verified" ? "report" : "verify");
    },

    // ---- Settings ----
    setSetting(key, value) { SQ.store.updateSettings({ [key]: value }); },

    // ---- FullStructure additions ----
    // Requirement #2: expand/collapse a quantity's full reference scale.
    toggleScale(id) {
      const btn = document.getElementById("scale-toggle-" + id);
      const row = document.getElementById("scale-row-" + id);
      if (!btn || !row) return;
      const open = !row.classList.contains("open");
      row.classList.toggle("open", open);
      btn.classList.toggle("open", open);
    },
    // Requirement #4: open the enlarged interactive trend chart for one quantity.
    async openTrendChart(key) {
      const reportId = getReportId();
      if (!reportId) return;
      const trends = SQ.store.state.trendsByReport[reportId] || await SQ.store.ensureTrends(reportId);
      const entry = trends[key];
      if (!entry) return;
      SQ.ui.trendModal.open(key, entry, SQ.screens.trends.unitFor(key));
    },
  };

  function closeMenusOnOutsideClick() {
    document.addEventListener("click", () => {
      const menu = document.getElementById("user-menu");
      if (menu && !menu.hidden) menu.hidden = true;
      const dashMenu = document.getElementById("dash-more-menu");
      if (dashMenu && !dashMenu.hidden) dashMenu.hidden = true;
    });
  }

  function boot() {
    SQ.store.subscribe(SQ.router.render);
    window.addEventListener("hashchange", SQ.router.render);
    closeMenusOnOutsideClick();
    SQ.router.render(); // shows the loading shell until init() resolves
    SQ.store.init();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
