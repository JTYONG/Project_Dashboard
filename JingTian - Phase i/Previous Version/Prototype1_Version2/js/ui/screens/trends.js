/* SQUARE — Screen 17: Trends (Longitudinal Management). */
window.SQ = window.SQ || {};
SQ.screens = SQ.screens || {};

(function () {
  "use strict";
  const U = () => SQ.ui;

  function sparkline(series, color) {
    const pts = SQ.engines.trendEngine.sparklinePoints(series, 220, 60);
    return `<svg viewBox="0 0 220 60" width="220" height="60" class="mini-chart"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  function render() {
    const report = SQ.store.getActiveReport();
    if (!report || !report.trendHistory) return U().emptyState("No trend history yet — trends build up as you add more reports.");
    const th = report.trendHistory;

    const cards = Object.keys(th).map((key) => {
      const series = th[key];
      const dir = SQ.engines.trendEngine.direction(series);
      const delta = SQ.engines.trendEngine.delta(series);
      const label = key === "homeBP" ? "Blood pressure" : key === "weight" ? "Weight (kg)" : (SQ.labDictionary[key] ? SQ.labDictionary[key].name : key);
      const arrow = dir === "up" ? "↑" : dir === "down" ? "↓" : "→";
      const tone = key === "homeBP" || key === "weight" ? (dir === "down" ? "good" : dir === "up" ? "warn" : "neutral") : "info";
      const last = series[series.length - 1];
      const lastVal = last.value != null ? last.value : (last.sbp + "/" + last.dbp);
      return U().card(`
        <div class="card-row"><div><h4 style="font-size:.95rem;color:var(--navy)">${U().esc(label)}</h4>
        <p style="font-size:.82rem;color:var(--muted);margin-top:2px">Latest: ${lastVal} · ${series[series.length - 1].date}</p></div>
        ${U().pill(tone, arrow + " " + (delta > 0 ? "+" : "") + delta)}</div>
        <div style="margin-top:10px">${sparkline(series, "#0f8c7f")}</div>
      `);
    }).join("");

    return `<div class="grid cols-2">${cards}</div>
    <div style="margin-top:18px">${U().callout("info", null, "Trends compare values across your uploaded reports over time. More reports make these lines more meaningful.")}</div>`;
  }

  SQ.screens.trends = { render };
})();
