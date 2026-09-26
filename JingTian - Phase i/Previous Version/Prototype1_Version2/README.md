# SQUARE — Prototype 1, Version 2

A fully interactive, 20-screen web prototype of the SQUARE health interpretation platform, built directly from the design mockups in `Screen/` and the backend logic drafts in `Content/`. This is a **fresh, independent build** — it does not reuse code from the earlier `/demo` project, though it follows the same no-build-tooling, run-from-`file://` approach.

## How to run

Open `index.html` directly in a browser (double-click it, or drag it into a browser window). No server, build step, or install is required — everything is plain HTML/CSS/JS loaded via `<script>` tags. Chrome, Edge or Firefox all work.

To explore quickly: click **"Load a routine sample report"** or **"Load an urgent-pathway sample"** on the Welcome screen. This seeds a full patient scenario and jumps straight to the analysed Health Snapshot. To see the full Upload → Verify → Answer → Analyse pipeline, go through **Register → Terms → Consent → Upload**, then either choose a real file (the prototype has no live OCR, so any file is matched to a realistic sample panel for you to verify) or use one of the "sample instead" buttons.

## What's real vs. illustrative

This prototype deliberately implements one domain to a real specification and is explicit everywhere else:

- **Cardiovascular** (`js/engine/cardiovascular.js`) is implemented against `Content/Cardiovascular Domain Specification.pdf` — the CV-01 through CV-14 calculator register: blood pressure classification (MOH Malaysia Hypertension guideline, 5th ed. 2018), the Framingham General CVD Risk Score (D'Agostino 2008, sex-specific), Non-HDL-C, Friedewald-calculated LDL-C with its TG ≥ 4.5 mmol/L validity gate, AIP, Castelli I/II, ApoB risk-linked goals, ApoB/ApoA-I ratio, Lp(a) dual-unit bands (no fixed mg/dL↔nmol/L conversion, as the spec requires), the 3-of-5 metabolic syndrome rule, the "possible FH" referral trigger, triglyceride safety tiers, and the safety/escalation matrix. Every threshold and formula traces back to that document; where the spec defers to a clinician, this prototype stops at "flag for review," never a diagnosis or medication directive.
- **Metabolic, Liver, Renal, Haematology, Anthropometric** (`js/engine/otherDomains.js`) use simplified, clearly-labelled illustrative thresholds (`js/data/labDictionary.js#simpleRanges`), pending their own domain specifications — this was an explicit scope decision for this build, matching the earlier `/demo` project's spirit without reusing its code.
- **Legal content** (Terms & Conditions, Consent) is adapted from `Content/1. Terms & Conditions.pdf` and `Content/2. User Consent.pdf`, with the `[bracketed placeholders]` filled with a plausible sample entity ("SQUARE Health Sdn Bhd") per the agreed scope — these remain sample legal drafts, not reviewed by counsel.

Every illustrative result is tagged in the UI (a grey "Illustrative" pill on domain cards, an "illustrative" pill next to non-cardiovascular lab names on the Verify screen) so nothing overstates its own validation status.

## Project structure

```
index.html                  SPA shell — loads every script in dependency order
css/style.css                Full design-system CSS (navy/teal, cards, sidebar, etc.)
js/data/                     Static content: lab dictionary, questionnaire, recommendations,
                              legal text, two seed patient scenarios
js/engine/                   Pure calculation/classification logic (no DOM access)
  cardiovascular.js            The real, spec-traceable domain engine
  otherDomains.js               Illustrative logic for the other five domains
  ruleEngine.js                  Generic classify-by-range helper
  safetyEngine.js                 Aggregates every domain's urgency into one pathway
  questionEngine.js                Adaptive questionnaire section logic
  recommendationEngine.js           Evaluates the recommendation library
  trendEngine.js                     Longitudinal helpers (direction, delta, sparkline)
  reportGenerator.js                  Assembles the printable report in spec block order
js/store.js                  Central state store + localStorage persistence
js/ui/
  components.js               Reusable HTML-string components (buttons, cards, pills, …)
  shell.js                     Auth-shell / setup-shell / app-shell page chrome
  router.js                     Hash router (#/route/param1/param2)
  screens/*.js                  One file per screen group, 20 screens total
js/app.js                    Bootstrap + every cross-screen action handler (SQ.act.*)
test/smoke.js                Playwright smoke test — walks both scenarios through all
                              20 screens plus the manual upload pipeline, asserts zero
                              console errors, and saves a screenshot of every screen
test/screenshots/            Output of the smoke test, for visual QA
```

### Architecture pattern

Same layering discipline as the technical architecture behind the original `/demo` build, so clinical knowledge never leaks into the UI layer:

`data (facts)` → `engine (pure calculation)` → `store (state + persistence)` → `ui/shell + router (chrome/navigation)` → `ui/screens (render functions)` → `app.js (bootstrap + actions)`.

Screens are plain functions that return HTML strings; the router swaps `#root.innerHTML` wholesale on every state change (`SQ.store.subscribe(SQ.router.render)`), so there's no framework or virtual DOM — appropriate for a `file://`-run prototype with no build tooling.

## The 20 screens

| # | Screen | File |
|---|---|---|
| 1–3 | Welcome, Register, Login | `screens/auth.js` |
| 4–5 | Terms & Conditions, Consent | `screens/auth.js` |
| 6 | Dashboard | `screens/dashboard.js` |
| 7 | Upload | `screens/upload.js` |
| 8 | Verify Extracted Results | `screens/verify.js` |
| 9 | Triggered Health Questionnaire | `screens/questions.js` |
| 10–11 | Analysis Loading, Health Snapshot | `screens/analysis.js` |
| 12 | Result detail (single marker) | `screens/results.js` |
| 13 | Domain detail (6-tab view) | `screens/domain.js` |
| 14 | Action Plan | `screens/actionPlan.js` |
| 15 | Referral & Next Steps | `screens/referral.js` |
| 16 | Full Report | `screens/report.js` |
| 17 | Trends | `screens/trends.js` |
| 18 | Health Profile | `screens/profile.js` |
| 19 | Blood Reports library | `screens/reportsLibrary.js` |
| 20 | Settings | `screens/settings.js` |

All 20 screens are fully interactive (not golden-path-only), per the agreed scope.

## Sample data

Two internally-consistent seed scenarios live in `js/data/sampleReports.js`:

- **Routine** (Dexter Tan, 35M) — borderline-normal findings, including a deliberate reproduction of the specification's own worked example: LDL-C within range (3.2 mmol/L) but ApoB above goal (105 mg/dL), to exercise the discordance-explanation logic.
- **Urgent** (Priya Kumar, 58F) — trips the safety-escalation matrix: BP 190/122 with reported symptoms (severe headache, blurred vision) → EMERGENCY pathway, plus severely elevated triglycerides (11.2 mmol/L) and multiple risk modifiers.

These values are an original dataset, not a literal copy of the mutually-inconsistent placeholder numbers shown across the 20 Figma mockups (which come from different design passes).

## Known limitations

- No real OCR — any uploaded file is matched to the routine sample lab panel so the Verify screen still has something meaningful to check.
- Metabolic, Liver, Renal, Haematology and Anthropometric logic is illustrative only, pending real domain specifications.
- Data persists to the browser's `localStorage` (per-device, per-browser) — there is no backend, account system or multi-device sync.
- The legal content is a sample draft with a fictional entity name, not reviewed by qualified Malaysian counsel.
