# MyHealthReport — Platform Structure & Execution Plan

This document translates the Version 1 Framework and the 26-module Technical
Architecture into a concrete build plan across three delivery channels —
website, desktop app, and mobile app — and closes with the execution plan
for the medical department's share of the work. It follows the roadmap
already set out in the framework document: the **Version 1 Scope Boundary**
(build the wellness/interpretation platform, delay diagnosis/marketplace
features), and the **phased clinical-domain rollout** (Phase 1 Metabolic /
Cardiovascular → Phase 2 Liver + Kidney → Phase 3 Full Blood Count + Iron →
Phase 4 Thyroid + Uric Acid + Nutritional).

---

## 1. One Core, Three Front Ends

Before splitting by platform, the most important structural decision from
the technical architecture still applies everywhere: **medical knowledge is
never hard-coded into a client.** All three versions below are front ends
sitting on top of the *same* backend — the Medical Rule Engine (Module 10),
Reference Range Engine (Module 8), Classification Database (Module 9), Red
Flag Engine (Module 13), Recommendation Engine (Module 15), and the Four
Master Matrices (Laboratory Interpretation, Trigger, Safety, Recommendation)
that the medical department owns. Website, desktop, and mobile all call the
same rule-engine API and render the same underlying classification codes —
they differ only in Layer 1 (User Experience) and, for desktop, in how much
of Layer 2 (Health Data) is cached locally.

```text
                     SHARED CORE (single source of truth)
   ┌─────────────────────────────────────────────────────────────────┐
   │  Layer 3 — Medical Intelligence   (Modules 6–16, 22–24)          │
   │  Layer 4 — Governance             (Modules 22–26)                │
   │  Rule Engine API · Reference Ranges · Classification DB          │
   │  Red Flag Engine · Recommendation Engine · Four Master Matrices  │
   └─────────────────────────────────────────────────────────────────┘
              ▲                    ▲                     ▲
              │                    │                     │
        WEBSITE (Modules       DESKTOP APP           MOBILE APP
        1–5, 17–21 UI)      (clinic / medical-      (consumer companion,
                              admin front end)        capture + tracking)
```

---

## 2. Website Version

The website is the **primary Version 1 channel** — it needs no install, is
the fastest to iterate on, and is where the full end-to-end patient flow
(registration → profile → blood report upload → rule engine → targeted
questions → report → follow-up) should launch first, covering Phase 1
(Metabolic / Cardiovascular) modules.

### Structure

```text
web/
├── frontend/                     Modules 1–5, 17–21 (UX layer)
│   ├── src/pages/                registration, profile, upload, report, trends
│   ├── src/components/           wizard steps, lab table, trigger blocks, report cards
│   └── src/api-client/           typed client for the shared Rule Engine API
├── backend/
│   ├── api/                      REST/GraphQL gateway (auth, uploads, reports)
│   ├── rule-engine/               Modules 6–16 — classification, pattern, trigger,
│   │                              red-flag, risk, recommendation, explanation engines
│   ├── ingestion/                Module 5 — upload handling + OCR/LLM extraction
│   └── admin/                    Module 22 — medical knowledge management console
├── database/                     Modules 4, 6, 8, 9, 25 — Postgres schemas
└── infra/                        auth, storage, logging, deployment config
```

### Programming languages / stack

| Layer | Recommendation |
|---|---|
| Frontend | TypeScript + React (Next.js) — server-rendered for speed and SEO on the marketing/landing pages, client-rendered wizard for the assessment flow |
| Backend / Rule Engine | Python (FastAPI) — strong fit for the rule engine, easiest path to later ML/OCR work, good typed-schema story via Pydantic |
| Database | PostgreSQL — structured objects match Module 25's object list (Patient, Lab Report, Result, Trigger, Recommendation, etc.) directly to relational tables |
| Async / background jobs | Python + a task queue (Celery or an equivalent) for OCR extraction and report generation, so uploads don't block the UI |
| Admin console (Module 22) | Same React/TypeScript stack, gated behind medical-admin roles (Module 25) |

### Key features needed

- **LLM/OCR blood-report extraction** — image or PDF upload → OCR pass →
  LLM-assisted mapping of laboratory text into structured `{test, result,
  unit, reference range}` records against the Lab Test Master Database
  (Module 6). This is explicitly an "AI should do" task per the framework
  (Section 27) — extraction assistance and wording, never the classification
  itself.
- **Rule-engine API** implementing Modules 6–16 exactly as documented (never
  duplicated client-side).
- **Unit conversion service** (Module 7) so results from different labs are
  comparable.
- **Report generator + PDF/print export** (Module 19).
- **Medical admin console** (Module 22) for the medical department to edit
  reference ranges, classification rules, triggers, and recommendation
  wording without a redeploy.
- **Auth, consent, and role-based access** (Modules 1, 25).
- **Audit / version logging** (Modules 23–24) surfaced per report ("Medical
  Knowledge Base v1.4," etc.), for traceability.

---

## 3. Desktop App Version

The desktop app is best positioned as the **clinic / medical-professional
and administration channel**, not a second copy of the consumer flow. It
gives the medical department and any partner clinics a secure, often
offline-capable environment for two things the website is not optimised
for: bulk/administrative rule management, and clinic-side data entry where
internet connectivity or IT policy make a local-first tool preferable.

### Structure

```text
desktop/
├── app-shell/                    Electron/Tauri shell wrapping the shared UI kit
├── src/                          same component library as web/frontend where possible
│   ├── clinic-intake/            Modules 1–5 — batch patient registration + report upload
│   ├── admin-console/            Module 22 — reference range / rule / trigger management
│   ├── review-queue/             Module 13 — red-flag / medical-review case queue
│   └── offline-store/            local encrypted cache, syncs to the shared backend when online
└── native/                       scanner integration, local printing, OS-level file access
```

### Programming languages / stack

| Layer | Recommendation |
|---|---|
| Shell | Tauri (Rust shell + the same TypeScript/React UI code as the website) — smaller install size and lower memory than Electron; Electron (Node.js + TypeScript) is the fallback if the team needs faster native-module access |
| Shared UI | TypeScript + React — the same component library as the website, so one design system serves both |
| Local storage | SQLite (encrypted at rest) for offline queueing, syncing to the shared PostgreSQL backend via the same Rule Engine API |
| Native integrations | Rust (Tauri commands) or Node native modules for scanner/printer access |

### Key features needed

- **Offline-first intake** — clinics with unreliable internet can register
  patients and enter/scan blood reports locally; results sync and pass
  through the shared Rule Engine once connectivity returns.
- **Scanner/printer integration** for physical blood reports and for
  printing the final report (Module 19 output).
- **Batch processing** — multiple patients' reports queued and processed
  together, useful for clinic throughput.
- **Medical admin console** (Module 22) as a first-class desktop feature —
  editing reference ranges, classification standards, red flags, and
  recommendation content, with review/approve/publish versioning (Module
  23) and an audit trail (Module 24). This is arguably the desktop app's
  most important differentiator from the website.
- **Red-flag review queue** (Module 13) — a dashboard for clinical staff to
  triage cases the Safety/Referral Engine has escalated.
- **Role-based permissions** distinguishing medical admin, clinic staff, and
  read-only reviewer accounts (Module 25).

---

## 4. Mobile App Version

The mobile app is the **consumer companion** — its job is to make the two
things people do repeatedly (capturing a new blood report, checking
progress) as frictionless as possible, and to carry the longitudinal-tracking
and follow-up experience (Modules 17, 20, 21) that a one-time website visit
does not serve well.

### Structure

```text
mobile/
├── src/
│   ├── capture/                  Module 5 — camera-based blood report capture
│   ├── profile/                  Modules 1–4 — lightweight onboarding
│   ├── dashboard/                 Modules 17–19 — trend charts, latest report, snapshot
│   ├── notifications/            Module 21 — follow-up / repeat-test reminders
│   └── api-client/                same typed client contract as web/desktop
└── native/                       camera, push notifications, biometric auth, health-data APIs
```

### Programming languages / stack

| Layer | Recommendation |
|---|---|
| App framework | TypeScript + React Native — maximises code and type-sharing with the website's React/TypeScript codebase and API client; Flutter (Dart) is a reasonable alternative if the team prioritises native rendering performance over code-sharing |
| Native modules | Camera and OCR pre-processing (image cropping/enhancement) in platform-native code (Swift/Kotlin) invoked from React Native, or a cross-platform camera library where sufficient |
| Local storage | Encrypted on-device store (e.g. SQLite/Realm) for offline viewing of the last report and cached trend data |
| Push notifications | Platform push services (APNs / FCM) driving Module 21 |

### Key features needed

- **Camera-based capture + LLM/OCR extraction** — the mobile use case this
  feature matters most for: photograph a paper or PDF blood report, run it
  through the same OCR/LLM extraction pipeline as the website, and let the
  user confirm low-confidence values (Module 3's validation step) before it
  enters the rule engine.
- **Push notifications for follow-up** (Module 21) — "repeat HbA1c in 3
  months," "update your weight," "your next report is due."
- **Trend dashboard** (Module 17) — the mobile-native surface for "Your
  HbA1c has shown a progressive upward trend across three measurements,"
  including simple charts.
- **Biometric login** for fast, secure repeat access to sensitive health
  data.
- **Optional health-platform integration** (Apple HealthKit / Google
  Health Connect) to pull in weight, activity, and blood-pressure readings
  automatically where the user opts in, supporting the anthropometric and
  lifestyle inputs from Modules 3–4.
- **Offline report viewing** — last generated report and trend history
  available without connectivity.

---

## 5. Suggested Build Sequence

Consistent with the framework's own phasing guidance (Section 30 — build
one clinical domain at a time, not all 26 modules simultaneously) and
scope boundary (Section 29):

1. **Website, Phase 1 domain only (Metabolic/Cardiovascular)** — validates
   the full pipeline end to end with the smallest safe surface area. This is
   what the `demo/` prototype in this project already exercises.
2. **Medical admin console on web** (Module 22) — needed as soon as the
   rule engine is live, so the medical department can maintain content
   without engineering involvement.
3. **Desktop app** — once the web rule engine and admin console are stable,
   wrap the same admin/clinic tooling for offline/clinic use; this is
   largely a packaging and offline-sync exercise, not new medical logic.
4. **Mobile app** — once the API contract is stable, build the
   capture-and-track companion experience; by this point OCR/LLM extraction
   should already be proven on the website.
5. **Expand clinical domains** (Phase 2 Liver/Kidney → Phase 3 FBC/Iron →
   Phase 4 Thyroid/Uric Acid/Nutritional) — rolled out to all three front
   ends simultaneously each time, since they only require additions to the
   shared rule engine and matrices, not platform-specific work.

---

## 6. Plan to Execute the Medical Department Task

The technical architecture's Team Division already assigns the medical
logic person ownership of Modules 6–16 plus the medical content of Modules
22–24 — in practice, this means the medical department owns the **Four
Master Matrices** (Section 31 of the framework) that everything else is
built against. The execution plan below sequences that work so engineering
is never blocked waiting on undefined medical content, and so nothing ships
without clinical sign-off.

### Step 1 — Scope the active domain

Before each phase (Phase 1 Metabolic/Cardiovascular first), the medical
department confirms the exact marker list in scope, per Module 8's Version
1 Domains (e.g. Phase 1 = BMI, blood pressure, fasting glucose, HbA1c, total
cholesterol, LDL-C, HDL-C, triglycerides). Nothing outside the confirmed
list should be built that phase.

### Step 2 — Draft the Four Master Matrices for that domain

For every marker in scope, the medical department drafts, in parallel:

- **Matrix A — Laboratory Interpretation Matrix**: marker, reference logic,
  severity bands (using the six-level framework, Section 10), related
  markers, candidate patterns.
- **Matrix B — Trigger Question Matrix**: finding → trigger → question →
  rationale → possible responses.
- **Matrix C — Safety / Referral Matrix**: finding/combination → threshold →
  risk level → action → referral urgency (Routine / Medical Review / Prompt
  / Urgent, per Module 12/13).
- **Matrix D — Recommendation Matrix**: finding/pattern → recommendation →
  why → contraindications → priority → follow-up (the seven-field structure
  in Section 19 of the framework).

Each entry carries a `RULE_ID`, guideline/source citation, and version tag
from the outset (Module 9's metadata format), since this becomes the audit
trail in Module 24.

### Step 3 — Internal clinical review

A second clinician (not the drafting author) reviews each matrix for
threshold accuracy, missing contraindications, and consistency with
recognised guidelines. Safety Matrix (C) entries specifically get checked
against the "Safety Override > Wellness Recommendation" principle
(Section 34) — i.e., confirm no combination can produce a wellness
recommendation when a safety pathway should have triggered instead.

### Step 4 — Structured hand-off to engineering

Matrices are delivered as structured data (spreadsheet or the admin
console once it exists — never prose), so they load directly into the
Classification Database (Module 9), Reference Range Database (Module 8),
Question Trigger Engine (Module 11) and Recommendation Engine (Module 15)
without re-interpretation by engineers. This is the practical enforcement
of "never hard-code medical knowledge into the front end."

### Step 5 — Rule-engine integration testing

Engineering runs the matrices through representative synthetic patient
profiles (including edge cases: multiple simultaneous abnormalities,
pregnancy, contraindicated combinations) and returns the classifications,
triggered questions, pathway, and recommendations to the medical department
for verification against clinical expectation — analogous to the
routine/urgent sample-patient verification already used for the `demo/`
prototype.

### Step 6 — Versioned publish and sign-off

On approval, the matrices are published as a new version through the
Medical Knowledge Management console (Module 22): `Medical Knowledge Base
vX.Y`, with the previous version retained (Module 23) so historical reports
remain explainable. A named clinician signs off each published version.

### Step 7 — Post-launch monitoring

Once live, the medical department reviews the Audit / Decision Log (Module
24) on a regular cadence — sampling real (anonymised) triggered rules and
generated recommendations — to catch unexpected rule interactions before
they compound, and feeds corrections back into Step 1 for the next
version.

### Step 8 — Repeat per phase

Steps 1–7 repeat for each subsequent clinical domain (Phase 2 Liver/Kidney,
Phase 3 FBC/Iron, Phase 4 Thyroid/Uric Acid/Nutritional), so the medical
department's output stays one phase ahead of engineering at all times
rather than becoming a bottleneck the platform waits on.
