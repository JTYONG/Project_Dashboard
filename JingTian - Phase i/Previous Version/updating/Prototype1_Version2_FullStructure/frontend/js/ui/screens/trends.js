/* EVA SQUARE — Screen 17: Trends (Longitudinal Management). Ported from
 * frontend-v2's ui/screens/trends.js, reading from the backend's
 * GET /api/reports/:id/trends (direction/delta computed server-side by
 * backend/app/engines/trend_engine.py — see js/store.js#ensureTrends).
 *
 * Requirement #4: clicking a quantity's card now opens an enlarged,
 * interactive canvas chart (js/ui/trendChart.js) instead of just showing
 * the small sparkline — scroll to zoom, drag to pan, axis labels in Times
 * New Roman, line colour following the quantity's own risk level.
 */
window.SQ = window.SQ || {};
SQ.screens = SQ.screens || {};

(function () {
  "use strict";
  const U = () => SQ.ui;

  function numeric(p) { return typeof p.value === "number" ? p.value : (typeof p.sbp === "number" ? p.sbp : null); }
  function sparklinePoints(series, width, height) {
    if (!series || !series.length) return "";
    const values = series.map(numeric).filter((v) => v != null);
    const min = Math.min(...values), max = Math.max(...values);
    const span = max - min || 1;
    return series.map((p, i) => {
      const v = numeric(p);
      const x = (i / Math.max(1, series.length - 1)) * width;
      const y = height - ((v - min) / span) * height;
      return x.toFixed(1) + "," + y.toFixed(1);
    }).join(" ");
  }
  function sparkline(series, color) {
    const pts = sparklinePoints(series, 220, 60);
    return `<svg viewBox="0 0 220 60" width="220" height="60" class="mini-chart"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  function unitFor(key) {
    if (key === "homeBP") return "mmHg";
    if (key === "weight") return "kg";
    return (SQ.labDictionary && SQ.labDictionary[key]) ? SQ.labDictionary[key].unit : "";
  }

  function render() {
    if (!SQ.store.state.activeReportId) return U().emptyState("No trend history yet — trends build up as you add more reports.");
    const report = SQ.store.getActiveReport();
    if (!report) return U().loadingState("Loading report…");
    const trends = SQ.store.getTrends(report.id);
    if (!trends) return U().loadingState("Loading trends…");
    if (!Object.keys(trends).length) return U().emptyState("No trend history yet — trends build up as you add more reports.");

    const cards = Object.keys(trends).map((key) => {
      const t = trends[key];
      const series = t.series;
      const dir = t.direction, delta = t.delta;
      const label = key === "homeBP" ? "Blood pressure" : key === "weight" ? "Weight (kg)" : (SQ.labDictionary[key] ? SQ.labDictionary[key].name : key);
      const arrow = dir === "up" ? "↑" : dir === "down" ? "↓" : "→";
      const tone = key === "homeBP" || key === "weight" ? (dir === "down" ? "good" : dir === "up" ? "warn" : "neutral") : "info";
      const last = series[series.length - 1];
      const lastVal = last.value != null ? last.value : (last.sbp + "/" + last.dbp);
      return `<div class="card trend-card" onclick="SQ.act.openTrendChart('${key}')" title="Click to explore as an interactive chart">
        <div class="card-row"><div><h4 style="font-size:.95rem;color:var(--navy)">${U().esc(label)}</h4>
        <p style="font-size:.82rem;color:var(--muted);margin-top:2px">Latest: ${lastVal} · ${series[series.length - 1].date}</p></div>
        ${U().pill(tone, arrow + " " + (delta > 0 ? "+" : "") + delta)}</div>
        <div style="margin-top:10px">${sparkline(series, "#0f8c7f")}</div>
      </div>`;
    }).join("");

    return `<div class="grid cols-2">${cards}</div>
    <div style="margin-top:18px">${U().callout("info", null, "Trends compare values across your uploaded reports over time. More reports make these lines more meaningful. Click any card to explore it as an interactive, zoomable chart.")}</div>`;
  }

  function afterRender() { /* click handling is wired inline via onclick — nothing to bind post-render */ }

  SQ.screens.trends = { render, afterRender, unitFor, sparkline };
})();
