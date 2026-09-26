/* EVA SQUARE — Screens 1–5: Welcome, Register, Login, Terms & Conditions,
 * Consent. Ported from frontend-v2's ui/screens/auth.js — content is
 * unchanged (still the same five screens, same copy, same legal draft,
 * "SQUARE" renamed "EVA SQUARE" per the real brand). The only functional
 * change is that Register now collects and submits a real password field
 * (the backend hashes it — see backend/app/security.py) since v2's fake
 * "any email logs you in" auth is replaced by real accounts.
 */
window.SQ = window.SQ || {};
SQ.screens = SQ.screens || {};

(function () {
  "use strict";
  const U = () => SQ.ui;

  function welcome() {
    return `
    <div class="auth-hero">
      <div>
        <h1>Understand your health results — clearly, safely, one report at a time.</h1>
        <p class="lede">Upload a blood report and EVA SQUARE turns it into plain-language explanations, a real cardiovascular risk assessment, and a personalised action plan — never a diagnosis, always a next step you can act on.</p>
        <div class="cta-row">
          ${U().btn("Get started free", { href: "register", variant: "primary" })}
          ${U().btn("I already have an account", { href: "login", variant: "outline" })}
        </div>
        <div class="trust-row">
          <span>🔒 Private &amp; encrypted</span>
          <span>🩺 Built with real clinical guidelines</span>
          <span>🇲🇾 Malaysia-ready</span>
        </div>
      </div>
      <div class="auth-card">
        <h2>Try it instantly</h2>
        <p class="sub">Skip typing — load a sample report and see the full experience end to end.</p>
        ${U().btn("Load a routine sample report", { block: true, variant: "navy", onclick: "SQ.act.tryDemo('routine')" })}
        <div style="height:10px"></div>
        ${U().btn("Load an urgent-pathway sample", { block: true, variant: "outline", onclick: "SQ.act.tryDemo('urgent')" })}
        <div class="auth-secure-note">⚠️ Demo data only — no real patient information</div>
      </div>
    </div>
    <div class="marketing-strip">
      <div class="journey-row">
        ${["Upload", "Verify", "Answer", "Analyse", "Act"].map((s, i) =>
          `<div class="journey-step"><div class="num">${i + 1}</div><div><strong>${s}</strong></div></div>${i < 4 ? `<div class="journey-connector"></div>` : ""}`
        ).join("")}
      </div>
      <div class="feature-cards">
        ${U().card(`<h4>❤️ Real cardiovascular science</h4><p class="d" style="margin-top:6px;color:var(--muted);font-size:.85rem">Blood pressure, Framingham risk, LDL/ApoB, Lp(a) — implemented from a clinical specification, not guesses.</p>`)}
        ${U().card(`<h4>🧠 Plain-language explanations</h4><p class="d" style="margin-top:6px;color:var(--muted);font-size:.85rem">Every number comes with why it matters and what discordant results mean together.</p>`)}
        ${U().card(`<h4>🏥 Safety-first escalation</h4><p class="d" style="margin-top:6px;color:var(--muted);font-size:.85rem">Emergency, prompt, routine or self-managed — you always know what to do next.</p>`)}
        ${U().card(`<h4>📈 Longitudinal tracking</h4><p class="d" style="margin-top:6px;color:var(--muted);font-size:.85rem">See how your markers move over time, not just a single snapshot.</p>`)}
      </div>
    </div>`;
  }

  function register() {
    return `
    <div class="auth-hero" style="padding-top:40px">
      <div>
        <h2 style="font-size:2rem">Create your EVA SQUARE account</h2>
        <p class="lede">Takes under a minute. You'll review our Terms and Consent next, before any health information is processed.</p>
      </div>
      <div class="auth-card">
        <h2>Sign up</h2>
        <p class="sub">Step 1 of 3 — Account details</p>
        <div class="auth-progress"><div style="width:33%"></div></div>
        <form onsubmit="SQ.act.submitRegister(event)">
          <div class="field"><label>Full name</label><input type="text" id="reg-name" required placeholder="e.g. Dexter Tan"></div>
          <div class="field"><label>Email address</label><input type="email" id="reg-email" required placeholder="you@example.com"></div>
          <div class="field"><label>Password</label><input type="password" id="reg-pw" required minlength="4" placeholder="At least 4 characters"></div>
          <div class="checkbox-row" style="margin-bottom:16px"><input type="checkbox" id="reg-updates"><label for="reg-updates" style="font-size:.85rem;color:var(--muted)">Send me occasional health education updates (optional)</label></div>
          ${U().btn("Continue", { block: true, type: "submit" })}
        </form>
        <div class="auth-foot">Already have an account? <a href="#/login">Log in</a></div>
        <div class="auth-secure-note">🔒 Your details are encrypted in transit and at rest</div>
      </div>
    </div>`;
  }

  function login() {
    return `
    <div class="auth-hero" style="padding-top:60px">
      <div>
        <h2 style="font-size:2rem">Welcome back</h2>
        <p class="lede">Log in to continue reviewing your health reports, action plan and trends.</p>
      </div>
      <div class="auth-card">
        <h2>Log in</h2>
        <p class="sub">Use the email and password you registered with.</p>
        <form onsubmit="SQ.act.submitLogin(event)">
          <div class="field"><label>Email address</label><input type="email" id="login-email" required placeholder="you@example.com"></div>
          <div class="field"><label>Password</label><input type="password" id="login-pw" required placeholder="••••••••"></div>
          ${U().btn("Log in", { block: true, type: "submit" })}
        </form>
        <div class="auth-divider">or</div>
        ${U().btn("Continue with routine sample account", { block: true, variant: "outline", onclick: "SQ.act.tryDemo('routine')" })}
        <div class="auth-foot">New to EVA SQUARE? <a href="#/register">Create an account</a></div>
      </div>
    </div>`;
  }

  function terms() {
    const toc = SQ.termsSections.map((s) => `<a class="toc-item" href="#tc-${s.id}">${U().esc(s.title)}</a>`).join("");
    const body = SQ.termsSections.map((s) => `
      <div class="legal-section" id="tc-${s.id}">
        <h3>${U().esc(s.title)}</h3>
        ${s.body.map((p) => `<p>${U().esc(p)}</p>`).join("")}
        ${s.list ? `<ul>${s.list.map((li) => `<li>${U().esc(li)}</li>`).join("")}</ul>` : ""}
        ${s.note ? U().callout(s.note.tone, s.note.title, U().esc(s.note.text)) : ""}
      </div>`).join("");
    return `
    <div class="legal-wrap">
      <h1>Terms &amp; Conditions</h1>
      <div class="sub">${U().esc(SQ.ORG.legalName)} · Effective ${U().esc(SQ.ORG.effectiveDate)} · ${U().esc(SQ.ORG.version)}</div>
      ${U().callout("info", null, "This is a sample legal draft for prototype purposes and has not been reviewed by qualified Malaysian legal counsel.")}
      <div class="legal-body">
        <div class="toc-card card pad-sm">${toc}</div>
        <div class="legal-doc">${body}</div>
      </div>
    </div>
    <div class="sticky-footer-bar">
      <div class="agree-text">
        <label class="checkbox-row"><input type="checkbox" id="tc-agree"><span>I have read and agree to the Terms &amp; Conditions<span class="note">Required to continue</span></span></label>
      </div>
      ${U().btn("Continue to Consent", { onclick: "SQ.act.continueFromTerms()" })}
    </div>`;
  }

  function consentItemHtml(c) {
    const checked = SQ.store.state.consent.required[c.id];
    return `<div class="consent-item">
      <div class="icon-badge">${c.icon}</div>
      <div style="flex:1"><h4>${U().esc(c.title)}</h4><p>${U().esc(c.body)}</p>
      <p style="font-size:.78rem;color:var(--muted-2);margin-top:6px">${U().esc(c.detail)}</p></div>
      ${U().toggle("req-" + c.id, checked, `SQ.act.setConsent('required','${c.id}',this.checked)`)}
    </div>`;
  }

  function consentOptionalHtml(c) {
    const checked = SQ.store.state.consent.optional[c.id];
    return `<div class="consent-optional-card">
      <div class="top-row"><div><h4>${U().esc(c.title)}</h4><p>${U().esc(c.body)}</p></div>
      ${U().toggle("opt-" + c.id, checked, `SQ.act.setConsent('optional','${c.id}',this.checked)`)}</div>
      ${c.points.length ? `<ul>${c.points.map((p) => `<li>• ${U().esc(p)}</li>`).join("")}</ul>` : ""}
    </div>`;
  }

  function consent() {
    const complete = SQ.store.requiredConsentComplete();
    return `
    <div class="legal-wrap" style="padding-bottom:110px">
      <h1>Your Consent</h1>
      <div class="sub">These choices control how EVA SQUARE may use your information. You can change optional consents anytime in Settings.</div>
      ${U().callout("bad", "Emergency warning", "EVA SQUARE must not be used for urgent or emergency care. If you may have a medical emergency, call 999 or go to the nearest emergency department immediately.")}
      <div class="consent-grid">
        <div><h3 style="font-size:1rem;margin:20px 0 12px">Required to use EVA SQUARE</h3>${SQ.consentRequired.map(consentItemHtml).join("")}</div>
        <div><h3 style="font-size:1rem;margin:20px 0 12px">Optional</h3>${SQ.consentOptional.map(consentOptionalHtml).join("")}</div>
      </div>
    </div>
    <div class="sticky-footer-bar">
      <div class="agree-text">${complete ? "All required consents given." : "Please review all three required items before continuing."}<span class="note">You can withdraw optional consent anytime</span></div>
      ${U().btn("Continue to EVA SQUARE", { onclick: "SQ.act.continueFromConsent()", disabled: !complete })}
    </div>`;
  }

  SQ.screens.auth = { welcome, register, login, terms, consent };
})();
