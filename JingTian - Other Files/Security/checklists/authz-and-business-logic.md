# Checklist — Authorisation & Business Logic

The tests no scanner will run for you. These are the ones that actually
breach a health platform. Work through them by hand, or hand this file to an
agent as its task list (see `../agent/RUNBOOK.md`).

Set up two synthetic accounts before starting: **Alice** and **Mallory**,
each with at least one uploaded report and one generated report.

## A. Object-level authorisation (R1 — highest risk)

- [ ] As Mallory, request Alice's report by ID. Try sequential, decremented,
      and UUID-guessed IDs.
- [ ] Same for: uploaded file, lab result row, health-history answer,
      consent record, action plan, referral, trend series.
- [ ] Repeat every check on **every verb**: GET, PUT, PATCH, DELETE. Read
      protection is often present where write protection is not.
- [ ] Repeat on the export/download endpoint. A PDF link is an endpoint.
- [ ] Try Alice's ID in a body field while authenticated as Mallory
      (`{"userId": "<alice>"}`) — mass-assignment style.
- [ ] Unauthenticated request to every endpoint above.
- [ ] Expired/revoked session token, and a token from a deleted account.

## B. Identifiers and links

- [ ] Are report IDs guessable? (`Math.random`, sequential, timestamp-based
      are all guessable — see finding MHR-003.)
- [ ] Is a report download URL signed and time-limited, or permanent?
- [ ] Does a shared/exported report URL work without authentication? If yes,
      is that intended, and is it in the consent text?
- [ ] Does the URL leak PHI in the path or query string (lands in server
      logs, proxies, browser history, Referer headers)?

## C. Consent and lifecycle (R6)

- [ ] Revoke consent, then attempt: generate a report, view an old report,
      re-run analysis, receive a scheduled email. All should fail.
- [ ] Delete account, then attempt the same. Confirm the uploaded source
      files are actually deleted from object storage, not just dereferenced.
- [ ] Confirm what remains after deletion, and that the retention policy says
      so explicitly (audit rows may legitimately remain — they must be named).
- [ ] Can a user download everything held about them (subject access)?
- [ ] Is consent version-stamped, so you can prove which text was agreed?

## D. Clinical integrity (R7 — the safety one)

- [ ] Can the client submit a pre-computed severity, pathway or risk band and
      have the server trust it? All classification must be server-side.
- [ ] Can a lab result be edited after a report is generated, changing the
      report's meaning without a new version and audit entry?
- [ ] Can the reference-range set or rule version be selected by the client?
- [ ] Force a boundary value on each engine (exactly at a threshold, unit at
      the wrong scale — mmol/L submitted as mg/dL) and confirm the pathway is
      sane. Unit confusion is a patient-safety bug with a security shape.
- [ ] Can an URGENT pathway ever be downgraded by user-supplied input?
- [ ] Is the "verify extracted results" step enforced server-side, or can a
      client skip straight to report generation with unverified values?

## E. Upload handling (R8)

- [ ] Upload: a 200 MB file, a zip bomb, a PDF with 10,000 pages, a file with
      a `.pdf` extension but PNG magic bytes, an SVG containing script, a
      filename of `../../etc/passwd`, a filename with a null byte.
- [ ] Is the stored path derived from the user's filename? It must not be.
- [ ] Is the file served back with `Content-Disposition: attachment` and a
      non-guessable name, from a domain that is not the app origin?
- [ ] Rate limit on upload — is there one?

## F. Account and session

- [ ] Password reset token: single-use, expiring, invalidated on use, not
      leaked in the Referer header.
- [ ] Email/mobile verification cannot be bypassed to reach the upload flow.
- [ ] Enumeration: do login, registration and reset reveal whether an email
      exists? (For a health app this discloses that a person is a user.)
- [ ] Session fixed or rotated on login; logout actually invalidates
      server-side.
- [ ] Brute-force protection on login and on OTP verification.

## G. Data exposure (R5)

- [ ] Trigger a 500 and read the response body — stack traces, SQL, PHI?
- [ ] Check application logs after a full run: any lab value, name or IC?
- [ ] Check analytics/error reporting payloads (Sentry-style tools capture
      form values by default — that is PHI leaving the country).
- [ ] Check what is sent to the OCR/model provider, and whether they retain
      it (R9).
- [ ] Confirm no PHI in browser storage after logout.

## Recording results

For each failed check write to `Security/evidence/<run>/findings.md`:
target, request, response, impact in one sentence, and the fix. A finding
without a reproduction is a rumour.
