/* EVA SQUARE — Expandable reference-scale rows (Requirement #2).
 *
 * New for this FullStructure build. Every quantity row in a domain's
 * Results tab (and the single-marker Result Detail screen) gets a small
 * chevron button; clicking it expands a hidden row beneath showing the
 * *whole* reference scale for that quantity as a coloured horizontal bar
 * (green/amber/red bands = good/warn/bad, matching the tone vocabulary
 * used everywhere else), with the patient's current value marked on it.
 *
 * Scale data comes from GET /api/meta/reference-scales (bound to
 * SQ.referenceScales at boot — see backend/app/data/reference_scales.py
 * for how each band was derived, and its honesty notes about which
 * quantities have a real clinical source vs. an illustrative one).
 */
window.SQ = window.SQ || {};
SQ.ui = SQ.ui || {};

(function () {
  "use strict";
  const U = () => SQ.ui;

  function pctOf(value, min, max) {
    if (value == null || !isFinite(value)) return null;
    const clamped = Math.max(min, Math.min(max, value));
    return ((clamped - min) / (max - min)) * 100;
  }

  // The clickable chevron cell — place this as the last <td> in a results row.
  function toggleCell(id) {
    return `<td style="width:36px;text-align:center"><button type="button" class="expand-toggle" id="scale-toggle-${id}" onclick="SQ.act.toggleScale('${id}')" aria-label="Show full reference scale" title="Show full reference scale">▾</button></td>`;
  }

  function panelInner(scaleKey, value) {
    const scale = scaleKey && SQ.referenceScales ? SQ.referenceScales[scaleKey] : null;
    if (!scale) {
      return `<span style="color:var(--muted);font-size:.82rem">No reference scale is available for this quantity yet.</span>`;
    }
    const range = scale.max - scale.min;
    const bands = (scale.bands || []).map((b) => {
      const from = Math.max(b.from, scale.min), to = Math.min(b.to, scale.max);
      const width = Math.max(0, ((to - from) / range) * 100);
      return `<div class="scale-band ${b.tone}" style="width:${width}%" title="${U().esc(b.label)}: ${from}–${to}${scale.unit ? " " + U().esc(scale.unit) : ""}"></div>`;
    }).join("");
    const markerPct = pctOf(value, scale.min, scale.max);
    const marker = markerPct != null
      ? `<div class="scale-marker" style="left:${markerPct}%" data-value="${U().esc(value)}${scale.unit ? " " + U().esc(scale.unit) : ""}"></div>` : "";
    const seenTones = [];
    const toneLabel = {};
    (scale.bands || []).forEach((b) => { if (!toneLabel[b.tone]) { toneLabel[b.tone] = b.label; seenTones.push(b.tone); } });
    const legend = seenTones.map((t) => `<span class="scale-legend-item"><span class="scale-legend-swatch" style="background:var(--${t})"></span>${U().esc(toneLabel[t])}</span>`).join("");

    return `<div class="scale-title">${U().esc(scale.name)} — full reference scale</div>
      <div class="scale-track">${bands}${marker}</div>
      <div class="scale-labels"><span>${scale.min}${scale.unit ? " " + U().esc(scale.unit) : ""}</span><span>${scale.max}${scale.unit ? " " + U().esc(scale.unit) : ""}</span></div>
      <div class="scale-legend">${legend}</div>
      <div class="scale-source">Source: ${U().esc(scale.source)}</div>`;
  }

  // The hidden <tr> to place immediately after the main row. `colspan`
  // should match the number of <td> columns (including the toggle cell)
  // in the table this row belongs to.
  function panelRow(id, scaleKey, value, colspan) {
    return `<tr class="scale-row" id="scale-row-${id}"><td colspan="${colspan}"><div class="scale-panel">${panelInner(scaleKey, value)}</div></td></tr>`;
  }

  // Non-table variant: an always-visible scale card, used on the
  // single-marker Result Detail screen (js/ui/screens/results.js).
  function standalone(scaleKey, value) {
    return `<div class="scale-panel" style="background:#fff;border:1px solid var(--border-2);border-radius:var(--radius-md)">${panelInner(scaleKey, value)}</div>`;
  }

  SQ.ui.scaleRow = { toggleCell, panelRow, standalone };
})();
