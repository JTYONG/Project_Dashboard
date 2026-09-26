/* SQUARE — Screen 20: Settings. */
window.SQ = window.SQ || {};
SQ.screens = SQ.screens || {};

(function () {
  "use strict";
  const U = () => SQ.ui;

  function render() {
    const s = SQ.store.state.settings;
    return `
    <div class="grid cols-2">
      ${U().card(`
        <h3 style="font-size:1.02rem">Preferences</h3>
        <div class="card-row" style="margin-top:14px"><span>Units</span>
          <div class="segmented" style="width:180px"><button class="${s.units === "metric" ? "active" : ""}" onclick="SQ.act.setSetting('units','metric')">Metric</button><button class="${s.units === "imperial" ? "active" : ""}" onclick="SQ.act.setSetting('units','imperial')">Imperial</button></div>
        </div>
        <div class="card-row" style="margin-top:16px"><span>Notifications</span>${U().toggle("set-notif", s.notifications, "SQ.act.setSetting('notifications', this.checked)")}</div>
      `)}
      ${U().card(`
        <h3 style="font-size:1.02rem">Optional consent</h3>
        ${SQ.consentOptional.map((c) => `<div class="card-row" style="margin-top:14px"><span>${U().esc(c.title)}</span>${U().toggle("set-opt-" + c.id, SQ.store.state.consent.optional[c.id], `SQ.act.setConsent('optional','${c.id}',this.checked)`)}</div>`).join("")}
      `)}
    </div>
    <div class="section-title">Account</div>
    ${U().card(`
      <div class="card-row"><span>Reset all demo data</span>${U().btn("Reset", { variant: "danger-ghost", sm: true, onclick: "SQ.act.resetDemo()" })}</div>
      <div class="hr"></div>
      <div class="card-row"><span>Log out</span>${U().btn("Log out", { variant: "outline", sm: true, onclick: "SQ.act.logout()" })}</div>
    `)}
    <div class="section-title">Legal</div>
    ${U().card(`
      <div class="card-row"><span>Terms &amp; Conditions</span>${U().btn("Review", { href: "terms", variant: "outline", sm: true })}</div>
      <div class="hr"></div>
      <div class="card-row"><span>Consent record</span>${U().btn("Review", { href: "consent", variant: "outline", sm: true })}</div>
    `)}
    `;
  }

  SQ.screens.settings = { render };
})();
