/* SQUARE — Screen 19: Blood Reports library. */
window.SQ = window.SQ || {};
SQ.screens = SQ.screens || {};

(function () {
  "use strict";
  const U = () => SQ.ui;

  function render() {
    const library = SQ.store.state.library;
    if (!library.length) return `${U().emptyState("No reports uploaded yet.")}<div style="text-align:center">${U().btn("Upload a report", { href: "upload" })}</div>`;

    const rows = library.map((r) => `
      <tr>
        <td><strong>${U().esc(r.fileName)}</strong><div style="color:var(--muted);font-size:.78rem">${U().esc(r.lab)}</div></td>
        <td>${U().esc(r.reportDate)}</td>
        <td>${U().pill(r.status === "verified" ? "good" : "warn", r.status === "verified" ? "Verified" : "Pending verify")}</td>
        <td>${r.id === SQ.store.state.activeReportId ? U().pill("teal", "Active") : ""}</td>
        <td style="display:flex;gap:8px">
          ${U().btn("View", { sm: true, variant: "outline", onclick: `SQ.act.openReport('${r.id}')` })}
        </td>
      </tr>`).join("");

    return `
    <div class="actions-row">${U().btn("Upload new report", { href: "upload" })}</div>
    ${U().card(`<table class="data-table"><thead><tr><th>Report</th><th>Date</th><th>Status</th><th></th><th></th></tr></thead><tbody>${rows}</tbody></table>`)}
    `;
  }

  SQ.screens.reportsLibrary = { render };
})();
