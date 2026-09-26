/* SQUARE — Generic classify-by-range helper used by the illustrative domains.
 * Kept separate from the Cardiovascular engine deliberately: nothing in this
 * file encodes clinical knowledge of its own, it just reads the threshold
 * objects defined in data/labDictionary.js#simpleRanges and turns a value
 * into a band. This keeps the "never hard-code medical knowledge in the UI"
 * rule honest — thresholds live in one data file, not scattered in code.
 */
window.SQ = window.SQ || {};
SQ.engines = SQ.engines || {};

(function () {
  "use strict";

  // range shape (any subset of these keys): { low, normalLow, normalHigh, mildLow, mildHigh, severeLow, severeHigh, source }
  function classifyByRange(code, value) {
    const range = SQ.simpleRanges && SQ.simpleRanges[code];
    const meta = SQ.labDictionary && SQ.labDictionary[code];
    if (!range || value == null) return null;

    let band = "normal", tone = "good";
    if (range.severeLow != null && value <= range.severeLow) { band = "severe-low"; tone = "bad"; }
    else if (range.severeHigh != null && value >= range.severeHigh) { band = "severe-high"; tone = "bad"; }
    else if (range.mildLow != null && value <= range.mildLow) { band = "mild-low"; tone = "warn"; }
    else if (range.mildHigh != null && value >= range.mildHigh) { band = "mild-high"; tone = "warn"; }
    else if (range.normalLow != null && value < range.normalLow) { band = "below-range"; tone = "warn"; }
    else if (range.normalHigh != null && value > range.normalHigh) { band = "above-range"; tone = "warn"; }
    else { band = "normal"; tone = "good"; }

    return {
      code, value, band, tone,
      label: bandLabel(band),
      name: meta ? meta.name : code,
      unit: meta ? meta.unit : "",
      source: range.source || "Demo threshold — illustrative.",
      isIllustrative: true,
    };
  }

  function bandLabel(band) {
    switch (band) {
      case "severe-low": return "Markedly below range";
      case "severe-high": return "Markedly above range";
      case "mild-low": return "Below range";
      case "mild-high": return "Above range";
      case "below-range": return "Below range";
      case "above-range": return "Above range";
      default: return "Within range";
    }
  }

  SQ.engines.ruleEngine = { classifyByRange, bandLabel };
})();
