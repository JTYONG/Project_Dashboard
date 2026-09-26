# Checklist — Health Data Handling

Engineering controls to confirm before real patient data touches the system.
Malaysia's PDPA treats health data as sensitive personal data; this list is
written against that shape but is **not legal advice** — have counsel confirm
the lawful basis, notice and cross-border position.

## Minimisation

- [ ] Every field collected maps to a module that uses it. Anything collected
      "for later" is deleted from the schema until later arrives.
- [ ] Raw values and derived classifications stored separately (already the
      architecture's rule) — and the raw source file has its own retention
      clock, shorter than the structured data if possible.
- [ ] Ethnicity, pregnancy and menopausal status are collected only where a
      specific reference range or risk engine consumes them, and the UI says
      which.

## Storage and transit

- [ ] TLS everywhere, HSTS on, no mixed content.
- [ ] Encryption at rest for the database and for object storage holding
      uploaded reports.
- [ ] Uploaded files are not in a public bucket. Verify by fetching the raw
      object URL while logged out.
- [ ] Backups are encrypted, and restore has been tested once.
- [ ] Database credentials come from a secret manager, never a repo or an
      environment file in an image.

## Access

- [ ] Named accounts for anyone who can reach patient data; no shared logins.
- [ ] Admin/support access to a patient record is logged with a reason.
- [ ] Staff cannot query PHI in bulk without an approval path.
- [ ] Production access does not exist by default for developers.

## Logging and third parties

- [ ] A redaction layer strips lab values, names and identifiers from logs.
- [ ] Error reporting is configured to drop request bodies and form fields.
- [ ] Every third party that sees PHI is listed: OCR, model provider, storage,
      email, analytics. Each has a data-processing agreement.
- [ ] Cross-border transfer position documented for each of those (most model
      and OCR providers process outside Malaysia).
- [ ] Model provider retention: confirm zero-retention / no-training terms in
      writing, and record where that is stated.

## Lifecycle

- [ ] Retention period defined per data class, and a job that actually
      enforces it.
- [ ] Deletion is real deletion, including backups within the stated window.
- [ ] Consent text is versioned; each record stores which version was agreed.
- [ ] A breach-response runbook exists: who is called, in what order, and the
      notification clock.

## Reports leaving the system

- [ ] Generated PDF contains only what the user consented to share.
- [ ] Referral output to a clinician goes over a channel appropriate for
      health data — not plain email attachment by default.
- [ ] The report states the rule/reference-range version used, so a later
      dispute can be reconstructed (Module 23/24).
