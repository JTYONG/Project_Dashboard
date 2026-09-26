/* SQUARE — Bootstrap: wires the store, router, and every cross-screen
 * action (SQ.act.*) that screen templates reference via inline onclick /
 * onchange handlers. Loaded last, after every data/engine/UI file.
 */
window.SQ = window.SQ || {};

(function () {
  "use strict";

  function getReportId() { return SQ.store.state.activeReportId; }

  SQ.act = {
    // ---- Demo shortcuts ----
    tryDemo(scenarioKey) {
      SQ.store.seedDemo(scenarioKey);
      SQ.ui.toast(scenarioKey === "urgent" ? "Loaded the urgent-pathway sample — see how SQUARE escalates." : "Loaded a routine sample report.", "good");
      SQ.router.navigate("analysis-summary");
    },
    startSampleUpload(scenarioKey) {
      SQ.store.addSampleReport(scenarioKey);
      SQ.ui.toast("Sample report loaded — verify the extracted values below.", "good");
      SQ.router.navigate("verify");
    },
    handleFileUpload(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      SQ.store.addSampleReport("routine", file.name);
      SQ.ui.toast("This prototype has no live OCR yet, so “" + file.name + "” was matched to a realistic sample lab panel for you to verify.", "info");
      SQ.router.navigate("verify");
    },

    // ---- Auth / onboarding ----
    submitRegister(event) {
      event.preventDefault();
      const name = document.getElementById("reg-name").value.trim();
      const email = document.getElementById("reg-email").value.trim();
      if (!name || !email) { SQ.ui.toast("Please fill in your name and email.", "bad"); return; }
      SQ.store.register(name, email);
      SQ.router.navigate("terms");
    },
    submitLogin(event) {
      event.preventDefault();
      const email = document.getElementById("login-email").value.trim();
      if (!email) { SQ.ui.toast("Please enter your email.", "bad"); return; }
      SQ.store.login(email);
      SQ.router.navigate("dashboard");
    },
    continueFromTerms() {
      const agree = document.getElementById("tc-agree");
      if (!agree || !agree.checked) { SQ.ui.toast("Please confirm you've read the Terms to continue.", "bad"); return; }
      SQ.store.acceptTerms();
      SQ.router.navigate("consent");
    },
    continueFromConsent() {
      if (!SQ.store.requiredConsentComplete()) { SQ.ui.toast("All three required consents are needed to continue.", "bad"); return; }
      SQ.router.navigate("dashboard");
    },
    setConsent(kind, id, value) { SQ.store.setConsent(kind, id, value); },
    logout() { SQ.store.logout(); SQ.router.navigate("welcome"); },
    resetDemo() {
      SQ.store.reset();
      SQ.ui.toast("All demo data cleared.", "good");
      SQ.router.navigate("welcome");
    },

    // ---- User menu ----
    toggleUserMenu(event) {
      event.stopPropagation();
      const menu = document.getElementById("user-menu");
      if (menu) menu.hidden = !menu.hidden;
    },

    // ---- Verify screen ----
    confirmVerify() {
      const report = SQ.store.getActiveReport();
      if (!report) return;
      const patch = {};
      Object.keys(report.labsRaw || {}).forEach((code) => {
        const el = document.getElementById("verify-" + code);
        if (el && el.value !== "") patch[code] = parseFloat(el.value);
      });
      SQ.store.verifyReport(report.id, patch);
      SQ.ui.toast("Results confirmed.", "good");
      SQ.router.navigate("questions");
    },

    // ---- Questionnaire ----
    setAnswer(qid, value) { SQ.store.saveAnswers(getReportId(), { [qid]: value }); },
    setAnswerText(field, value) { SQ.store.saveAnswers(getReportId(), { [field]: value }); },
    setBP(qid, sbp, dbp) {
      const current = SQ.store.getAnswers(getReportId())[qid] || {};
      const next = Object.assign({}, current);
      if (sbp != null) next.sbp = sbp === "" ? undefined : parseFloat(sbp);
      if (dbp != null) next.dbp = dbp === "" ? undefined : parseFloat(dbp);
      SQ.store.saveAnswers(getReportId(), { [qid]: next });
    },
    confirmQuestions() {
      const reportId = getReportId();
      if (!reportId) return;
      SQ.store.runAnalysis(reportId);
      SQ.router.navigate("analysis-loading");
    },

    // ---- Action plan ----
    toggleAction(code) { SQ.store.toggleActionItem(code); },

    // ---- Reports library ----
    openReport(id) {
      const report = SQ.store.getReport(id);
      SQ.store.setActiveReport(id);
      if (!report) return;
      SQ.router.navigate(report.status === "verified" ? "report" : "verify");
    },

    // ---- Settings ----
    setSetting(key, value) { SQ.store.updateSettings({ [key]: value }); },
  };

  function closeMenusOnOutsideClick() {
    document.addEventListener("click", () => {
      const menu = document.getElementById("user-menu");
      if (menu && !menu.hidden) menu.hidden = true;
    });
  }

  function boot() {
    SQ.store.init();
    SQ.store.subscribe(SQ.router.render);
    window.addEventListener("hashchange", SQ.router.render);
    closeMenusOnOutsideClick();
    SQ.router.render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
