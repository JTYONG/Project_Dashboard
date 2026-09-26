/* EVA SQUARE — Trends "click to enlarge" interactive chart (Requirement #4).
 *
 * New for this FullStructure build. Clicking a quantity on the Trends
 * screen opens this modal: a canvas line chart the user can zoom (mouse
 * wheel / pinch) and pan (drag), with:
 *   - axis labels set in Times New Roman directly via canvas ctx.font
 *     (a CSS font-family can't reach canvas-drawn text, so this is done
 *     in JS, not style.css);
 *   - the plotted line coloured by the risk level of the quantity itself,
 *     as a smooth gradient built from the same tone vocabulary as the
 *     reference-scale bands (see js/ui/scaleRow.js / GET
 *     /api/meta/reference-scales) — canvas linear gradients interpolate
 *     between colour stops automatically, which gives the "smooth colour
 *     change" the spec asks for without hand-rolled interpolation;
 *   - a colour-scale bar to the right of the chart describing the same
 *     reference bands verbally (High/Normal/Low-style labels), a line
 *     legend, a recorded-values table (replacing an earlier fitted-line
 *     formula readout), and an "expected normal range" note built from
 *     the same reference-scale data used everywhere else in the app.
 * X axis = date, Y axis = the quantity's value, per spec.
 */
window.SQ = window.SQ || {};
SQ.ui = SQ.ui || {};

(function () {
  "use strict";
  const U = () => SQ.ui;

  function cssVar(name, fallback) {
    try {
      const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    } catch (e) { return fallback; }
  }

  function toneColor(tone) {
    if (tone === "good") return cssVar("--good", "#2f9e44");
    if (tone === "warn") return cssVar("--warn", "#b5650a");
    if (tone === "bad") return cssVar("--bad", "#c0392b");
    return cssVar("--teal", "#0f8c7f");
  }

  function toneForValue(scaleKey, value) {
    const scale = scaleKey && SQ.referenceScales ? SQ.referenceScales[scaleKey] : null;
    if (!scale || value == null) return "neutral";
    const band = (scale.bands || []).find((b) => value >= b.from && value <= b.to);
    return band ? band.tone : "neutral";
  }

  // Builds { lines: [{name, scaleKey, points:[{x:index, date, value}]}] }
  // from a /api/reports/:id/trends series for one key.
  function buildLines(key, seriesEntry) {
    const series = seriesEntry.series || [];
    if (key === "homeBP") {
      return [
        { name: "Systolic", scaleKey: "BP_SYSTOLIC", points: series.map((p, i) => ({ x: i, date: p.date, value: p.sbp })) },
        { name: "Diastolic", scaleKey: "BP_DIASTOLIC", points: series.map((p, i) => ({ x: i, date: p.date, value: p.dbp })) },
      ];
    }
    const scaleKey = SQ.labDictionary && SQ.labDictionary[key] ? key : null;
    const label = key === "weight" ? "Weight (kg)" : (SQ.labDictionary && SQ.labDictionary[key] ? SQ.labDictionary[key].name : key);
    return [{ name: label, scaleKey, points: series.map((p, i) => ({ x: i, date: p.date, value: p.value })) }];
  }

  // ---- modal state ----
  let view = null; // { xMin, xMax, yMin, yMax }
  let dragging = null; // { startX, startY, view0 }
  let currentLines = null;
  let currentUnit = "";

  function dataBounds(lines) {
    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
    lines.forEach((line) => line.points.forEach((p) => {
      if (p.value == null) return;
      xMin = Math.min(xMin, p.x); xMax = Math.max(xMax, p.x);
      yMin = Math.min(yMin, p.value); yMax = Math.max(yMax, p.value);
    }));
    if (!isFinite(xMin)) { xMin = 0; xMax = 1; }
    if (!isFinite(yMin)) { yMin = 0; yMax = 1; }
    if (xMin === xMax) { xMin -= 1; xMax += 1; }
    const pad = (yMax - yMin) * 0.15 || 1;
    return { xMin: xMin - 0.5, xMax: xMax + 0.5, yMin: yMin - pad, yMax: yMax + pad };
  }

  function draw() {
    const canvas = document.getElementById("trend-canvas");
    if (!canvas || !currentLines || !view) return;
    const wrap = canvas.parentElement;
    const cssW = wrap.clientWidth, cssH = 460;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = cssW * dpr; canvas.height = cssH * dpr;
    canvas.style.width = cssW + "px"; canvas.style.height = cssH + "px";
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const padL = 58, padR = 18, padT = 18, padB = 40;
    const plotW = cssW - padL - padR, plotH = cssH - padT - padB;

    function xPix(x) { return padL + ((x - view.xMin) / (view.xMax - view.xMin)) * plotW; }
    function yPix(y) { return padT + plotH - ((y - view.yMin) / (view.yMax - view.yMin)) * plotH; }

    // gridlines + axis labels (Times New Roman, set directly on canvas —
    // this is the one place a font-family has to be applied in JS rather
    // than CSS, since canvas text ignores stylesheet fonts).
    ctx.strokeStyle = "#e3e7ef"; ctx.lineWidth = 1;
    ctx.fillStyle = "#64748b";
    ctx.font = "12px 'Times New Roman', Times, serif";
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    const yTicks = 5;
    for (let i = 0; i <= yTicks; i++) {
      const y = view.yMin + (i / yTicks) * (view.yMax - view.yMin);
      const py = yPix(y);
      ctx.beginPath(); ctx.moveTo(padL, py); ctx.lineTo(cssW - padR, py); ctx.stroke();
      ctx.fillText(Math.round(y * 100) / 100 + (currentUnit ? " " + currentUnit : ""), padL - 8, py);
    }

    // x labels: pick evenly spaced visible points
    const allDates = [];
    currentLines[0].points.forEach((p) => { allDates[p.x] = p.date; });
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    const visibleFrom = Math.max(0, Math.floor(view.xMin)), visibleTo = Math.min(allDates.length - 1, Math.ceil(view.xMax));
    const span = Math.max(1, visibleTo - visibleFrom);
    const step = Math.max(1, Math.round(span / 6));
    for (let i = visibleFrom; i <= visibleTo; i += step) {
      if (allDates[i] == null) continue;
      ctx.fillText(allDates[i], xPix(i), cssH - padB + 8);
    }

    // axis lines
    ctx.strokeStyle = "#b9c2d0"; ctx.beginPath();
    ctx.moveTo(padL, padT); ctx.lineTo(padL, cssH - padB); ctx.lineTo(cssW - padR, cssH - padB); ctx.stroke();

    // clip to plot area so pan/zoom doesn't paint over axes
    ctx.save();
    ctx.beginPath(); ctx.rect(padL, padT, plotW, plotH); ctx.clip();

    currentLines.forEach((line, li) => {
      const pts = line.points.filter((p) => p.value != null);
      if (pts.length < 1) return;
      // gradient built from each point's risk tone — canvas interpolates
      // smoothly between the colour stops we add here.
      const grad = ctx.createLinearGradient(xPix(pts[0].x), 0, xPix(pts[pts.length - 1].x), 0);
      const denom = Math.max(1, pts.length - 1);
      pts.forEach((p, i) => {
        const tone = toneForValue(line.scaleKey, p.value);
        const stop = Math.min(1, Math.max(0, i / denom));
        try { grad.addColorStop(stop, toneColor(tone)); } catch (e) { /* out-of-range stop guard */ }
      });
      ctx.strokeStyle = pts.length > 1 ? grad : toneColor(toneForValue(line.scaleKey, pts[0].value));
      ctx.lineWidth = li === 0 ? 3 : 2;
      ctx.setLineDash(li === 0 ? [] : [6, 4]);
      ctx.beginPath();
      pts.forEach((p, i) => { const x = xPix(p.x), y = yPix(p.value); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
      ctx.stroke();
      ctx.setLineDash([]);
      pts.forEach((p) => {
        const tone = toneForValue(line.scaleKey, p.value);
        ctx.fillStyle = toneColor(tone);
        ctx.beginPath(); ctx.arc(xPix(p.x), yPix(p.value), li === 0 ? 4 : 3, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.4; ctx.stroke();
      });
    });
    ctx.restore();
  }

  function clampView(v, bounds) {
    const minSpanX = (bounds.xMax - bounds.xMin) * 0.05;
    const maxSpanX = (bounds.xMax - bounds.xMin) * 3;
    let spanX = v.xMax - v.xMin;
    spanX = Math.max(minSpanX, Math.min(maxSpanX, spanX));
    let cx = (v.xMin + v.xMax) / 2;
    v.xMin = cx - spanX / 2; v.xMax = cx + spanX / 2;
    const minSpanY = (bounds.yMax - bounds.yMin) * 0.05;
    const maxSpanY = (bounds.yMax - bounds.yMin) * 3;
    let spanY = v.yMax - v.yMin;
    spanY = Math.max(minSpanY, Math.min(maxSpanY, spanY));
    let cy = (v.yMin + v.yMax) / 2;
    v.yMin = cy - spanY / 2; v.yMax = cy + spanY / 2;
    return v;
  }

  function wireInteractions(bounds) {
    const wrap = document.getElementById("trend-canvas-wrap");
    const canvas = document.getElementById("trend-canvas");
    if (!wrap || !canvas) return;

    wrap.addEventListener("wheel", (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const padL = 58, padR = 18, padT = 18, padB = 40;
      const plotW = rect.width - padL - padR, plotH = rect.height - padT - padB;
      const dataX = view.xMin + ((mx - padL) / plotW) * (view.xMax - view.xMin);
      const dataY = view.yMax - ((my - padT) / plotH) * (view.yMax - view.yMin);
      const factor = e.deltaY > 0 ? 1.12 : 0.89;
      view.xMin = dataX - (dataX - view.xMin) * factor;
      view.xMax = dataX + (view.xMax - dataX) * factor;
      view.yMin = dataY - (dataY - view.yMin) * factor;
      view.yMax = dataY + (view.yMax - dataY) * factor;
      clampView(view, bounds);
      draw();
    }, { passive: false });

    wrap.addEventListener("mousedown", (e) => {
      dragging = { startX: e.clientX, startY: e.clientY, view0: Object.assign({}, view) };
    });
    window.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      const rect = canvas.getBoundingClientRect();
      const padL = 58, padR = 18, padT = 18, padB = 40;
      const plotW = rect.width - padL - padR, plotH = rect.height - padT - padB;
      const dx = (e.clientX - dragging.startX) / plotW * (dragging.view0.xMax - dragging.view0.xMin);
      const dy = (e.clientY - dragging.startY) / plotH * (dragging.view0.yMax - dragging.view0.yMin);
      view.xMin = dragging.view0.xMin - dx; view.xMax = dragging.view0.xMax - dx;
      view.yMin = dragging.view0.yMin + dy; view.yMax = dragging.view0.yMax + dy;
      draw();
    });
    window.addEventListener("mouseup", () => { dragging = null; });

    // touch support (pinch not implemented; single-finger drag pans)
    let touchStart = null;
    wrap.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1) touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY, view0: Object.assign({}, view) };
    }, { passive: true });
    wrap.addEventListener("touchmove", (e) => {
      if (!touchStart || e.touches.length !== 1) return;
      const rect = canvas.getBoundingClientRect();
      const padL = 58, padR = 18, padT = 18, padB = 40;
      const plotW = rect.width - padL - padR, plotH = rect.height - padT - padB;
      const dx = (e.touches[0].clientX - touchStart.x) / plotW * (touchStart.view0.xMax - touchStart.view0.xMin);
      const dy = (e.touches[0].clientY - touchStart.y) / plotH * (touchStart.view0.yMax - touchStart.view0.yMin);
      view.xMin = touchStart.view0.xMin - dx; view.xMax = touchStart.view0.xMax - dx;
      view.yMin = touchStart.view0.yMin + dy; view.yMax = touchStart.view0.yMax + dy;
      draw();
    }, { passive: true });
    wrap.addEventListener("touchend", () => { touchStart = null; });

    window.addEventListener("resize", draw);
  }

  // ---- line legend: which line is which, since colour alone now only
  // encodes risk level, not line identity (dashed vs solid does that). ----
  function lineLegendHtml(lines) {
    return `<div class="trend-legend">${lines.map((l, i) =>
      `<span class="trend-legend-item"><span class="trend-legend-swatch ${i === 0 ? "solid" : "dashed"}"></span>${U().esc(l.name)}</span>`
    ).join("")}</div>`;
  }

  // ---- vertical colour-scale bar: a verbal description of the same
  // reference bands the line's own colour is drawn from (requirement:
  // "add the color bar with a scale description, like high, low, normal"
  // — reuses GET /api/meta/reference-scales, the same data source as the
  // expandable scale rows in js/ui/scaleRow.js). ----
  function colorScaleBarHtml(scaleKey) {
    const scale = scaleKey && SQ.referenceScales ? SQ.referenceScales[scaleKey] : null;
    if (!scale) {
      return `<div class="trend-scale-empty">No reference scale is available for this quantity yet.</div>`;
    }
    const range = scale.max - scale.min;
    // High-to-low order so the strip reads top (high) to bottom (low).
    const ordered = (scale.bands || []).slice().sort((a, b) => b.from - a.from);
    const segments = ordered.map((b) => {
      const from = Math.max(b.from, scale.min), to = Math.min(b.to, scale.max);
      const heightPct = Math.max(0, ((to - from) / range) * 100);
      return `<div class="scale-band ${b.tone}" style="height:${heightPct}%" title="${U().esc(b.label)}: ${from}–${to}${scale.unit ? " " + U().esc(scale.unit) : ""}"></div>`;
    }).join("");
    const legend = ordered.map((b) =>
      `<div class="trend-scale-legend-row"><span class="scale-legend-swatch" style="background:var(--${b.tone})"></span>${U().esc(b.label)} <span class="range">${b.from}–${b.to}${scale.unit ? " " + U().esc(scale.unit) : ""}</span></div>`
    ).join("");
    return `<div class="trend-scale-wrap">
      <div class="trend-scale-axis"><span>${scale.max}${scale.unit ? " " + U().esc(scale.unit) : ""}</span><span>${scale.min}${scale.unit ? " " + U().esc(scale.unit) : ""}</span></div>
      <div class="trend-scale-strip">${segments}</div>
      <div class="trend-scale-legend">${legend}</div>
    </div>`;
  }

  // ---- recorded-values table: replaces the earlier fitted-line formula
  // readout with the actual date/value pairs behind the chart (one column
  // per line — e.g. Systolic + Diastolic for blood pressure). ----
  function valueTableHtml(lines, unit) {
    const maxLen = Math.max(0, ...lines.map((l) => l.points.length));
    let rows = "";
    for (let i = 0; i < maxLen; i++) {
      const date = (lines[0].points[i] && lines[0].points[i].date) || "—";
      const cells = lines.map((l) => {
        const p = l.points[i];
        const v = p && p.value != null ? Math.round(p.value * 100) / 100 : "—";
        return `<td>${v}</td>`;
      }).join("");
      rows += `<tr><td>${U().esc(date)}</td>${cells}</tr>`;
    }
    const headers = lines.map((l) => `<th>${U().esc(l.name)}${unit ? ` (${U().esc(unit)})` : ""}</th>`).join("");
    return `<div class="trend-table-wrap"><table class="data-table"><thead><tr><th>Date</th>${headers}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  // ---- expected normal range: the "good" band(s) of each line's own
  // reference scale, verbalised. Deliberately does not fabricate an
  // age/weight-adjusted range no engine in this codebase computes — see
  // backend/app/data/reference_scales.py, which documents exactly which
  // bands are real-spec vs. illustrative population bands. ----
  function normalRangeHtml(lines) {
    const parts = lines.map((line) => {
      const scale = line.scaleKey && SQ.referenceScales ? SQ.referenceScales[line.scaleKey] : null;
      const goodBands = scale ? (scale.bands || []).filter((b) => b.tone === "good") : [];
      if (!goodBands.length) return null;
      const lo = Math.min(...goodBands.map((b) => b.from));
      const hi = Math.max(...goodBands.map((b) => b.to));
      return `<strong>${U().esc(line.name)}:</strong> ${lo}–${hi}${scale.unit ? " " + U().esc(scale.unit) : ""}`;
    }).filter(Boolean);
    if (!parts.length) {
      return U().callout("info", "Expected normal range", "No population reference range is defined for this quantity in this prototype yet.");
    }
    return U().callout("info", "Expected normal range for you", parts.join("<br>") +
      `<div style="margin-top:6px;font-size:.76rem;color:var(--muted-2)">General population reference band from the quantity's own clinical source — not further adjusted for age beyond what that source already accounts for.</div>`);
  }

  function open(key, seriesEntry, unit) {
    currentLines = buildLines(key, seriesEntry);
    currentUnit = unit || "";
    const bounds = dataBounds(currentLines);
    view = Object.assign({}, bounds);

    const label = key === "homeBP" ? "Blood pressure" : key === "weight" ? "Weight" : (SQ.labDictionary && SQ.labDictionary[key] ? SQ.labDictionary[key].name : key);
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "trend-modal-overlay";
    overlay.innerHTML = `<div class="trend-modal">
      <div class="trend-modal-head">
        <div><h3>${U().esc(label)}</h3><div class="sub">Horizontal axis: date &nbsp;·&nbsp; Vertical axis: ${U().esc(label)}${unit ? " (" + U().esc(unit) + ")" : ""}. Line colour follows risk level.</div></div>
        <button type="button" class="trend-modal-close" onclick="SQ.ui.trendModal.close()">✕</button>
      </div>
      <div class="trend-modal-body">
        ${lineLegendHtml(currentLines)}
        <div class="trend-chart-row">
          <div class="trend-canvas-wrap" id="trend-canvas-wrap"><canvas id="trend-canvas"></canvas></div>
          <div class="trend-scale-col">${colorScaleBarHtml(currentLines[0].scaleKey)}</div>
        </div>
        <div class="trend-modal-controls">
          <span class="trend-modal-hint">Scroll to zoom · drag to pan</span>
          <button type="button" class="btn outline sm" onclick="SQ.ui.trendModal.reset()">Reset view</button>
        </div>
        ${normalRangeHtml(currentLines)}
        <div class="section-title" style="margin-top:18px;font-size:.95rem">Recorded values</div>
        ${valueTableHtml(currentLines, unit)}
      </div>
    </div>`;
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    document.body.appendChild(overlay);

    requestAnimationFrame(() => { draw(); wireInteractions(bounds); });
    this._bounds = bounds;
    SQ.ui.trendModal._bounds = bounds;
  }

  function reset() {
    if (SQ.ui.trendModal._bounds) { view = Object.assign({}, SQ.ui.trendModal._bounds); draw(); }
  }

  function close() {
    const el = document.getElementById("trend-modal-overlay");
    if (el) el.remove();
    currentLines = null; view = null; dragging = null;
  }

  SQ.ui.trendModal = { open, close, reset };
})();
