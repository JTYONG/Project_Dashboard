/* EVA SQUARE — Interactive 2D anatomy board (Requirement #1).
 *
 * New for this FullStructure build (no v2 equivalent). Renders a body
 * illustration in the centre with a "medical infographic" card for each
 * health domain on either side (icon, status, one-line summary, chevron),
 * each connected to its organ by a thin leader line — mirroring the
 * reference layout the user asked to match, rather than the earlier
 * version's plain floating shapes-on-a-body. Every card:
 *   - is coloured by that domain's worst risk tone (good/warn/bad, or a
 *     neutral grey when no data was available for it) — the same tone
 *     vocabulary used everywhere else in the app;
 *   - darkens/lifts on hover, and cross-highlights its matching organ
 *     (and vice versa) via the shared `data-domain` attribute;
 *   - navigates to that domain's detail screen on click.
 *
 * The whole board (organs, leader lines and cards) is one SVG using
 * <foreignObject> for the card HTML — that way the cards scale together
 * with the illustration at any width instead of needing separate layout
 * math. Below ~880px a plain stacked list (.anatomy-compact-list) is
 * shown instead via CSS (see style.css) since the wide two-column layout
 * doesn't have room to breathe on a narrow screen.
 *
 * This is a hand-authored illustrative diagram, not medical artwork —
 * organ placement is stylised for readability, not anatomical precision.
 */
window.SQ = window.SQ || {};
SQ.ui = SQ.ui || {};

(function () {
  "use strict";
  const U = () => SQ.ui;

  const TONE_RANK = { bad: 3, warn: 2, good: 1, info: 0, neutral: -1 };
  function worstTone(tones) {
    let best = null;
    tones.forEach((t) => {
      if (!t) return;
      if (best === null || (TONE_RANK[t] || 0) > (TONE_RANK[best] || 0)) best = t;
    });
    return best === null ? "neutral" : (best === "info" ? "good" : best);
  }

  function cardiovascularTone(cv) {
    const tones = [];
    if (cv.bp) tones.push(cv.bp.tone);
    if (cv.framingham && cv.framingham.eligible) tones.push(cv.framingham.tone);
    if (cv.lipids && cv.lipids.ldl && cv.lipids.ldl.value != null) tones.push(cv.lipids.ldl.value >= 3.4 ? "warn" : "good");
    if (cv.supplementary) {
      if (cv.supplementary.aip) tones.push(cv.supplementary.aip.tone);
      if (cv.supplementary.castelliI) tones.push(cv.supplementary.castelliI.tone);
    }
    if (cv.advanced && cv.advanced.apoB) tones.push(cv.advanced.apoB.aboveGoal ? "warn" : "good");
    if (cv.advanced && cv.advanced.lpa) tones.push(cv.advanced.lpa.tone);
    if (cv.tgSafety) tones.push(cv.tgSafety.tone);
    return worstTone(tones);
  }

  function anthropometricTone(dom) {
    if (!dom) return "neutral";
    const cat = dom.bmiCategory;
    let tone = cat === "Normal" ? "good" : cat === "Underweight" ? "warn" : cat === "Overweight" ? "warn" : cat === "Obese" ? "bad" : "neutral";
    if (dom.waistFlag && tone !== "bad") tone = "warn";
    return tone;
  }

  function otherDomainTone(dom) {
    if (!dom || !dom.results || !dom.results.length) return "neutral";
    return worstTone(dom.results.map((r) => r.tone));
  }

  function domainTone(key, analysis) {
    if (key === "cardiovascular") return cardiovascularTone(analysis.cv);
    if (key === "anthropometric") return anthropometricTone(analysis.anthropometric);
    return otherDomainTone(analysis[key]);
  }

  function domainSummary(key, analysis) {
    if (key === "cardiovascular") {
      const cv = analysis.cv;
      return cv.bp ? cv.bp.label + " blood pressure" : "Reviewed";
    }
    if (key === "anthropometric") {
      const dom = analysis.anthropometric;
      return dom ? dom.bmiCategory + (dom.waistFlag ? " · waist above cut-off" : "") : "Reviewed";
    }
    const dom = analysis[key];
    if (!dom || !dom.results) return "Reviewed";
    const flagged = dom.results.filter((r) => r.tone !== "good").length;
    return flagged ? `${flagged} finding(s) to review` : "All within demo range";
  }

  const STATUS_LABEL = { good: "Stable", warn: "Monitor", bad: "Needs attention", neutral: "No data" };
  const STATUS_ICON = { cardiovascular: "❤", liver: "🫀", renal: "🫘", metabolic: "💧", haematology: "🩸", anthropometric: "📏" };

  // ---- Body + organ illustration, in a fixed 200×400 local space; placed
  // into the wider board canvas via a single shared transform (see
  // BODY_TRANSFORM below), which is also used to map each organ's anchor
  // point into board coordinates for the leader lines.
  const BODY_SCALE = 1.15, BODY_TX = 375, BODY_TY = 40;
  const BODY_TRANSFORM = `translate(${BODY_TX} ${BODY_TY}) scale(${BODY_SCALE})`;
  function toBoard(x, y) { return { x: BODY_TX + x * BODY_SCALE, y: BODY_TY + y * BODY_SCALE }; }

  // Anchor points or the organ's own click target, in local body space.
  const ANCHORS = {
    cardiovascular: { x: 97, y: 112 },
    liver: { x: 76, y: 172 },
    renal: { x: 100, y: 230 },
    haematology: { x: 100, y: 144 },
    metabolic: { x: 100, y: 200 },
    anthropometric: { x: 150, y: 254 },
  };

  function bodyGroup(tones) {
    // Decorative-only anatomy (no data / not clickable): the outline, a
    // simple brain, and a pair of lungs, purely so the figure reads as a
    // body rather than a bag of coloured blobs.
    const outline = `<path class="anatomy-silhouette" d="M100 18c10 0 18 8 18 19 0 9-5 16-12 19v6c22 4 36 18 40 38l6 50c2 12-2 22-12 26v84l10 80c2 12-4 20-14 20-8 0-14-6-16-16l-12-76h-8l-12 76c-2 10-8 16-16 16-10 0-16-8-14-20l10-80v-84c-10-4-14-14-12-26l6-50c4-20 18-34 40-38v-6c-7-3-12-10-12-19 0-11 8-19 18-19Z"/>`;
    const brain = `<g class="anatomy-decor-organ">
      <path d="M89 30c-6 0-10 5-10 10 0 2 0 4 1 6-3 2-4 5-4 8 0 6 5 10 10 10h1c1 3 4 5 7 5h12c3 0 6-2 7-5h1c5 0 10-4 10-10 0-3-1-6-4-8 1-2 1-4 1-6 0-5-4-10-10-10-3 0-5 1-7 3-2-2-4-3-7-3Z"/>
      <path class="anatomy-decor-line" d="M100 30v33M91 36c3 2 3 6 0 8M109 36c-3 2-3 6 0 8"/>
    </g>`;
    const lungs = `<g class="anatomy-decor-organ">
      <path d="M84 78c-10 2-18 12-19 26l-2 26c-1 8 4 14 11 14 6 0 10-4 11-11l4-38c1-8-1-15-5-17Z"/>
      <path d="M116 78c10 2 18 12 19 26l2 26c1 8-4 14-11 14-6 0-10-4-11-11l-4-38c-1-8 1-15 5-17Z"/>
    </g>`;
    const vessel = `<path class="anatomy-decor-line anatomy-vessel" d="M100 96 L100 260"/>`;

    // Heart: a small, evenly-proportioned two-lobe heart (classic
    // twin-arc + point construction), centred on ANCHORS.cardiovascular —
    // deliberately modest in size so it doesn't dominate the figure the
    // way a hand-drawn curve did in the previous version.
    const heart = `<g class="anatomy-organ tone-${tones.cardiovascular}" data-domain="cardiovascular" data-label="Cardiovascular" tabindex="0" role="button"
        onclick="SQ.router.navigate('domain/cardiovascular')" onkeydown="if(event.key==='Enter')SQ.router.navigate('domain/cardiovascular')">
      <path d="M97 128 C81 118 73 108 73 98 C73 90 79 84 87 84 C91 84 95 86 97 90 C99 86 103 84 107 84 C115 84 121 90 121 98 C121 108 113 118 97 128Z"/>
    </g>`;
    const liver = `<g class="anatomy-organ tone-${tones.liver}" data-domain="liver" data-label="Liver" tabindex="0" role="button"
        onclick="SQ.router.navigate('domain/liver')" onkeydown="if(event.key==='Enter')SQ.router.navigate('domain/liver')">
      <path d="M52 158c8-8 20-12 32-10 10 2 18 8 20 18 2 9-3 17-13 20-11 3-25 3-36-2-9-4-13-12-11-19 1-3 4-5 8-7Z"/>
    </g>`;
    const kidneys = `<g class="anatomy-organ tone-${tones.renal}" data-domain="renal" data-label="Renal" tabindex="0" role="button"
        onclick="SQ.router.navigate('domain/renal')" onkeydown="if(event.key==='Enter')SQ.router.navigate('domain/renal')">
      <path d="M78 218c-7-3-15 0-18 7-3 8 0 16 8 19 6 2 12 0 15-5 3-6 4-15 1-19-1-1-4-2-6-2Z"/>
      <path d="M122 218c7-3 15 0 18 7 3 8 0 16-8 19-6 2-12 0-15-5-3-6-4-15-1-19 1-1 4-2 6-2Z"/>
    </g>`;
    const metabolic = `<g class="anatomy-organ tone-${tones.metabolic}" data-domain="metabolic" data-label="Metabolic" tabindex="0" role="button"
        onclick="SQ.router.navigate('domain/metabolic')" onkeydown="if(event.key==='Enter')SQ.router.navigate('domain/metabolic')">
      <ellipse cx="100" cy="200" rx="16" ry="8" transform="rotate(-6 100 200)"/>
    </g>`;
    const haemNode = `<g class="anatomy-organ tone-${tones.haematology}" data-domain="haematology" data-label="Haematology" tabindex="0" role="button"
        onclick="SQ.router.navigate('domain/haematology')" onkeydown="if(event.key==='Enter')SQ.router.navigate('domain/haematology')">
      <circle cx="100" cy="144" r="8"/>
    </g>`;
    const anthro = `<g class="anatomy-organ tone-${tones.anthropometric}" data-domain="anthropometric" data-label="Anthropometric" tabindex="0" role="button"
        onclick="SQ.router.navigate('domain/anthropometric')" onkeydown="if(event.key==='Enter')SQ.router.navigate('domain/anthropometric')">
      ${outline}
    </g>`;

    return `<g transform="${BODY_TRANSFORM}">
      ${anthro}
      ${lungs}
      ${brain}
      ${vessel}
      ${liver}
      ${kidneys}
      ${metabolic}
      ${heart}
      ${haemNode}
    </g>`;
  }

  const CANVAS_W = 980, CANVAS_H = 560;
  const COL_W = 290, COL_MARGIN = 16, CARD_H = 112, ROW_GAP = 26, ROW0_Y = 26;
  const LEFT_X = COL_MARGIN, RIGHT_X = CANVAS_W - COL_MARGIN - COL_W;
  const ROW_Y = [ROW0_Y, ROW0_Y + CARD_H + ROW_GAP, ROW0_Y + 2 * (CARD_H + ROW_GAP)];

  const LEFT_KEYS = ["cardiovascular", "liver", "renal"];
  const RIGHT_KEYS = ["haematology", "metabolic", "anthropometric"];

  function cardHtml(key, analysis, tone) {
    const d = SQ.DOMAINS[key];
    return `<div xmlns="http://www.w3.org/1999/xhtml" class="anatomy-card tone-${tone}" data-domain="${key}"
        onclick="SQ.router.navigate('domain/${key}')" tabindex="0" role="button"
        onkeydown="if(event.key==='Enter')SQ.router.navigate('domain/${key}')">
      <div class="anatomy-card-icon">${STATUS_ICON[key] || d.icon}</div>
      <div class="anatomy-card-body">
        <div class="anatomy-card-title">${U().esc(d.label)}</div>
        <div class="anatomy-card-status">${STATUS_LABEL[tone]}</div>
        <div class="anatomy-card-desc">${U().esc(domainSummary(key, analysis))}</div>
      </div>
      <div class="anatomy-card-chevron">›</div>
    </div>`;
  }

  function foreignCard(key, x, y, analysis, tone) {
    return `<foreignObject x="${x}" y="${y}" width="${COL_W}" height="${CARD_H}">${cardHtml(key, analysis, tone)}</foreignObject>`;
  }

  function leaderLine(key, cardX, cardY, fromRight, tone) {
    const anchor = toBoard(ANCHORS[key].x, ANCHORS[key].y);
    const startX = fromRight ? cardX : cardX + COL_W;
    return `<g class="anatomy-leader tone-${tone}" data-domain="${key}">
      <line x1="${startX}" y1="${cardY}" x2="${anchor.x}" y2="${anchor.y}" />
      <circle class="anatomy-leader-dot" cx="${startX}" cy="${cardY}" r="4" />
      <circle class="anatomy-leader-dot" cx="${anchor.x}" cy="${anchor.y}" r="4" />
    </g>`;
  }

  function legendStrip() {
    return `<div class="anatomy-legend-strip">
      <span class="anatomy-legend-chip"><span class="dot tone-good"></span>Stable</span>
      <span class="anatomy-legend-chip"><span class="dot tone-warn"></span>Monitor</span>
      <span class="anatomy-legend-chip"><span class="dot tone-bad"></span>Needs attention</span>
    </div>`;
  }

  function compactList(analysis) {
    return `<div class="anatomy-compact-list">${SQ.DOMAIN_ORDER.map((key) => {
      const tone = domainTone(key, analysis);
      return cardHtml(key, analysis, tone);
    }).join("")}</div>`;
  }

  function render(analysis) {
    const tones = {};
    SQ.DOMAIN_ORDER.forEach((key) => { tones[key] = domainTone(key, analysis); });

    const leftCards = LEFT_KEYS.map((key, i) => foreignCard(key, LEFT_X, ROW_Y[i], analysis, tones[key])).join("");
    const rightCards = RIGHT_KEYS.map((key, i) => foreignCard(key, RIGHT_X, ROW_Y[i], analysis, tones[key])).join("");
    const leftLines = LEFT_KEYS.map((key, i) => leaderLine(key, LEFT_X, ROW_Y[i] + CARD_H / 2, false, tones[key])).join("");
    const rightLines = RIGHT_KEYS.map((key, i) => leaderLine(key, RIGHT_X, ROW_Y[i] + CARD_H / 2, true, tones[key])).join("");

    return `<div class="anatomy-board">
      <div class="anatomy-board-head">
        <h3>Body &amp; Health Domains</h3>
        ${legendStrip()}
      </div>
      <svg class="anatomy-figure-wide" viewBox="0 0 ${CANVAS_W} ${CANVAS_H}" xmlns="http://www.w3.org/2000/svg">
        ${leftLines}${rightLines}
        ${bodyGroup(tones)}
        ${leftCards}${rightCards}
      </svg>
      ${compactList(analysis)}
      <div class="anatomy-caption">Hover a card or organ to see how they connect. Click either to open that domain's full report.</div>
    </div>`;
  }

  // Cross-highlight: hovering a card glows its matching organ/leader line
  // (and vice versa). Wired after each render since #root is replaced
  // wholesale by the router on every state change.
  function afterRender() {
    const root = document.getElementById("root");
    if (!root) return;
    const pairs = root.querySelectorAll("[data-domain]");
    pairs.forEach((el) => {
      const domain = el.getAttribute("data-domain");
      el.addEventListener("mouseenter", () => {
        root.querySelectorAll(`[data-domain="${domain}"]`).forEach((m) => m.classList.add("hovered"));
      });
      el.addEventListener("mouseleave", () => {
        root.querySelectorAll(`[data-domain="${domain}"]`).forEach((m) => m.classList.remove("hovered"));
      });
    });
  }

  SQ.ui.anatomy = { render, afterRender, domainTone, domainSummary };
})();
