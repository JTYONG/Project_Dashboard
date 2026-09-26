# Baseline Findings — Phase 1 Demo

Run: 2026-09-01 · `node Security/tools/dom-sink-scan.js "Phase i/demo"`
Raw output: `evidence/2026-09-01-sast/dom-sinks.txt`

Scope was the client-side demo only — there is no backend yet, so the whole
class of authorisation and storage risk in the threat model is untested by
construction. Nothing below is exploitable by a remote attacker today,
because every input in the demo is either a number or comes from the lab
dictionary the app controls. All of it becomes exploitable at the moment
Module 5 (upload/OCR) starts producing text.

That is the useful framing: these are **latent** findings with a known
trigger date, and the cheapest time to fix them is before that date.

---

## MHR-001 — Report renderer builds HTML by string concatenation
**Severity:** Medium now · **High** once OCR or any free text lands
**Modules:** 19 (Report Generation), 5–9 (ingest → structured results)
**Where:** `Phase i/demo/js/app.js:133, 195, 216, 230, 238, 259, 267, 272`

The report is assembled as a string (`html += "<div…" + value + …`) and
assigned with `root.innerHTML = html`. There is no escaping helper anywhere
in the codebase — `grep -rn "escape" js/` returns nothing — so there is no
safe-by-default path for a developer to use. Values already flowing through
it include `d.domain`, `f.name`, `r.followUp` and `report.userId`.

Today `f.name` comes from `labDictionary.js`, so it is trusted. Tomorrow it
comes from a PDF someone uploaded.

**Impact when triggered:** stored XSS in an application holding health data —
session theft, silent alteration of a displayed clinical result, or
exfiltration of the report the user is looking at.

**Fix:** add one `escapeHtml()` in `js/engine/helper.js`, apply it to every
interpolation in `app.js`, or switch the renderer to `textContent`/node
construction. Regression test: `Security/tools/xss-probe.js`.

---

## MHR-002 — No Content-Security-Policy
**Severity:** Medium · **Modules:** 1, 19 · **Where:** `Phase i/demo/index.html`

No CSP meta tag. A CSP is the cheapest mitigation for MHR-001 and for any
third-party script that is added later.

**Fix now (demo):**
```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self'; style-src 'self';
               img-src 'self' data:; object-src 'none'; base-uri 'none';
               form-action 'self'; frame-ancestors 'none'">
```
Move it to a response header when a server exists, and keep `'unsafe-inline'`
out of `script-src`.

---

## MHR-003 — USER_ID generated with `Math.random()`
**Severity:** Low now · **High if it survives into the real system**
**Module:** 1 (User Access) · **Where:** `Phase i/demo/js/app.js:23`

```js
userId: "DEMO-" + Math.random().toString(36).slice(2, 8).toUpperCase()
```

`Math.random()` is not cryptographically random, and 6 base-36 characters is
a small space. The architecture makes USER_ID the join key for everything,
so if this pattern is copied into the real implementation — or into report
IDs and download links — records become enumerable.

**Fix:** `crypto.randomUUID()`. Add a comment at the call site saying the demo
value is not an identifier scheme, so it does not get promoted by accident.

---

## MHR-004 — Path traversal in the local test server
**Severity:** Low (test-only, never shipped) · **Where:** `Phase i/demo/test/smoke.js:21`

```js
let filePath = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]));
```

`GET /../../../etc/passwd` escapes `ROOT`. It only ever binds to localhost
during a test run, so the practical risk is near zero — it is listed because
the same three lines get copied into real file-serving code, and because it
is a one-line fix.

**Fix:** `path.resolve()` then reject anything that does not start with
`ROOT`. `Security/tools/xss-probe.js` contains the corrected version.

---

## Confirmed good (keep it this way)

- **No browser storage of patient data.** No `localStorage`, `sessionStorage`
  or `indexedDB` anywhere. For a health app this is the right default and it
  should be a deliberate, documented decision rather than an accident of the
  prototype.
- **No `eval`, no `new Function`, no dynamic script loading.**
- **No network calls at all** — nothing leaves the browser, which is what the
  demo README claims. Verified.
- **Raw values and derived classifications are already stored separately**,
  and rule versions are recorded on the report. That is the foundation the
  integrity controls in the threat model (R7) will build on.

---

## Priority

1. **MHR-001 + MHR-002 before Module 5 ships.** Fixing the renderer while it
   has six interpolation points costs an hour; after the OCR path exists it
   is an audit.
2. **MHR-003 before the real USER_ID scheme is written.**
3. **MHR-004 whenever the file is next touched.**
4. Then the untested half: stand up staging, and work
   `checklists/authz-and-business-logic.md` section A — object-level
   authorisation is risk R1 and nothing in this baseline touched it.
