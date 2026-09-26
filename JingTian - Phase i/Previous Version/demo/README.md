# MyHealthReport — Version 1 Working Demo

This is a first working prototype of the MyHealthReport pipeline, built as a
standalone client-side web app (plain HTML/CSS/JS — no build step, no
server, no external dependencies). It implements the Phase 1 scope described
in `MyHealthReport_Version1_Framework.md` (metabolic / cardiovascular
domains) end to end, and its file layout deliberately mirrors the module
boundaries defined in `technical/MyHealthReport_Technical_Module_Architecture.md`
so that the demo can be read alongside that document.

## How to run it

Open `index.html` directly in any modern browser (double-click it, or
File → Open). Everything runs locally in the browser; no data is sent
anywhere, and no server or installation is required. The app uses classic
`<script>` tags (not ES modules) specifically so that it works over the
`file://` protocol without hitting CORS restrictions.

There are two one-click sample patients on the welcome screen ("Load Sample
Patient (Routine)" / "(Urgent)") that pre-fill the whole flow so you can see
a full report immediately, or you can click "Start New Assessment" and enter
values manually.

## What it demonstrates

The demo walks through the full pipeline described in the framework and
technical architecture documents:

1. **Profile intake** — demographics (Module 2) and anthropometrics
   (Module 3), plus a short health-history questionnaire (Module 4).
2. **Blood report entry** — a structured lab-result table standing in for
   the OCR/extraction step (Modules 5–9); every result is still mapped to a
   standard internal test code with its own unit and reference range.
3. **Rule engine** (`js/engine/ruleEngine.js`) — classifies each lab value
   and anthropometric measure against reference ranges into a severity band
   (0–5).
4. **Red-flag / safety engine** (`js/engine/redFlagEngine.js`) — derives one
   of four pathways from the findings: ROUTINE, MEDICAL_REVIEW, PROMPT, or
   URGENT.
5. **Risk engine** (`js/engine/riskEngine.js`) — a simplified additive
   cardiovascular risk score (explicitly labeled as non-validated).
6. **Domain engine** (`js/engine/domainEngine.js`) — rolls findings up into
   health-domain statuses (e.g. Metabolic, Cardiovascular).
7. **Targeted questions** (`js/data/questionTriggers.js`, surfaced via
   `js/engine/helper.js`) — only asks follow-up questions relevant to actual
   findings (e.g. an elevated ALT triggers alcohol/medication questions).
8. **Recommendation engine** (`js/data/recommendations.js` +
   `js/engine/helper.js`) — produces prioritised, explained recommendations,
   each with an issue, action, rationale, benefit, precaution and follow-up.
9. **Report generation** (`js/engine/reportGenerator.js`) — assembles
   everything into a final report (`js/app.js` renders it), with a snapshot,
   domain summary, detailed findings, and a monitoring plan.

**Safety overrides wellness** (a principle stated in the framework document)
is implemented as real code: `reportGenerator.js` only computes and shows
wellness recommendations when the pathway is ROUTINE or MEDICAL_REVIEW. On
PROMPT or URGENT pathways, the recommendations section is suppressed
entirely and replaced with a safety explanation and a generic monitoring
plan — you can see this by comparing the two sample patients.

## The two sample patients

- **Routine** — 52-year-old male, BMI 27.1, HbA1c 6.1%, ALT 68 U/L (the
  same worked example used in the framework document, for continuity).
  Lands on the ROUTINE pathway with a full set of prioritised
  recommendations.
- **Urgent** — 61-year-old male, BP 190/125, HbA1c 11.2%. Lands on the
  URGENT pathway; recommendations are suppressed and replaced with an
  explanation that the findings require prompt medical attention.

## Important: illustrative thresholds only

Every classification threshold in `js/data/labDictionary.js` and
`js/data/anthroRules.js` carries a `source` field reading "Demo threshold …
pending clinical validation," and the app displays a persistent yellow
disclaimer banner. **None of the reference ranges, severity cut-offs, or the
risk score in this build have been clinically validated** — this directly
addresses the "unvalidated clinical thresholds" weakness flagged in
`SWOT1/SWOT_Analysis_MyHealthReport_V1.md`. Before any real use, these would
need to go through the "Four Master Matrices" validation process described
in the framework document.

## What's stubbed vs. the full architecture

This is a first version, so several things are simplified relative to the
26-module technical architecture:

- No OCR — lab results are typed in rather than extracted from an uploaded
  PDF/photo (stands in for Modules 6–8).
- No backend or database — all state lives in memory in the browser tab and
  is lost on refresh (stands in for the persistence layer in Modules 22–26).
- No user accounts / auth (Module 1 is represented only as the welcome
  screen).
- The risk score is a simplified additive placeholder, not a validated
  clinical model.
- Only 9 lab tests and 4 anthropometric measures are implemented (a subset
  chosen to exercise every pathway and engine, not the full lab dictionary).
- No trend/repeat-report comparison (Module 20) — the demo only produces a
  single point-in-time report.

## File map

```
index.html                       7-step wizard shell + disclaimer banner
css/style.css                    all styling
js/data/labDictionary.js         lab test definitions, units, reference ranges (Modules 6, 9)
js/data/anthroRules.js           BMI / waist / BP classification rules (Module 3)
js/data/questionTriggers.js      condition -> targeted follow-up questions (Module 11)
js/data/recommendations.js       recommendation library, 7-field structure (Module 15)
js/engine/ruleEngine.js          value -> severity classification (Module 9)
js/engine/redFlagEngine.js       findings -> pathway (Module 12, safety/referral)
js/engine/riskEngine.js          simplified CV risk score (Module 13)
js/engine/domainEngine.js        findings -> per-domain status (Module 10/14)
js/engine/helper.js              question + recommendation selection (Module 11, 15)
js/engine/reportGenerator.js     orchestrates all engines, safety-override logic (Module 19)
js/app.js                        UI: wizard flow, sample patients, report rendering
test/smoke.js                    Playwright functional test (both pathways, back-nav)
test/screenshot.js               Playwright visual-QA screenshot capture
```

## Verification performed

- Full Playwright smoke test (`test/smoke.js`) walking both sample patients
  through every step to a final report, asserting on field population,
  trigger rendering, pathway text, recommendation suppression/presence, and
  zero console/page errors. Result: **all tests passed, zero console
  errors.**
- Visual QA via Playwright screenshots of all major states (welcome, labs
  entry, triggered questions, routine report, urgent report), manually
  reviewed.

To re-run the smoke test yourself (requires Node + Playwright installed):

```
node test/smoke.js
```
