# Threat Model — MyHealthReport

Scoped to the module architecture in
`Phase i/technical/MyHealthReport_Technical_Module_Architecture.md`.
Not legal advice; the PDPA points below are engineering requirements to
confirm with counsel, not a compliance opinion.

## 1. What we are protecting

| Asset | Why it matters | Where it lives |
|---|---|---|
| Structured lab results | Health data about an identifiable person | Modules 5–9 |
| Demographics + health history | Re-identifies the above; includes sensitive fields | Modules 2–4 |
| Uploaded source reports (PDF/image) | Contains name, IC, lab, doctor — richer than the extracted data | Module 5 |
| Generated reports | The full picture in one shareable file | Module 19 |
| Consent + T&C records | Evidence of lawful basis; forging one is worse than losing data | Module 1 |
| USER_ID mapping | The join key for everything | Module 1 |
| Rule/reference-range versions | Tampering silently changes a clinical classification | Modules 6, 10, 23/24 |

Rank order for a breach: uploaded source reports ≈ generated reports >
structured results > demographics > consent records.

## 2. Who we defend against

- **Curious authenticated user** — changes an ID in a URL to read someone
  else's report. Most likely incident by far.
- **Opportunistic scanner** — automated probing of a public staging or
  production endpoint.
- **Malicious uploader** — crafts a lab report PDF designed to attack the
  extraction pipeline (XSS payloads, prompt injection, parser abuse, zip/PDF
  bombs).
- **Insider or compromised staff account** — bulk export.
- **Compromised dependency or OCR/model vendor** — data leaves through a
  legitimate integration.

## 3. Trust boundaries

```
Browser (untrusted input)
   │  uploads, form values, answers
   ▼
Upload/ingest (Module 5) ───────── boundary A: file parsing + OCR
   ▼
Extraction / LLM interpretation ── boundary B: model + prompt
   ▼
Standardisation + rule engines ─── boundary C: clinical logic integrity
   ▼
Report generation (Module 19) ──── boundary D: output encoding + access
   ▼
Storage / audit (Modules 23-24) ── boundary E: retention + logging
```

Boundary B is the new one that a classical threat model would miss: content
from an untrusted PDF becomes instructions to a model that downstream code
trusts.

## 4. Ranked risks

| # | Risk | Boundary | Now | After backend |
|---|---|---|---|---|
| R1 | Broken object-level authorisation — user A reads user B's report | D | n/a | **Critical** |
| R2 | Prompt injection in an uploaded report alters extracted values or the risk classification | B | n/a | **Critical** |
| R3 | Stored XSS via lab names / free text rendered into the report | D | Latent (see MHR-001) | High |
| R4 | Report file or export URL guessable or unauthenticated | D | n/a | High |
| R5 | PHI in logs, error messages, analytics or LLM provider traces | E, B | n/a | High |
| R6 | Consent revoked but processing continues; no deletion path | A, E | n/a | High |
| R7 | Rule/reference-range version tampering changes a classification without audit | C | Medium | High |
| R8 | Malicious PDF/image crashes or exploits the parser | A | n/a | Medium |
| R9 | Cross-border transfer of health data to an OCR/model provider without a basis | B | n/a | Medium (PDPA) |
| R10 | Weak identifiers (`Math.random`) used as real user or report IDs | D | Low (see MHR-003) | High if promoted |

## 5. Safety-specific, not just security

This app outputs a clinical pathway (ROUTINE / MEDICAL_REVIEW / PROMPT /
URGENT). An attacker who can *downgrade* an URGENT pathway causes harm
without ever stealing data. Treat integrity of the rule engine and its
inputs as a security property:

- Reference ranges and rule versions are signed or checksummed, and the
  version used is recorded on every report (Module 23/24 already plans this).
- Any pathway downgrade is logged with the inputs that produced it.
- The red-flag engine's output must not be reachable or overridable from
  anything derived from untrusted text — including an LLM's output.

## 6. Out of scope for this harness

Physical security, staff device security, and the security posture of
laboratory partners. Those need contractual and organisational controls, not
a scanner.
