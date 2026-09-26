/* EVA SQUARE — Appointments. New sidebar section (and the Dashboard's
 * "Book Consultation" quick action) for requesting a follow-up with a
 * healthcare professional.
 *
 * There is no scheduling backend in this basis version — no
 * app/routers/appointments.py, no `appointments` table — so requests are
 * kept in a small in-memory list local to this module (reset on reload)
 * rather than invented server-side state. The screen says so plainly
 * rather than pretending a request has actually been sent anywhere, the
 * same honesty convention the rest of the app follows for its other
 * "basis version" simplifications (see backend/app/routers/reports.py's
 * OCR note, or backend/app/security.py's auth note).
 */
window.SQ = window.SQ || {};
SQ.screens = SQ.screens || {};

(function () {
  "use strict";
  const U = () => SQ.ui;

  const REASONS = [
    "General check-in",
    "Discuss cardiovascular results",
    "Discuss action plan",
    "Something else",
  ];

  let requests = [];
  let nextId = 1;

  function submit(event) {
    event.preventDefault();
    const reason = document.getElementById("appt-reason").value;
    const date = document.getElementById("appt-date").value;
    const notes = document.getElementById("appt-notes").value.trim();
    if (!date) { U().toast("Please choose a preferred date.", "bad"); return; }
    requests.unshift({ id: nextId++, reason, date, notes, status: "Requested" });
    U().toast("Request noted — this prototype doesn't connect to a real scheduling system yet, so a clinic won't see this.", "info");
    SQ.router.render();
  }

  function cancel(id) {
    requests = requests.filter((r) => r.id !== id);
    SQ.router.render();
  }

  function requestRow(r) {
    return U().card(`
      <div class="card-row">
        <div>
          <h4 style="font-size:.95rem;color:var(--navy)">${U().esc(r.reason)}</h4>
          <p style="color:var(--muted);font-size:.84rem;margin-top:4px">Preferred date: ${U().esc(r.date)}${r.notes ? " · " + U().esc(r.notes) : ""}</p>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          ${U().pill("warn", r.status)}
          ${U().btn("Cancel", { sm: true, variant: "outline", onclick: `SQ.screens.appointments.cancel(${r.id})` })}
        </div>
      </div>
    `);
  }

  function render() {
    const options = REASONS.map((r) => `<option value="${U().esc(r)}">${U().esc(r)}</option>`).join("");
    return `
    ${U().callout("info", null, "This prototype doesn't yet connect to a real clinic scheduling system — requests below are kept only in this browser tab for demonstration.")}
    <div style="height:16px"></div>
    <div class="grid cols-2" style="align-items:start">
      ${U().card(`
        <h3 style="font-size:1.05rem">Book a consultation</h3>
        <p style="color:var(--muted);font-size:.86rem;margin:6px 0 14px">Request a follow-up with a healthcare professional to discuss your results.</p>
        <form onsubmit="SQ.screens.appointments.submit(event)">
          <div class="field"><label>Reason for visit</label>
            <select id="appt-reason">${options}</select>
          </div>
          <div class="field"><label>Preferred date</label>
            <input type="date" id="appt-date" required>
          </div>
          <div class="field"><label>Notes (optional)</label>
            <input type="text" id="appt-notes" placeholder="Anything you'd like the clinician to know">
          </div>
          ${U().btn("Request appointment", { block: true, type: "submit" })}
        </form>
      `)}
      ${U().card(`
        <h3 style="font-size:1.05rem">In an emergency</h3>
        <p style="color:var(--muted);font-size:.86rem;margin:6px 0 14px">Do not use this form for urgent symptoms.</p>
        ${U().callout("bad", "Emergency warning", "If you may have a medical emergency, call 999 or go to the nearest emergency department immediately.")}
        <div style="margin-top:14px">${U().btn("View referral guidance", { href: "referral", variant: "outline" })}</div>
      `)}
    </div>
    <div class="section-title">Your requests</div>
    ${requests.length ? `<div class="stack">${requests.map(requestRow).join("")}</div>` : U().emptyState("No appointment requests yet.")}
    `;
  }

  SQ.screens.appointments = { render, submit, cancel };
})();
