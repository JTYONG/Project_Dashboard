/* EVA SQUARE — Screen 7: Upload a Report (Data Acquisition & Processing,
 * step 1). Ported unchanged from frontend-v2 — the upload flow itself
 * (drag/drop → sample-matched extraction, since there's no live OCR in
 * this basis version either) is identical; only SQ.act.handleFileUpload /
 * startSampleUpload now call the backend (see js/app.js).
 */
window.SQ = window.SQ || {};
SQ.screens = SQ.screens || {};

(function () {
  "use strict";
  const U = () => SQ.ui;

  function render() {
    return `
    ${U().stepper(["Upload", "Verify", "Answer", "Analyse"], 0)}
    ${U().card(`
      <div class="dropzone">
        <div class="dz-icon">📄</div>
        <h3>Drag &amp; drop your blood report</h3>
        <div class="meta">PDF, JPG or PNG — up to 10MB. Your file is processed securely.</div>
        <div class="dz-actions">
          <label class="btn primary" for="file-input" style="cursor:pointer">Choose a file</label>
          <input type="file" id="file-input" style="display:none" onchange="SQ.act.handleFileUpload(event)" accept=".pdf,.jpg,.jpeg,.png">
          ${U().btn("Use a routine sample instead", { variant: "outline", onclick: "SQ.act.startSampleUpload('routine')" })}
          ${U().btn("Use an urgent-pathway sample", { variant: "outline", onclick: "SQ.act.startSampleUpload('urgent')" })}
        </div>
      </div>
    `)}
    <div style="margin-top:18px">
      ${U().callout("info", "This prototype simulates OCR", "Choosing any file loads a realistic sample lab report so you can see the full extraction → verification → questionnaire → analysis flow.")}
    </div>
    `;
  }

  SQ.screens.upload = { render };
})();
