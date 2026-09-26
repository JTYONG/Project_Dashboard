/* SQUARE — Page chrome: the centered auth-shell (Welcome/Register/Login),
 * the setup-shell (Terms/Consent onboarding stepper), and the app-shell
 * (sidebar + topline used from Dashboard onward).
 */
window.SQ = window.SQ || {};
SQ.ui = SQ.ui || {};

(function () {
  "use strict";
  const U = () => SQ.ui;

  function authTopbar() {
    return `<div class="auth-topbar">${U().brand()}
      <nav>
        <a href="#/welcome">Home</a>
        <a href="#/login">Log in</a>
        <a class="btn primary sm" href="#/register">Get started</a>
      </nav>
    </div>`;
  }

  function auth(content) {
    return `${authTopbar()}${content}${footerNote()}`;
  }

  function footerNote() {
    return `<div class="footer-note">SQUARE is a health interpretation and education platform. It does not provide a medical diagnosis. If you may have a medical emergency, call 999 immediately.</div>`;
  }

  function setup(content, stepId) {
    const steps = [{ id: "terms", label: "Terms" }, { id: "consent", label: "Consent" }];
    const nav = steps.map((s, i) => {
      const cls = s.id === stepId ? "active" : (steps.findIndex((x) => x.id === stepId) > i ? "done" : "");
      const chev = i < steps.length - 1 ? `<span class="chev">›</span>` : "";
      return `<span class="${cls}">${i + 1}. ${s.label}</span>${chev}`;
    }).join(" ");
    return `<div class="setup-topbar">${U().brand({ sm: true })}<div class="setup-steps">${nav}</div><div style="width:90px"></div></div>${content}`;
  }

  const NAV_ITEMS = [
    { route: "dashboard", label: "Dashboard", icon: "🏠" },
    { route: "reports", label: "Blood Reports", icon: "🧾" },
    { route: "domain/cardiovascular", label: "Health Domains", icon: "🩺", matchPrefix: "domain" },
    { route: "action-plan", label: "Action Plan", icon: "✅" },
    { route: "trends", label: "Trends", icon: "📈" },
    { route: "referral", label: "Referrals", icon: "🏥" },
    { route: "profile", label: "Health Profile", icon: "👤" },
    { route: "settings", label: "Settings", icon: "⚙️" },
  ];

  function initials(name) {
    if (!name) return "?";
    return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  }

  function sidebar(currentRoute) {
    const links = NAV_ITEMS.map((item) => {
      const active = item.matchPrefix ? currentRoute.indexOf(item.matchPrefix) === 0 : currentRoute === item.route;
      return `<a class="side-link ${active ? "active" : ""}" href="#/${item.route}"><span class="ico">${item.icon}</span>${item.label}</a>`;
    }).join("");
    return `<div class="app-sidebar">
      ${U().brand()}
      <div class="side-nav">${links}</div>
      <div class="side-foot">
        <button type="button" class="side-link" style="width:100%;border:none;background:none;" onclick="SQ.act.resetDemo()"><span class="ico">↺</span>Reset demo data</button>
      </div>
    </div>`;
  }

  function topline(pageTitle, pageSub, extraActions) {
    const user = SQ.store.state.session.user;
    return `<div class="app-topline">
      <div class="page-head"><h1>${U().esc(pageTitle)}</h1>${pageSub ? `<div class="sub">${pageSub}</div>` : ""}</div>
      <div class="topline-actions">
        ${extraActions || ""}
        <div class="top-bell">🔔<span class="dot"></span></div>
        <div class="user-chip" onclick="SQ.act.toggleUserMenu(event)">
          <div class="avatar">${initials(user && user.fullName)}</div>
          <span class="name">${U().esc(user ? user.fullName : "Guest")}</span>
          <div id="user-menu" class="user-menu" hidden>
            <a href="#/profile">Health Profile</a>
            <a href="#/settings">Settings</a>
            <button type="button" class="danger" onclick="SQ.act.logout()">Log out</button>
          </div>
        </div>
      </div>
    </div>`;
  }

  function app(route, content, opts) {
    opts = opts || {};
    return `<div class="app-shell">
      ${sidebar(route)}
      <div class="app-main">
        ${topline(opts.title || "", opts.sub || "", opts.actions)}
        ${content}
      </div>
    </div>
    <div class="disclaimer-banner print-hidden">⚠️ SQUARE provides health education and interpretation, not a medical diagnosis. In an emergency, call 999.</div>`;
  }

  SQ.ui.shell = { auth, setup, app, NAV_ITEMS, initials };
})();
