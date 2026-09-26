/* EVA SQUARE — Hash router. Routes: #/route/param1/param2. Screens register
 * themselves on SQ.screens.<file>.<fn>; this file just wires hash → screen.
 *
 * Ported from frontend-v2's ui/router.js. Two changes: (1) `state.booted`
 * gating — this build's store fetches meta + session state from the
 * backend asynchronously on boot, so the very first render (before that
 * resolves) shows a loading shell instead of assuming a logged-out state;
 * (2) "logged in" is `!!SQ.store.state.user` rather than
 * `state.session.loggedIn`.
 */
window.SQ = window.SQ || {};

(function () {
  "use strict";

  function parseHash() {
    const raw = (location.hash || "").replace(/^#\/?/, "");
    const parts = raw.split("/").filter(Boolean);
    return { route: parts[0] || "", params: parts.slice(1) };
  }

  function navigate(path) { location.hash = "#/" + path; }

  const AUTH_ROUTES = new Set(["welcome", "register", "login"]);

  function routeTable() {
    const S = SQ.screens;
    return {
      "": () => navigate(SQ.store.state.user ? "dashboard" : "welcome"),
      welcome: { shell: "auth", render: S.auth.welcome },
      register: { shell: "auth", render: S.auth.register },
      login: { shell: "auth", render: S.auth.login },
      terms: { shell: "setup", step: "terms", render: S.auth.terms },
      consent: { shell: "setup", step: "consent", render: S.auth.consent },
      dashboard: { shell: "app", title: "Overview", render: S.dashboard.render, afterRender: S.dashboard.afterRender },
      upload: { shell: "app", title: "Upload a Report", render: S.upload.render },
      verify: { shell: "app", title: "Verify Extracted Results", render: S.verify.render },
      questions: { shell: "app", title: "A Few Quick Questions", render: S.questions.render },
      "analysis-loading": { shell: "app", title: "Analysing Your Report", render: S.analysis.loading, afterRender: S.analysis.afterLoading },
      "analysis-summary": { shell: "app", title: "Your Health Snapshot", render: S.analysis.summary },
      results: { shell: "app", title: "Result Detail", render: S.results.render },
      domain: { shell: "app", title: "Health Domains", render: S.domain.render, afterRender: S.domain.afterRender },
      "action-plan": { shell: "app", title: "Your Action Plan", render: S.actionPlan.render },
      referral: { shell: "app", title: "Referral & Next Steps", render: S.referral.render },
      report: { shell: "app", title: "Full Report", render: S.report.render },
      trends: { shell: "app", title: "Trends", render: S.trends.render, afterRender: S.trends.afterRender },
      profile: { shell: "app", title: "My Profile", render: S.profile.render },
      reports: { shell: "app", title: "Blood Reports", render: S.reportsLibrary.render },
      education: { shell: "app", title: "Education", render: S.education.render },
      appointments: { shell: "app", title: "Appointments", render: S.appointments.render },
      settings: { shell: "app", title: "Settings", render: S.settings.render },
    };
  }

  function render() {
    // The enlarged trend chart (js/ui/trendChart.js) is appended straight
    // onto document.body, outside #root, so it would otherwise survive a
    // route change untouched — close it on every navigation rather than
    // leaving it stuck on top of whatever screen comes next.
    if (SQ.ui.trendModal) SQ.ui.trendModal.close();

    if (!SQ.store.state.booted) {
      document.getElementById("root").innerHTML = SQ.ui.loadingState("Loading EVA SQUARE…");
      return;
    }

    const { route, params } = parseHash();
    const table = routeTable();
    let def = table[route];

    if (typeof def === "function") { def(); return; }
    if (!def) { navigate(SQ.store.state.user ? "dashboard" : "welcome"); return; }

    const loggedIn = !!SQ.store.state.user;
    if (!AUTH_ROUTES.has(route) && !loggedIn) { navigate("welcome"); return; }
    if (AUTH_ROUTES.has(route) && loggedIn) { navigate("dashboard"); return; }

    let contentHtml;
    try {
      contentHtml = def.render(params) || SQ.ui.emptyState("Nothing to show yet.");
    } catch (e) {
      console.error("Screen render error for route", route, e);
      contentHtml = SQ.ui.callout("bad", "This screen hit a snag", SQ.ui.esc(e.message));
    }

    let wrapped;
    if (def.shell === "auth") wrapped = SQ.ui.shell.auth(contentHtml);
    else if (def.shell === "setup") wrapped = SQ.ui.shell.setup(contentHtml, def.step);
    else wrapped = SQ.ui.shell.app(route, contentHtml, { title: def.title });

    document.getElementById("root").innerHTML = wrapped;
    window.scrollTo(0, 0);
    if (typeof def.afterRender === "function") {
      try { def.afterRender(params); } catch (e) { console.error("afterRender error for route", route, e); }
    }
  }

  SQ.router = { navigate, parseHash, render };
})();
