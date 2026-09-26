/* EVA SQUARE — Education. New sidebar section: a plain-language library of
 * every education snippet the backend serves (GET /api/meta/education,
 * data/recommendations.py#EDUCATION — see the technical manual's
 * appendix), bound onto SQ.education at boot (store.js#bindMetaGlobals).
 * No new backend content — this screen just gives every existing snippet
 * a home outside the domain-detail tabs that already surface a few of
 * them contextually (js/ui/screens/domain.js#educationList).
 */
window.SQ = window.SQ || {};
SQ.screens = SQ.screens || {};

(function () {
  "use strict";
  const U = () => SQ.ui;

  // Friendly title + owning domain for each known education code. A code
  // with no entry here still renders (title falls back to a slug of the
  // code itself), so this list never blocks a new EDUCATION entry from
  // showing up here.
  const META = {
    EDU_BP_001: { title: "Understanding blood pressure", domain: "cardiovascular" },
    EDU_LDL_001: { title: "LDL cholesterol", domain: "cardiovascular" },
    EDU_APOB_001: { title: "Apolipoprotein B (ApoB)", domain: "cardiovascular" },
    EDU_FRS_001: { title: "10-year cardiovascular risk score", domain: "cardiovascular" },
    EDU_LPA_001: { title: "Lipoprotein(a) — Lp(a)", domain: "cardiovascular" },
    EDU_GLUCOSE_001: { title: "Fasting glucose & HbA1c", domain: "metabolic" },
    EDU_ALT_001: { title: "ALT (liver enzyme)", domain: "liver" },
  };

  function titleFor(code) {
    if (META[code]) return META[code].title;
    return code.replace(/^EDU_/, "").replace(/_\d+$/, "").replace(/_/g, " ").toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  function domainFor(code) { return (META[code] && META[code].domain) || null; }

  function card(code, text) {
    const domainKey = domainFor(code);
    const d = domainKey ? SQ.DOMAINS[domainKey] : null;
    return U().card(`
      <div class="card-row" style="align-items:center;margin-bottom:10px">
        <h4 style="font-size:0.98rem;color:var(--navy)">${U().esc(titleFor(code))}</h4>
        ${d ? U().pill("neutral", d.label) : ""}
      </div>
      <p style="color:#33405a;font-size:.88rem">${U().esc(text)}</p>
    `);
  }

  function render() {
    const education = SQ.education || {};
    const codes = Object.keys(education);
    if (!codes.length) return U().loadingState("Loading education content…");

    return `
    ${U().callout("info", null, "Plain-language explanations for the markers and scores EVA SQUARE uses. These are general education, not advice about your specific results — see your report's domain tabs for how each one applies to you.")}
    <div style="height:16px"></div>
    <div class="grid cols-2">
      ${codes.map((code) => card(code, education[code])).join("")}
    </div>
    `;
  }

  SQ.screens.education = { render };
})();
