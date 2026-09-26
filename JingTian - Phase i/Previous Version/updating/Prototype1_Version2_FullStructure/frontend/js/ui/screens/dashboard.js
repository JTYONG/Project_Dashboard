/* EVA SQUARE — Screen 6: Overview (formerly "Dashboard").
 *
 * Rewritten per the user's Requirement #2 into six modular status blocks
 * plus a header toolbar, replacing the old 4-tile snapshot row and bottom
 * shortcut-card row (their function is now covered by the toolbar and
 * Block 1's own buttons):
 *   1. Health at a Glance   — overall status, last-updated date, trend
 *   2. Recommended Actions  — the 3 most prioritised action-plan items
 *   3. General Health Comments — strengths / areas to improve, in prose
 *   4. Anthropometric Profile  — height/weight/BMI/waist tiles + weight trend
 *   5. Body & Health Domains   — the existing interactive anatomy board
 *
 * (Blocks 4 and 5 correspond to the "5th"/"6th" blocks in the user's
 * request; the request named blocks 1/2/3/5/6 but never an explicit
 * "4th" — this file treats that as a numbering slip and renders exactly
 * five content blocks in the order given, which is flagged back to the
 * user alongside this change.)
 *
 * Two features described in Picture 4 have no backend support yet in this
 * basis version (no endpoint/table for manual readings, reminders, custom
 * date ranges, or data export) — those toolbar actions route through
 * SQ.act.notImplemented()/setReminder(), which say so plainly rather than
 * faking a result, the same honesty convention the rest of the app uses
 * (see Appointments, reports.py's OCR note).
 */
window.SQ = window.SQ || {};
SQ.screens = SQ.screens || {};

(function () {
  "use strict";
  const U = () => SQ.ui;

  const TONE_RANK = { bad: 3, warn: 2, good: 1, neutral: 0 };
  const TONE_LABEL = { bad: "Needs attention", warn: "Monitor", good: "Stable", neutral: "No data yet" };
  const TONE_DESC = {
    bad: "One or more health domains have findings that need attention soon.",
    warn: "A few things are worth keeping an eye on — nothing urgent right now.",
    good: "Everything reviewed so far is within the expected range.",
    neutral: "Not enough verified results yet to give an overall status.",
  };

  function overallTone(analysis) {
    let best = "neutral";
    (SQ.DOMAIN_ORDER || []).forEach((key) => {
      const t = U().anatomy.domainTone(key, analysis);
      const norm = t === "info" ? "good" : t;
      if ((TONE_RANK[norm] || 0) > (TONE_RANK[best] || 0)) best = norm;
    });
    return best;
  }

  function formatDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  }

  // Heuristic only: the backend has no single "overall trend" metric, so
  // this combines the two quantities elsewhere in the app whose direction
  // already has an unambiguous good/bad meaning (weight, home blood
  // pressure) rather than inventing a more sophisticated composite score.
  function overallTrend(trends) {
    if (!trends) return { tone: "neutral", arrow: "→", text: "Loading trend history…" };
    const w = trends.weight, bp = trends.homeBP;
    const dirs = [];
    if (w) dirs.push(w.direction === "down" ? "good" : w.direction === "up" ? "warn" : "flat");
    if (bp) dirs.push(bp.direction === "down" ? "good" : bp.direction === "up" ? "warn" : "flat");
    if (!dirs.length) return { tone: "neutral", arrow: "→", text: "Not enough report history yet to show a trend." };
    const better = dirs.filter((d) => d === "good").length;
    const worse = dirs.filter((d) => d === "warn").length;
    if (worse > better) return { tone: "warn", arrow: "↑", text: "Weight and/or blood pressure have moved in the wrong direction recently." };
    if (better > worse) return { tone: "good", arrow: "↓", text: "Weight and/or blood pressure have improved since your last few reports." };
    return { tone: "neutral", arrow: "→", text: "Holding steady since your last few reports." };
  }

  function toolbar() {
    return `<div class="dash-toolbar">
      <div class="dash-toolbar-actions">
        ${U().btn("Upload Blood Report", { href: "upload", variant: "outline", sm: true })}
        ${U().btn("+ Add Health Reading", { onclick: "SQ.act.notImplemented('Adding a manual health reading')", variant: "outline", sm: true })}
        <select class="dash-range-select" onchange="SQ.act.notImplemented('Custom date ranges')" title="This prototype doesn't filter by date range yet">
          <option>Last 6 months</option>
          <option>Last 3 months</option>
          <option>Last 12 months</option>
          <option>All time</option>
        </select>
        ${U().btn("Download Report", { href: "report", sm: true })}
        ${U().btn("Book Consultation", { href: "appointments", sm: true })}
        <div class="dash-more-wrap">
          ${U().btn("•••", { onclick: "SQ.act.toggleMoreMenu(event)", variant: "outline", sm: true })}
          <div id="dash-more-menu" class="dash-more-menu" hidden>
            <a href="#reports">View report library</a>
            <a href="#settings">Settings</a>
            <button type="button" onclick="SQ.act.notImplemented('Exporting your data')">Export data</button>
          </div>
        </div>
      </div>
    </div>`;
  }

  function blockGlance(analysis, report, trends) {
    const tone = overallTone(analysis);
    const trend = overallTrend(trends);
    return U().card(`
      <div class="card-row" style="align-items:flex-start">
        <div>
          <h3 style="font-size:1.05rem">Health at a Glance</h3>
          <p class="dash-updated">Last updated ${U().esc(formatDate(analysis.report && analysis.report.generatedAt))}</p>
        </div>
        ${U().pill(tone, TONE_LABEL[tone])}
      </div>
      <p class="dash-glance-desc">${U().esc(TONE_DESC[tone])}</p>
      <div class="dash-trend-row tone-${trend.tone}">
        <span class="dash-trend-arrow">${trend.arrow}</span>
        <span>${U().esc(trend.text)}</span>
      </div>
      <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap">
        ${U().btn("View action plan", { href: "action-plan", sm: true })}
        ${U().btn("Set reminder", { onclick: "SQ.act.setReminder()", variant: "outline", sm: true })}
      </div>
    `);
  }

  function blockActions(analysis) {
    const recs = analysis.recommendations || [];
    const top3 = recs.slice(0, 3);
    const done = SQ.store.state.actionPlanDone || {};
    const rows = top3.map((r, i) => `
      <div class="dash-action-row">
        <div class="dash-action-num">${i + 1}</div>
        <div style="flex:1">
          <h4 style="font-size:.94rem;color:var(--navy)">${U().esc(r.issue)}</h4>
          <p style="color:var(--muted);font-size:.85rem;margin-top:3px">${U().esc(r.action)}</p>
        </div>
        ${U().pill(done[r.code] ? "good" : "warn", done[r.code] ? "Done" : "To do")}
      </div>`).join("");
    return U().card(`
      <div class="card-row">
        <h3 style="font-size:1.05rem">Recommended Actions</h3>
        ${U().btn("View all (" + recs.length + ")", { href: "action-plan", variant: "outline", sm: true })}
      </div>
      <p style="color:var(--muted);font-size:.86rem;margin-top:4px">Your three most prioritised recommendations from this report.</p>
      ${top3.length ? `<div class="stack" style="margin-top:10px">${rows}</div>` : `<div style="margin-top:10px">${U().emptyState("No recommendations from this report.")}</div>`}
    `);
  }

  function blockComments(analysis) {
    const entries = (SQ.DOMAIN_ORDER || []).map((key) => ({
      key, label: (SQ.DOMAINS[key] || {}).label || key,
      tone: (function () { const t = U().anatomy.domainTone(key, analysis); return t === "info" ? "good" : t; })(),
      summary: U().anatomy.domainSummary(key, analysis),
    }));
    const strengths = entries.filter((d) => d.tone === "good");
    const concerns = entries.filter((d) => d.tone === "warn" || d.tone === "bad");
    const safety = analysis.safety || {};
    let note;
    if (safety.overall === "emergency" || safety.overall === "urgent") {
      note = U().callout(safety.overall === "emergency" ? "bad" : "warn", "Professional review recommended",
        U().esc(safety.level ? safety.level.description : "") + ` <a href="#/referral">View referral guidance →</a>`);
    } else if (concerns.length) {
      note = U().callout("info", null, "Consider discussing the areas above with a healthcare professional at your next visit.");
    } else {
      note = U().callout("good", null, "No domains are currently flagged for professional review.");
    }
    return U().card(`
      <h3 style="font-size:1.05rem">General Health Comments</h3>
      <div class="dash-comments-grid">
        <div>
          <h4 class="dash-comments-heading good">Strengths</h4>
          ${strengths.length ? `<ul class="dash-comments-list">${strengths.map((d) => `<li>${U().esc(d.label)} — ${U().esc(d.summary)}</li>`).join("")}</ul>` : `<p class="dash-comments-empty">No domains are currently rated fully stable.</p>`}
        </div>
        <div>
          <h4 class="dash-comments-heading warn">Areas to Improve</h4>
          ${concerns.length ? `<ul class="dash-comments-list">${concerns.map((d) => `<li>${U().esc(d.label)} — ${U().esc(d.summary)}</li>`).join("")}</ul>` : `<p class="dash-comments-empty">Nothing flagged for follow-up right now.</p>`}
        </div>
      </div>
      <div style="margin-top:14px">${note}</div>
    `);
  }

  const DIR_COLOR = { down: "#2f9e44", up: "#c0392b", flat: "#64748b" };
  function bmiTone(category) {
    return category === "Normal" ? "good" : category === "Obese" ? "bad" : category === "Underweight" || category === "Overweight" ? "warn" : "neutral";
  }

  function blockAnthropometric(report, analysis, trends) {
    const profile = report.profile || {};
    const anthro = analysis.anthropometric || {};
    const whr = (profile.waist != null && profile.height) ? profile.waist / profile.height : null;
    const whrFlag = whr != null && whr >= 0.5;
    const weightTrend = trends && trends.weight;
    const spark = (weightTrend && weightTrend.series && weightTrend.series.length > 1)
      ? SQ.screens.trends.sparkline(weightTrend.series, DIR_COLOR[weightTrend.direction] || DIR_COLOR.flat)
      : "";
    return U().card(`
      <h3 style="font-size:1.05rem">Anthropometric Profile</h3>
      <div class="dash-anthro-grid">
        <div class="dash-anthro-tile">
          <div class="k">Height</div>
          <div class="v">${profile.height != null ? profile.height + " cm" : "—"}</div>
        </div>
        <div class="dash-anthro-tile">
          <div class="k">Weight</div>
          <div class="v">${profile.weight != null ? profile.weight + " kg" : "—"}</div>
          ${spark ? `<div class="dash-anthro-spark">${spark}</div>` : ""}
        </div>
        <div class="dash-anthro-tile">
          <div class="k">BMI</div>
          <div class="v">${anthro.bmi != null ? anthro.bmi : "—"}</div>
          ${anthro.bmiCategory ? U().pill(bmiTone(anthro.bmiCategory), anthro.bmiCategory) : ""}
        </div>
        <div class="dash-anthro-tile">
          <div class="k">Waist</div>
          <div class="v">${profile.waist != null ? profile.waist + " cm" : "—"}</div>
          ${anthro.waistCutoff != null ? `<div class="dash-anthro-note">Cut-off: ${anthro.waistCutoff} cm</div>` : ""}
          ${anthro.waistFlag ? U().pill("warn", "Above cut-off") : ""}
        </div>
        <div class="dash-anthro-tile">
          <div class="k">Waist-to-height ratio</div>
          <div class="v">${whr != null ? whr.toFixed(2) : "—"}</div>
          ${whr != null ? U().pill(whrFlag ? "warn" : "good", whrFlag ? "Above 0.5" : "Within range") : ""}
          <div class="dash-anthro-note">Illustrative indicator only (waist ÷ height) — not a diagnosis.</div>
        </div>
      </div>
    `);
  }

  function blockAnatomy(analysis) {
    return U().card(U().anatomy.render(analysis));
  }

  function render() {
    if (SQ.store.state.reports === null) return U().loadingState("Loading your reports…");
    const report = SQ.store.getActiveReport();
    if (!SQ.store.state.activeReportId) return emptyDashboard();
    if (!report) return U().loadingState("Loading your latest report…");
    if (report.status !== "verified") return U().notReady(report);

    const analysis = SQ.store.getAnalysis(report.id);
    if (!analysis) return U().loadingState("Analysing your results…");
    const trends = SQ.store.getTrends(report.id); // may be null while still loading — every block below handles that

    const safety = analysis.safety || {};
    const safetyBanner = safety.overall === "emergency" || safety.overall === "urgent"
      ? U().callout(safety.overall === "emergency" ? "bad" : "warn", safety.level.label, U().esc(safety.level.description) + " " + U().esc(safety.level.action) + ` <a href="#/referral">View guidance →</a>`)
      : "";

    return `
    ${safetyBanner}
    ${toolbar()}
    <div class="dash-block">${blockGlance(analysis, report, trends)}</div>
    <div class="dash-block">${blockActions(analysis)}</div>
    <div class="dash-block">${blockComments(analysis)}</div>
    <div class="dash-block">${blockAnthropometric(report, analysis, trends)}</div>
    <div class="dash-block">${blockAnatomy(analysis)}</div>
    `;
  }

  function afterRender() {
    if (SQ.store.state.activeReportId) U().anatomy.afterRender();
  }

  function emptyDashboard() {
    return `
    ${U().card(`
      <div class="empty-state">
        <h3 style="color:var(--navy)">No reports yet</h3>
        <p style="margin-top:8px;color:var(--muted)">Upload a blood report to get your first personalised health snapshot, or load a sample to explore EVA SQUARE.</p>
        <div style="display:flex;gap:10px;justify-content:center;margin-top:18px;flex-wrap:wrap">
          ${U().btn("Upload a report", { href: "upload" })}
          ${U().btn("Load routine sample", { variant: "outline", onclick: "SQ.act.tryDemo('routine')" })}
          ${U().btn("Load urgent sample", { variant: "outline", onclick: "SQ.act.tryDemo('urgent')" })}
        </div>
      </div>`)}
    `;
  }

  SQ.screens.dashboard = { render, afterRender };
})();
