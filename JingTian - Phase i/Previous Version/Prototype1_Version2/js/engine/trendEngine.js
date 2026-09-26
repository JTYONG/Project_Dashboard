/* SQUARE — Longitudinal trend helpers (Screen 19/20): direction, delta, and
 * simple series shaping for the trend charts and the timeline component.
 */
window.SQ = window.SQ || {};
SQ.engines = SQ.engines || {};

(function () {
  "use strict";

  function direction(series) {
    if (!series || series.length < 2) return "flat";
    const first = numeric(series[0]);
    const last = numeric(series[series.length - 1]);
    if (last == null || first == null) return "flat";
    const delta = last - first;
    if (Math.abs(delta) < 0.01 * Math.max(1, Math.abs(first))) return "flat";
    return delta > 0 ? "up" : "down";
  }

  function numeric(point) {
    if (point == null) return null;
    if (typeof point.value === "number") return point.value;
    if (typeof point.sbp === "number") return point.sbp;
    return null;
  }

  function delta(series) {
    if (!series || series.length < 2) return 0;
    const a = numeric(series[0]);
    const b = numeric(series[series.length - 1]);
    if (a == null || b == null) return 0;
    return Math.round((b - a) * 100) / 100;
  }

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

  SQ.engines.trendEngine = { direction, delta, sparklinePoints, numeric };
})();
