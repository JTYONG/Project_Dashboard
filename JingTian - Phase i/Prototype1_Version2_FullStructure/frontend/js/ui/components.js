/* EVA SQUARE — Reusable HTML-string components. No framework/build step:
 * every screen renders by returning an HTML string, and the router swaps
 * #root.innerHTML wholesale on every state change (see ui/router.js).
 *
 * Ported from frontend-v2's ui/components.js. Two additions for this
 * FullStructure build: `brand()` now renders the real EVA SQUARE.png logo
 * (served by the backend's /assets StaticFiles mount) instead of the old
 * CSS-drawn mark, and `loadingState()` / `notReady()` support the new
 * async-backend loading states that v2 never needed (it computed
 * everything locally, synchronously).
 */
window.SQ = window.SQ || {};
SQ.ui = SQ.ui || {};

(function () {
  "use strict";

  function esc(s) {
    if (s == null) return "";
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function nl2br(s) { return esc(s).replace(/\n/g, "<br>"); }

  function brand(opts) {
    opts = opts || {};
    const sm = opts.sm ? " sm" : "";
    return `<div class="brand${sm}"><img class="brand-logo" src="/assets/EVA%20SQUARE.png" alt="EVA SQUARE"><div class="brand-text">
      <span class="brand-name">EVA SQUARE</span><span class="brand-tag">Health Interpretation Platform</span>
    </div></div>`;
  }

  function btn(label, opts) {
    opts = opts || {};
    const cls = ["btn", opts.variant || "primary", opts.sm ? "sm" : "", opts.block ? "block" : ""].filter(Boolean).join(" ");
    const attrs = [
      opts.href ? `href="#${opts.href}"` : "",
      opts.onclick ? `onclick="${opts.onclick}"` : "",
      opts.disabled ? "disabled" : "",
      opts.type ? `type="${opts.type}"` : "",
      opts.id ? `id="${opts.id}"` : "",
    ].filter(Boolean).join(" ");
    const tag = opts.href ? "a" : "button";
    return `<${tag} class="${cls}" ${attrs}>${opts.icon ? `<span>${opts.icon}</span>` : ""}${esc(label)}</${tag}>`;
  }

  function pill(tone, label, icon) {
    return `<span class="pill ${tone}">${icon ? icon + " " : ""}${esc(label)}</span>`;
  }

  function dotInd(tone) { return `<span class="dot-ind ${tone}"></span>`; }

  function callout(tone, title, text, icon) {
    icon = icon || (tone === "bad" ? "!" : tone === "warn" ? "!" : tone === "good" ? "✓" : "i");
    return `<div class="callout ${tone}"><div class="ic">${icon}</div><div>
      ${title ? `<div class="callout-title">${esc(title)}</div>` : ""}<div>${text}</div>
    </div></div>`;
  }

  function card(inner, opts) {
    opts = opts || {};
    const cls = ["card", opts.pad === "sm" ? "pad-sm" : ""].filter(Boolean).join(" ");
    return `<div class="${cls}"${opts.id ? ` id="${opts.id}"` : ""}>${inner}</div>`;
  }

  function toggle(id, checked, onchange) {
    return `<label class="toggle"><input type="checkbox" id="${id}" ${checked ? "checked" : ""} onchange="${onchange || ""}"><span class="track"></span></label>`;
  }

  function choiceBtn(label, selected, onclick) {
    return `<button type="button" class="choice-btn ${selected ? "selected" : ""}" onclick="${onclick}"><span class="dot"></span>${esc(label)}</button>`;
  }

  function choiceRow(options, selectedValue, onclickFn) {
    return `<div class="choice-row">${options.map((o) => choiceBtn(o, o === selectedValue, `${onclickFn}('${esc(o).replace(/'/g, "\\'")}')`)).join("")}</div>`;
  }

  function stepper(steps, activeIndex) {
    return `<div class="stepper">${steps.map((s, i) => {
      const state = i < activeIndex ? "done" : i === activeIndex ? "active" : "";
      const line = i < steps.length - 1 ? `<div class="step-line ${i < activeIndex ? "done" : ""}"></div>` : "";
      return `<div class="step-node ${state}"><div class="step-circle">${i < activeIndex ? "✓" : i + 1}</div><div class="step-label">${esc(s)}</div></div>${line}`;
    }).join("")}</div>`;
  }

  function tabsNav(items, activeId) {
    return `<div class="tabs">${items.map((t) =>
      `<button type="button" class="tab-btn ${t.id === activeId ? "active" : ""}" onclick="${t.onclick}">${esc(t.label)}</button>`
    ).join("")}</div>`;
  }

  function progressRing(pct, valueLabel) {
    return `<div class="progress-ring" style="--pct:${pct}"><div class="val">${valueLabel != null ? valueLabel : pct + "<small>%</small>"}</div></div>`;
  }

  function checkSteps(steps) {
    return `<div class="check-steps">${steps.map((s, i) => {
      const icon = s.status === "done" ? "✓" : i + 1;
      return `<div class="check-step ${s.status}"><div class="num2">${icon}</div><div class="lab">${esc(s.label)}</div><div class="st">${s.status === "done" ? "Done" : s.status === "active" ? "In progress" : "Waiting"}</div></div>`;
    }).join(`<div class="check-connector"></div>`)}</div>`;
  }

  function safetyLadder(levels, recommendedId) {
    return `<div class="safety-ladder">${levels.map((l) =>
      `<div class="ladder-card ${l.id === recommendedId ? "recommended" : ""}">
        ${l.id === recommendedId ? `<div class="check-badge">✓</div>` : ""}
        <div class="lvl l${l.rank}">${l.rank}</div>
        <div class="body"><h4>${esc(l.label)}</h4><p>${esc(l.description)}</p></div>
        ${pill(l.tone, l.action)}
      </div>`
    ).join("")}</div>`;
  }

  function timeline(points) {
    return `<div class="timeline">${points.map((p) =>
      `<div class="tl-point"><div class="dot2"></div><div class="lbl">${esc(p.label)}</div><div class="sub">${esc(p.sub || "")}</div></div>`
    ).join("")}</div>`;
  }

  function domainCard(domain, resultSummary, opts) {
    opts = opts || {};
    const d = SQ.DOMAINS[domain];
    return `<div class="domain-card ${opts.clickable ? "clickable" : ""}" ${opts.onclick ? `onclick="${opts.onclick}"` : ""}>
      <div class="dic" style="background:${d.color}1a;color:${d.color}">${d.icon}</div>
      <div style="flex:1"><h4>${esc(d.label)}</h4><p class="d">${resultSummary}</p></div>
      ${opts.pill ? opts.pill : ""}
    </div>`;
  }

  function kvGrid(items) {
    return `<div class="kv-grid">${items.map((it) => `<div><div class="k">${esc(it.k)}</div><div class="v">${it.v}</div></div>`).join("")}</div>`;
  }

  function snapTile(k, v, sm) {
    return `<div class="snap-tile"><div class="k">${esc(k)}</div><div class="v ${sm ? "sm" : ""}">${v}</div></div>`;
  }

  function numBadge(n) { return `<div class="num-badge">${n}</div>`; }

  function emptyState(text) { return `<div class="empty-state">${esc(text)}</div>`; }

  // ---- FullStructure additions: async loading / not-ready states ----
  function loadingState(message) {
    return `<div class="loading-state"><div class="spinner"></div>${esc(message || "Loading…")}</div>`;
  }

  // Shown instead of analysis-dependent content when a report hasn't been
  // verified yet (the backend only computes analysis for verified
  // reports — see backend/app/routers/reports.py#get_analysis). Frontend-v2
  // never needed this because it computed analysis locally and unconditionally.
  function notReady(report) {
    if (!report) return emptyState("No report yet — upload one first.");
    return card(`
      <div class="empty-state">
        <h3 style="color:var(--navy)">This report isn't analysed yet</h3>
        <p style="margin-top:8px;color:var(--muted)">Verify its extracted lab values and answer a few quick questions to generate your health snapshot.</p>
        <div style="margin-top:16px">${btn("Continue verifying", { href: "verify" })}</div>
      </div>`);
  }

  // ---- toast ----
  function ensureToastRoot() {
    let el = document.getElementById("toast-root");
    if (!el) { el = document.createElement("div"); el.id = "toast-root"; document.body.appendChild(el); }
    return el;
  }
  function toast(msg, tone) {
    const root = ensureToastRoot();
    const el = document.createElement("div");
    el.className = "toast" + (tone ? " " + tone : "");
    el.textContent = msg;
    root.appendChild(el);
    setTimeout(() => { el.remove(); }, 3200);
  }

  SQ.ui.esc = esc; SQ.ui.nl2br = nl2br;
  SQ.ui.brand = brand; SQ.ui.btn = btn; SQ.ui.pill = pill; SQ.ui.dotInd = dotInd;
  SQ.ui.callout = callout; SQ.ui.card = card; SQ.ui.toggle = toggle;
  SQ.ui.choiceBtn = choiceBtn; SQ.ui.choiceRow = choiceRow; SQ.ui.stepper = stepper;
  SQ.ui.tabsNav = tabsNav; SQ.ui.progressRing = progressRing; SQ.ui.checkSteps = checkSteps;
  SQ.ui.safetyLadder = safetyLadder; SQ.ui.timeline = timeline; SQ.ui.domainCard = domainCard;
  SQ.ui.kvGrid = kvGrid; SQ.ui.snapTile = snapTile; SQ.ui.numBadge = numBadge;
  SQ.ui.emptyState = emptyState; SQ.ui.loadingState = loadingState; SQ.ui.notReady = notReady;
  SQ.ui.toast = toast;
})();
