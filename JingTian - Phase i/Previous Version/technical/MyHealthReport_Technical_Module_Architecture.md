# MyHealthReport — Technical Module Architecture

## Guiding Principle

For technical development, the platform should not be arranged purely by screen. It should be arranged into separate modules so that the UI, medical logic, laboratory data, risk algorithms, and reporting can each evolve independently. Below is the master technical module architecture — 26 modules — followed by the recommended system architecture diagram, the four-layer model underlying it, the core "never hard-code medical knowledge" rule, and how this maps onto a four-person team.

---

## 1. User Access & Welcome Module

The entry layer of the platform.

Includes: welcome/landing screen, registration, login, email/mobile verification, consent, privacy acknowledgement, terms of use, disclaimer, user ID generation, account settings, language preference.

**Main output:** `USER_ID` — almost everything afterward should be linked to this ID.

## 2. Basic Demographic Profile Module

Stores relatively stable information: date of birth, calculated age, biological sex, ethnicity where medically relevant, country/region, pregnancy status where relevant, menopausal status where relevant. This becomes part of the risk-variable database.

```text
DOB
  ↓
Calculate Age
  ↓
Age = 52
  ↓
Stored as demographic variable
  ↓
Available to:
  - Cardiovascular risk engine
  - Diabetes risk engine
  - Renal assessment
  - Reference-range selection
```

## 3. Anthropometric Profile Module

This should be its own module because it will eventually produce longitudinal anthropometric trends.

**Raw values stored:** height, weight, waist circumference, hip circumference, blood pressure, heart rate, optional body composition.

**Derived values calculated:** BMI, BMI category, waist-to-height ratio, waist-to-hip ratio, central obesity classification, blood pressure classification, weight change %.

**Important technical concept: raw data and calculated classifications must be stored separately.**

```text
Weight = 83 kg                     ← raw
Height = 1.75 m                    ← raw
BMI = 27.1                         ← calculated
BMI classification = Overweight    ← classification
Classification standard = MOH MY   ← rule source
Rule version = 2026.01
```

This makes future guideline updates much easier.

## 4. Health History Module

Not everything should be asked at registration. This database progressively collects: medical history, family history, medication, supplements, allergy, smoking, alcohol, exercise, diet, sleep, stress, previous cardiovascular disease, diabetes, hypertension, kidney disease, liver disease.

The system should allow four answer states — **UNKNOWN, YES, NO, NOT APPLICABLE** — and avoid letting NULL mean everything.

## 5. Blood Report Upload Module

The ingestion layer.

```text
Upload PDF / image
        ↓
Identify laboratory
        ↓
Identify report date
        ↓
Identify patient/report metadata
        ↓
Extract analytes
        ↓
Map analytes to standardized test codes
        ↓
Capture: Test, Result, Unit, Lab reference range, Flag
        ↓
User / system verification
        ↓
Store structured result
```

For V1, even if OCR or automated extraction is introduced later, the database should be designed as though every result eventually becomes structured data.

Example:

| Field | Value |
|---|---|
| Test | ALT |
| Value | 68 |
| Unit | U/L |
| Lab lower limit | 0 |
| Lab upper limit | 41 |
| Lab | XYZ Laboratory |
| Date | 2026-08-20 |

## 6. Laboratory Test Master Database

One of the most important backend modules: a standardized Lab Test Dictionary.

| Internal Code | Standard Name | Alternate Names |
|---|---|---|
| LAB_GLU_FAST | Fasting Plasma Glucose | FBS, FPG |
| LAB_HBA1C | HbA1c | Glycated Hb |
| LAB_ALT | ALT | SGPT |
| LAB_AST | AST | SGOT |
| LAB_CREAT | Creatinine | Serum Creatinine |

This solves the problem of different laboratories using different naming conventions. The rest of the medical algorithms should reference `LAB_HBA1C`, not whatever text appears on the report.

## 7. Unit Standardisation & Conversion Module

Algorithms must never directly use whatever unit the laboratory provides.

Example — glucose: Lab A reports mmol/L, Lab B reports mg/dL.

```text
Original result + Original unit
              ↓
       Conversion engine
              ↓
   Canonical value + Canonical unit
```

```text
Original:  Glucose = 108 mg/dL
Canonical: Glucose = 6.0 mmol/L
```

Keep both. Never overwrite the original laboratory value.

## 8. Laboratory Reference Range Database

Separate from the disease/risk classification database.

Stores: laboratory, test, lower limit, upper limit, unit, sex criteria, age criteria, pregnancy criteria, method if relevant, effective date, reference range version.

Example:

```text
LAB_ID = 003
Test = ALT
Male, 18–59 years
Upper limit = 45 U/L
Version = 2026-01
```

This answers *"Is this result outside the reporting laboratory's range?"* — which is a different question from *"Does this result satisfy a clinical risk threshold?"* Those two concepts should never be mixed.

## 9. Clinical Classification Standard Database

Where medical guidelines are stored: BMI classification, blood pressure classification, HbA1c classification, fasting glucose classification, LDL classification, triglyceride classification, eGFR classification, albuminuria classification, anaemia classification, liver enzyme classification, etc.

Every rule should contain metadata:

```text
RULE_ID: GLYCEMIA_HBA1C_001
Parameter: HbA1c
Condition: <5.7%
Classification: Normal
Guideline: Specified clinical guideline
Version: 2026.01
```

This becomes the medical knowledge database.

## 10. Rule Engine / Medical Logic Engine

The heart of the platform. Do **not** code hundreds of medical decisions directly into individual screens.

```text
Patient Data + Anthropometric Data + Lab Results + History + Medication
                          ↓
                 MEDICAL RULE ENGINE
                          ↓
       Clinical classifications → Risk flags → Question triggers
                          ↓
           Recommendations → Referral triggers
```

Example:

```text
HbA1c = 6.1%
      ↓
RULE ENGINE
      ↓
Classification: Prediabetes range
      ↓
Trigger: Ask family history of diabetes, symptoms,
         previous abnormal glucose, medication
      ↓
Risk module → Lifestyle advice module
```

## 11. Question Trigger Engine

An independent module. Users should not answer 80 questions at registration.

```text
Blood report uploaded
        ↓
Abnormal finding detected
        ↓
Question Trigger Engine
        ↓
Only relevant questions appear
```

Example — ALT elevated: ask alcohol intake, medication, supplements, previous liver disease, obesity, recent strenuous exercise, hepatitis history.

Example — Hb low: ask menstrual history, bleeding symptoms, diet, previous anaemia, GI symptoms, pregnancy, etc.

This is the module that makes the platform feel "intelligent."

## 12. Risk Stratification Engine

Classification and risk must remain separate.

"LDL = high" is a classification. But age + sex + smoking + BP + diabetes + cholesterol + history together may produce "Cardiovascular risk = elevated." That requires a dedicated **Risk Engine**.

Possible future components: cardiovascular risk, diabetes risk, metabolic risk, kidney risk, liver/metabolic risk, obesity risk, nutritional risk, anaemia risk, frailty risk, etc.

Each risk calculator should have: `CALCULATOR_ID`, variables required, formula, exclusion criteria, interpretation, version, source guideline.

## 13. Red Flag / Escalation Module

Especially important for this platform.

```text
Normal wellness pathway
        ↓
Monitor pathway
        ↓
Medical review recommended
        ↓
Urgent medical review
        ↓
Emergency advice
```

Logic:

```text
Result received
      ↓
Red Flag Engine
      ↓
No red flag  → Wellness analysis continues
Red flag     → Suppress inappropriate wellness reassurance
             → Display medical review recommendation
             → Potential doctor referral
```

Red flags should be centrally controlled and versioned.

## 14. Health Domain Analysis Module

Rather than presenting 40 individual blood tests, combine them into domains: metabolic health, cardiovascular health, glycaemic health, lipid health, kidney health, liver health, haematological health, nutritional health, thyroid health, inflammatory markers, anthropometric health.

Each domain receives inputs from multiple parameters. Example — Metabolic Health: BMI, waist circumference, BP, glucose, HbA1c, triglycerides, HDL, ALT → domain interpretation.

This will eventually make the report much easier for patients to understand.

## 15. Recommendation Engine

Separate recommendations from classifications — a classification may trigger several recommendations.

Example: Prediabetes + BMI overweight + sedentary → Recommendation Engine → diet, exercise, weight management, sleep, monitoring, repeat testing, professional consultation.

Recommendations should have codes such as `REC_DIET_001`, `REC_EXERCISE_004`, `REC_SLEEP_002` — instead of putting recommendation text directly into the algorithm.

## 16. Explanation / Health Education Library

Because the concept includes explaining *why* the advice is given, create a dedicated content library.

Example entries:
- `EDU_HBA1C_001` — What HbA1c represents
- `EDU_WEIGHT_BP_001` — How excess body weight influences blood pressure
- `EDU_EXERCISE_INSULIN_001` — How exercise improves insulin sensitivity

The Recommendation Engine calls these educational modules. This allows doctors to update medical wording without modifying programming logic.

## 17. Trend & Longitudinal Health Module

Blood report storage should not simply archive PDFs — every parameter should be stored longitudinally.

Example — HbA1c:

| Date | Value |
|---|---|
| Jan 2026 | 6.4% |
| Apr 2026 | 6.1% |
| Aug 2026 | 5.8% |

Then calculate: absolute change, percentage change, direction, rate of change, persistent abnormality, new abnormality, resolved abnormality.

The trend engine could output: **IMPROVING, STABLE, WORSENING, NEWLY ABNORMAL, PERSISTENTLY ABNORMAL**.

## 18. Health Score Module

If health scores are eventually used, keep this separate from the clinical classifications: metabolic health score, cardiovascular wellness score, lifestyle score, overall health profile score.

Internally, **clinical result ≠ health score**. The score should be a communication tool, not a replacement for actual medical classifications.

## 19. Report Generation Module

Takes information from all other modules.

```text
Profile + Anthropometrics + Lab results + Trends
+ Classification + Risk + Questions + Recommendations
                    ↓
             REPORT GENERATOR
```

Possible output structure:

1. Health summary
2. Key findings
3. Anthropometric profile
4. Blood results
5. Health domains
6. Trends
7. Risk factors
8. Areas requiring attention
9. Lifestyle recommendations
10. Why these recommendations matter
11. Suggested monitoring
12. Doctor referral if indicated

## 20. Referral & Professional Network Module

Later can support: doctor, dietitian, physiotherapist, pharmacist, fitness professional, other wellness professionals — triggered by the medical logic rather than arbitrary advertising.

Example: persistent high BP → Referral Rule → doctor consultation recommended.

## 21. Notification & Follow-Up Module

Examples: repeat HbA1c in X months, repeat lipid profile, update weight, update BP, upload next blood report, complete triggered questionnaire.

This creates longitudinal engagement instead of a one-time blood-report service.

## 22. Medical Knowledge Management / Admin Module

The medical team will eventually need an interface to manage: reference ranges, classification standards, risk algorithms, red flags, question triggers, recommendations, educational content, guideline versions.

```text
Admin Dashboard
      ↓
Medical Logic → HbA1c
      ↓
Edit classification → Review → Approve → Publish Version 2.1
```

Programmers should not need to redeploy the whole application every time a medical threshold changes.

## 23. Version Control Module

Critical for medical software. Every generated report should record: medical rule version, reference range version, risk calculator version, recommendation version, report engine version.

Example:

```text
Report generated: 24 Aug 2026
Medical Knowledge Base: v1.4
Cardiovascular Algorithm: v2.1
```

If a guideline changes later, this makes it possible to determine exactly why an old report produced its conclusion.

## 24. Audit & Clinical Decision Log

Whenever the system produces an important conclusion, retain the reasoning inputs.

Example:

```text
USER 123
HbA1c = 6.1
Rule triggered = GLU_004
Classification = Prediabetes range
Trigger questions = Q_GLU_01, Q_GLU_04
Recommendation = REC_GLU_02
Rule version = 1.3
Timestamp = ...
```

Extremely valuable for debugging, medical review, quality assurance, dispute investigation, and algorithm improvement.

## 25. Security, Privacy & Permission Module

A platform-wide backend layer including: authentication, encryption, role-based access, consent management, access logs, data deletion, data export, backup, recovery, admin permissions, doctor permissions, patient permissions.

Medical administrators should have different permissions from programmers or customer support staff.

## 26. Analytics & System Improvement Module

Later, anonymised/system-level analytics can show: most common abnormalities, common risk combinations, question completion rate, report upload success rate, referral rates, user retention, repeat testing behaviour.

Keep this separate from clinical decision-making.

---

## Recommended Technical Architecture

```text
                    MYHEALTHREPORT
                           │
                           ▼
                01 USER / AUTHENTICATION
                           │
              ┌────────────┴─────────────┐
              ▼                           ▼
     02 DEMOGRAPHICS              03 ANTHROPOMETRICS
              │                           │
              └────────────┬──────────────┘
                            ▼
                   04 HEALTH HISTORY
                            │
                            ▼
                    05 REPORT UPLOAD
                            │
                            ▼
                  06 LAB TEST MAPPING
                            │
                            ▼
                  07 UNIT CONVERSION
                            │
                            ▼
              08 REFERENCE RANGE ENGINE
                            │
                            ▼
              09 CLASSIFICATION DATABASE
                            │
                            ▼
                   10 MEDICAL RULE ENGINE
                      /        |        \
                     /         |         \
                    ▼          ▼          ▼
             11 QUESTION    12 RISK     13 RED FLAG
               TRIGGERS      ENGINE       ENGINE
                    \          |          /
                     \         |         /
                      └────────┼────────┘
                               ▼
                      14 HEALTH DOMAINS
                               │
                               ▼
                     15 RECOMMENDATIONS
                               │
                               ▼
                     16 EDUCATION LOGIC
                               │
                  ┌────────────┴────────────┐
                  ▼                         ▼
             17 TREND ENGINE          18 HEALTH SCORE
                  │                         │
                  └────────────┬────────────┘
                               ▼
                       19 REPORT GENERATOR
                               │
                   ┌───────────┴───────────┐
                   ▼                       ▼
             20 REFERRAL              21 FOLLOW-UP
```

Underneath all of this sit five system-wide modules:

- 22 Medical Admin / Knowledge Management
- 23 Version Control
- 24 Audit / Decision Logging
- 25 Security / Privacy / Permissions
- 26 Analytics

---

## The Most Important Architecture Principle

Think of the platform as **four layers**, not merely one application:

```text
LAYER 1 — USER EXPERIENCE
Screens, questionnaires, dashboards, reports
              ↓
LAYER 2 — HEALTH DATA
Profile, anthropometrics, labs, history, trends
              ↓
LAYER 3 — MEDICAL INTELLIGENCE
Reference ranges, classification, rules,
risk algorithms, red flags, question triggers, recommendations
              ↓
LAYER 4 — GOVERNANCE
Versioning, audit, medical admin, security, permissions, analytics
```

**The most important rule for the developers: never hard-code medical knowledge into the front-end.**

The programmer should **not** write, throughout the application:

```python
if hba1c >= 6.5:
    diagnosis = "diabetes"
```

Instead:

```text
HbA1c
  ↓
Medical Rule Engine
  ↓
Retrieve active rule
  ↓
Apply criteria
  ↓
Return classification code
  ↓
UI displays approved wording
```

This architecture is far more scalable: later, the team can update WHO/MOH/clinical guideline standards, introduce new risk calculators, add new blood tests, or change recommendation wording — without rebuilding the whole platform.

---

## Team Division (Four-Person Team)

This architecture creates a clean division of ownership:

- **Medical logic person** — owns Modules 6–16, plus the medical content of Modules 22–24.
- **Technical developers** — build the engines, databases, APIs, and UI.
- **UI / marketing person** — primarily designs Modules 1–5 and the presentation of Modules 14–21.

This is the structure to use as the technical backbone before the development team starts designing the database schema or coding individual screens.
