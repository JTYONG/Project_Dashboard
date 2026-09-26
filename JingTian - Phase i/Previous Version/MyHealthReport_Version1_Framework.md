# MyHealthReport Version 1 Framework

## 1. Purpose of Version 1

MyHealthReport Version 1 is a **structured health interpretation and wellness-navigation platform**.

Its purpose is to help a user:

1. Understand their basic health profile.
2. Upload and structure a blood test report.
3. Identify which laboratory values are outside the reported reference range.
4. Understand patterns between related results.
5. Answer only the questions relevant to those findings.
6. Identify whether a finding is suitable for wellness advice or requires medical review.
7. Receive a short, prioritised action plan.
8. Understand the reasoning behind every recommendation.
9. Track results over time.

Version 1 should **not** attempt to diagnose disease independently.

The central logic is:

**Data → Abnormality → Pattern → Context → Safety → Priority → Action → Explanation → Follow-up**

---

## 2. Core Design Principles

### Principle 1: Start simple

Registration should collect only information that is useful across almost every health analysis. Detailed questions are asked later only when triggered by the laboratory findings.

### Principle 2: Never interpret one laboratory number in isolation

A result should be interpreted through:

**Result + Reference Range + Related Markers + Patient Profile + Symptoms + History + Trend**

### Principle 3: Safety overrides wellness advice

If a finding could indicate a clinically significant problem, the system should first recommend appropriate medical assessment. Wellness advice becomes secondary.

### Principle 4: Explain the reasoning

Every recommendation should answer:

**What did we find? Why might it matter? What can you do? Why should that action help?**

### Principle 5: Prioritise instead of overwhelming

Twenty abnormal values should not automatically produce twenty recommendations. The system should group related abnormalities and identify the most important upstream health priorities.

---

## 3. Version 1 System Architecture

```text
USER
 ↓
REGISTRATION
 ↓
BASIC HEALTH PROFILE
 ↓
BASELINE HEALTH CLASSIFICATION
 ↓
BLOOD REPORT UPLOAD
 ↓
REPORT IDENTIFICATION
 ↓
DATA EXTRACTION
 ↓
DATA VALIDATION
 ↓
UNIT + REFERENCE RANGE CAPTURE
 ↓
ABNORMALITY DETECTION
 ↓
SEVERITY CLASSIFICATION
 ↓
LAB DOMAIN CLASSIFICATION
 ↓
PATTERN RECOGNITION
 ↓
MASTER TRIGGER MATRIX
 ↓
TARGETED QUESTIONS
 ↓
CONTEXT INTEGRATION
 ↓
SAFETY / REFERRAL ENGINE
 ↓
PRIORITY ENGINE
 ↓
WELLNESS RECOMMENDATION ENGINE
 ↓
CONFLICT / CONTRAINDICATION CHECK
 ↓
EXPLANATION ENGINE
 ↓
PERSONALISED REPORT
 ↓
FOLLOW-UP PLAN
 ↓
REPEAT REPORT / TREND ANALYSIS
```

---

## 4. Module 1: Basic Health Profile

### Objective

Create enough baseline information to interpret future blood tests without making registration burdensome.

### Required at Registration

| Variable | Purpose |
|---|---|
| Age / date of birth | Risk and reference context |
| Biological sex | Laboratory interpretation |
| Height | BMI calculation |
| Weight | BMI and metabolic context |
| Waist circumference | Central obesity risk |
| Blood pressure, if known | Cardiovascular context |
| Smoking status | Cardiovascular risk |
| Alcohol use | Liver/metabolic interpretation |
| General physical activity | Lifestyle baseline |
| Known major medical conditions | Safety and context |
| Regular medication | Interpretation and safety |
| Pregnancy status, when relevant | Safety override |

### Automatically Calculate

**BMI**

$$BMI = \frac{Weight\ (kg)}{Height\ (m)^2}$$

Then classify weight status.

The platform can also calculate other validated risk scores later when all required inputs are present.

---

## 5. Module 2: Blood Report Intake

### Objective

Convert a laboratory report into structured data.

### Step 1: Identify Report

Capture:

- Laboratory name
- Report date
- Patient identifiers where appropriate
- Laboratory units
- Laboratory reference ranges

### Step 2: Extract Results

Each result becomes a structured record:

| Field | Example |
|---|---|
| Test | ALT |
| Result | 65 |
| Unit | U/L |
| Reference lower limit | 0 |
| Reference upper limit | 40 |
| Lab flag | High |
| Report date | 22 Aug 2026 |
| Lab source | Laboratory A |

---

## 6. Module 3: Data Validation

Before interpretation, the system checks:

- Was the value extracted correctly?
- Does the unit make sense?
- Is the reference range available?
- Is the test name recognised?
- Is the result biologically plausible?
- Are there duplicate values?
- Is there a previous result available?

If confidence is low:

> **User confirmation required**

Example:

> "We detected potassium 8.4 mmol/L. Please confirm that this value was read correctly from your report."

This prevents extraction errors from becoming health advice.

---

## 7. Module 4: Reference Range Architecture

MyHealthReport should not rely on one universal reference range. Every laboratory marker should contain three layers.

### Layer A: Laboratory Reference Interval

Taken directly from the uploaded report.

Example: **ALT: 0–40 U/L**

This is preserved exactly.

### Layer B: Clinical Decision Threshold

Used only when recognised guidelines or established clinical thresholds apply. This may differ from the laboratory's population reference range.

### Layer C: Platform Interpretation Rule

The platform uses structured rules to interpret the result.

For example:

$$Relative\ Elevation = \frac{Result}{Upper\ Limit\ of\ Normal}$$

If ALT = 80 and Lab ULN = 40, then 80 / 40 = 2 × ULN.

This allows results from different laboratories to be compared more consistently.

---

## 8. Module 5: Laboratory Domain Classification

Each test belongs to one or more health domains.

### Version 1 Domains

**A. Full Blood Count**
Haemoglobin, RBC, Haematocrit, MCV, MCH, MCHC, RDW, WBC, Differential count, Platelets

**B. Glucose / Metabolic**
Fasting glucose, HbA1c, other glucose-related markers when available

**C. Lipid Profile**
Total cholesterol, LDL-C, HDL-C, Triglycerides, Non-HDL cholesterol where available

**D. Liver**
ALT, AST, ALP, GGT, Bilirubin, Albumin, Total protein

**E. Kidney**
Creatinine, eGFR, Urea, Sodium, Potassium

**F. Uric Acid**
Uric acid

**G. Thyroid**
TSH, Free T4, Free T3 where available

**H. Iron / Nutritional**
Ferritin, Iron, Transferrin, TIBC, Vitamin B12, Folate, Vitamin D

Version 1 should initially focus on common laboratory panels rather than attempting to interpret every possible test.

---

## 9. Module 6: Abnormality Detection

Each laboratory result receives a status.

### Basic Status

**Normal, Low, High**

Then additional interpretation can classify magnitude:

```text
Within reference interval
↓
Borderline / mild deviation
↓
Moderate deviation
↓
Marked deviation
↓
Potentially critical
```

The exact thresholds must be marker-specific. The platform should never assume that all values that are "slightly outside range" have equal clinical importance.

---

## 10. Module 7: Severity Framework

MyHealthReport Version 1 should use six broad action levels.

### Level 0: Within Expected Range

No major concern identified from this marker.

### Level 1: Optimisation Opportunity

Not necessarily abnormal. May represent an opportunity to improve long-term health.

Example: Suboptimal lifestyle risk profile despite normal laboratory results.

### Level 2: Mild Abnormality

Usually suitable for lifestyle review, context assessment, monitoring, and appropriate follow-up.

### Level 3: Clinically Relevant Abnormality

May warrant clinician assessment depending on context, persistence and associated findings.

### Level 4: High-Risk Finding

Medical assessment should be prioritised. Wellness advice becomes secondary.

### Level 5: Potential Critical Finding

Activates urgent safety pathway. The platform should emphasise prompt professional assessment rather than continue routine wellness interpretation.

---

## 11. Module 8: Pattern Recognition Engine

This is one of the most important parts of MyHealthReport. The system should look for combinations rather than treating each value independently.

### Example 1: Metabolic Pattern

Possible combination: BMI elevated, waist circumference elevated, triglycerides elevated, HDL low, glucose/HbA1c elevated, blood pressure elevated, ALT elevated.

The system may identify: **Metabolic-risk pattern**. It should not automatically label a disease diagnosis.

### Example 2: Microcytic Pattern

Combination: Hb low, MCV low, MCH low.

Triggers: ferritin review, iron studies, blood loss questions, dietary history, menstrual history where relevant, clinician referral logic.

### Example 3: Liver Pattern

Different combinations may suggest different biochemical patterns, for example **ALT/AST predominant** versus **ALP/GGT predominant**. The platform recognises the biochemical pattern and asks different questions.

---

## 12. Module 9: Master Trigger Matrix

The Master Trigger Matrix connects laboratory findings to questions.

The logic is:

```text
LAB FINDING
↓
PATTERN
↓
TRIGGER
↓
TARGETED QUESTION SET
```

Example:

| Trigger | Question |
|---|---|
| ALT elevated | Alcohol intake |
| ALT elevated | Medication use |
| ALT elevated | Supplement/herbal use |
| ALT elevated | Known fatty liver |
| ALT elevated | Recent heavy exercise |
| ALT + metabolic markers abnormal | Weight change |
| GGT elevated | Alcohol context |
| Significant abnormality | Relevant symptoms |

The patient therefore answers only questions that matter to their results.

---

## 13. Module 10: Targeted Question Engine

Questions are divided into categories.

### Symptoms

Examples: fatigue, dizziness, chest discomfort, breathlessness, jaundice, bleeding, severe weakness. Only relevant symptom groups are activated.

### Medical History

Examples: diabetes, hypertension, kidney disease, liver disease, thyroid disease, cardiovascular disease.

### Medication

Record: regular medication, recent medication, supplements, traditional/herbal products.

### Diet

Rather than asking for a full food diary, Version 1 asks targeted questions.

Example — Triglycerides high: sugary drinks, refined carbohydrate intake, alcohol, overeating, weight gain.

### Exercise

Capture: frequency, duration, intensity, resistance exercise, sedentary time.

### Sleep

Capture: average sleep duration, sleep quality, irregular sleep schedule, possible sleep-disordered breathing symptoms when relevant.

### Stress

Capture simply: low, moderate, high, major recent stressors. Version 1 should not attempt a complete psychological assessment.

---

## 14. Module 11: Context Integration Engine

After collecting targeted questions, the platform combines:

```text
LAB RESULTS
+
PATIENT PROFILE
+
MEDICAL HISTORY
+
MEDICATIONS
+
SYMPTOMS
+
LIFESTYLE
+
PREVIOUS RESULTS
```

This creates the health context used by later engines.

---

## 15. Module 12: Safety and Referral Engine

This engine runs before wellness recommendations.

**Main Question:** Is this situation appropriate for routine wellness guidance?

If yes: proceed. If no: escalate.

Possible outputs:

- **Routine Wellness Pathway** — no major safety concern identified.
- **Medical Review Recommended** — a finding warrants discussion with a healthcare professional.
- **Prompt Medical Assessment** — finding may be clinically significant.
- **Urgent Assessment** — potential red-flag situation.

The exact clinical trigger thresholds should be built separately in the **Safety Matrix** and medically validated before implementation.

---

## 16. Module 13: Priority Engine

Once findings have been interpreted, the platform groups related issues.

Example — patient has: obesity, elevated BP, high triglycerides, elevated glucose, mild ALT elevation, high uric acid.

Instead of six separate recommendations, the system may identify:

- **Priority 1:** Metabolic health / weight management
- **Priority 2:** Blood pressure
- **Priority 3:** Cardiovascular risk
- **Priority 4:** Liver monitoring

This makes the action plan easier to follow.

---

## 17. Module 14: Root-Factor Mapping

The platform should identify factors influencing multiple abnormalities.

Example:

```text
EXCESS WEIGHT
   ↓
Insulin resistance
   ↓
Glucose ↑
Triglycerides ↑
Blood pressure ↑
Fatty liver risk ↑
Uric acid ↑
```

Therefore one intervention may improve several laboratory abnormalities. The system should communicate this.

Example: "Weight management is prioritised because it may positively influence several of your current metabolic findings at the same time."

---

## 18. Module 15: Wellness Recommendation Engine

Version 1 recommendations should focus on: nutrition, physical activity, weight management, sleep, stress management, smoking cessation, alcohol moderation, hydration where appropriate, and general preventive health behaviour.

Advice should be proportional to the evidence available.

---

## 19. Recommendation Structure

Every recommendation contains structured fields:

```text
TRIGGER
↓
HEALTH ISSUE
↓
RECOMMENDATION
↓
WHY
↓
EXPECTED BENEFIT
↓
PRECAUTION
↓
FOLLOW-UP
```

**Example**

- **Trigger:** Elevated triglycerides + excess body weight
- **Recommendation:** Reduce refined carbohydrates and sugary beverages while working toward gradual weight reduction.
- **Why:** Excess energy intake and high refined-carbohydrate intake can contribute to elevated triglycerides.
- **Expected Benefit:** Improvement in triglycerides and broader metabolic health.
- **Precaution:** Advice may need modification depending on medical conditions, medication and nutritional status.
- **Follow-Up:** Repeat relevant measurements according to the appropriate clinical plan.

---

## 20. Module 16: Recommendation Conflict Resolver

All recommendations pass through a safety filter before being shown.

**Example conflicts:**

- **Recommendation:** Increase exercise intensity. **Conflict:** Severe anaemia or concerning cardiovascular symptoms. **Action:** Do not issue routine intensive exercise advice.
- **Recommendation:** High-protein diet. **Conflict:** Relevant kidney impairment. **Action:** Modify or suppress recommendation pending clinical assessment.
- **Recommendation:** Aggressive weight loss. **Conflict:** Pregnancy, underweight status or other contraindicating context. **Action:** Suppress recommendation.

---

## 21. Module 17: Recommendation Priority System

Each recommendation receives an internal score based on factors such as: clinical importance, modifiability, number of findings affected, safety, expected health benefit, and user feasibility.

The patient should normally receive approximately **3 main priorities**, with secondary recommendations underneath. Avoid producing ten equally important actions.

---

## 22. Module 18: Explanation Engine

Every important recommendation should offer:

- **What we found** — e.g. "Your triglyceride level is above the laboratory reference range."
- **Why it may matter** — e.g. "Elevated triglycerides can be associated with metabolic and cardiovascular risk."
- **What may contribute** — based on the user's profile: excess weight, dietary pattern, alcohol, glucose regulation, inactivity.
- **What you can do** — specific actions.
- **Why this may help** — mechanistic explanation.
- **What happens next** — monitoring, repeat testing or professional assessment.

---

## 23. Module 19: Final User Report

The final Version 1 report should have a consistent structure.

**Section 1: Health Snapshot** — BMI, blood pressure category if available, smoking status, activity level, major baseline risks.

**Section 2: Laboratory Overview** — clear categories: Within expected range / Needs attention / Higher priority / Medical review recommended.

**Section 3: Key Patterns** — instead of listing only individual markers: Metabolic-risk pattern, Possible iron-related pattern, Liver enzyme abnormality pattern.

**Section 4: Your Top Priorities** — usually three, e.g. 1. Improve metabolic health, 2. Address blood pressure, 3. Improve lipid profile.

**Section 5: Recommended Actions** — concrete and measurable where possible.

**Section 6: Why These Actions Matter** — show causal reasoning.

**Section 7: Medical Follow-Up** — clearly separate wellness advice from findings that warrant clinician review.

**Section 8: Monitoring Plan** — what should be tracked: weight, waist, BP, activity, laboratory values, symptoms where relevant.

---

## 24. Module 20: Longitudinal Tracking

The system should store previous results.

| Date | HbA1c |
|---|---:|
| Jan | 5.6 |
| Apr | 5.8 |
| Aug | 6.1 |

Instead of simply saying "HbA1c is elevated," the system can eventually say: "Your HbA1c has shown a progressive upward trend across three measurements."

Trend categories may include: **Improving, Stable, Worsening, Fluctuating.**

---

## 25. Version 1 Database Concept

The platform should not store information only as free text. Core structured objects should include:

- **Patient** — basic profile
- **Laboratory Report** — source, date and metadata
- **Laboratory Result** — test, value, unit and reference range
- **Health Domain** — liver, kidney, metabolic etc.
- **Trigger** — condition that activates another rule
- **Question** — targeted question
- **Answer** — patient response
- **Pattern** — combination of findings
- **Safety Rule** — referral / escalation rule
- **Recommendation** — structured intervention
- **Contraindication** — condition preventing or modifying advice
- **Priority** — importance of recommendation
- **Explanation** — reasoning shown to patient
- **Follow-Up** — suggested monitoring pathway

---

## 26. Master Rule Architecture

The core platform rule should follow this model:

```text
IF
Finding X
AND / OR
Finding Y
AND
Patient Context Z
THEN
Activate Question Set A
THEN
Assess Safety Rule B
THEN
Identify Pattern C
THEN
Generate Recommendation D
UNLESS
Contraindication E
THEN
Assign Priority F
AND
Generate Explanation G
AND
Generate Follow-Up H
```

This should be the standard structure for almost every clinical/wellness rule in the platform.

---

## 27. What AI Should Do

AI can be used for: laboratory report extraction assistance, natural-language explanation, summarisation, personalising wording, identifying relevant rules, explaining relationships between findings, and generating patient-friendly reports.

---

## 28. What AI Should NOT Independently Control

Critical elements should remain rule-governed: emergency triggers, critical laboratory thresholds, contraindications, referral criteria, diagnostic claims, medication advice, and clinically sensitive recommendations.

The safest architecture is:

> **Structured clinical rules determine what is allowed. AI determines how it is explained.**

---

## 29. Version 1 Scope Boundary

To keep Version 1 realistic:

**Include:** basic profile, BMI, blood pressure context, common blood tests, abnormality detection, severity classification, common pattern recognition, targeted questions, wellness recommendations, red-flag/referral logic, recommendation explanations, trend tracking, report generation.

**Delay to Later Versions:** supplement marketplace, automatic supplement prescribing, pharmacy sales integration, complex genetic interpretation, imaging interpretation, diagnosis engine, medication initiation, medication adjustment, complex specialist disease management, advanced AI autonomous clinical decision-making.

---

## 30. Version 1 Clinical Domains to Build First

Build the engine in this order:

- **Phase 1 — Metabolic / cardiovascular:** BMI, BP, glucose, HbA1c, lipid profile. This gives MyHealthReport a strong preventive-health foundation.
- **Phase 2 — Liver + kidney**
- **Phase 3 — Full blood count + iron**
- **Phase 4 — Thyroid + uric acid + nutritional markers**

Do not attempt to build every laboratory module simultaneously.

---

## 31. The Four Master Matrices Needed

Before software development, Version 1 needs four core matrices.

**Matrix A: Laboratory Interpretation Matrix** — Marker, Reference logic, Severity, Related markers, Potential patterns.

**Matrix B: Trigger Question Matrix** — Finding, Trigger, Question, Why question is needed, Possible responses.

**Matrix C: Safety / Referral Matrix** — Finding, Threshold / combination, Risk level, Action, Referral urgency.

**Matrix D: Recommendation Matrix** — Finding / pattern, Recommendation, Why, Contraindications, Priority, Follow-up.

These four matrices effectively become the **brain of MyHealthReport**.

---

## 32. Version 1 Decision Flow

```text
START
 ↓
Collect Basic Profile
 ↓
Calculate Baseline Health Indicators
 ↓
Upload Blood Report
 ↓
Extract Values
 ↓
Validate Values
 ↓
Capture Laboratory Reference Ranges
 ↓
Identify Abnormal Results
 ↓
Assign Severity
 ↓
Group Into Health Domains
 ↓
Look for Patterns
 ↓
Activate Targeted Questions
 ↓
Integrate Patient Context
 ↓
Any Safety Trigger?
 ↓
        YES ─────────→ Medical Pathway
        │
        NO
        ↓
Identify Main Modifiable Factors
 ↓
Generate Candidate Recommendations
 ↓
Check Contraindications
 ↓
Rank Priorities
 ↓
Generate Explanation
 ↓
Create Health Report
 ↓
Set Follow-Up
 ↓
Track Future Results
 ↓
REPEAT
```

---

## 33. The Identity of MyHealthReport

The strongest positioning for Version 1 is not:

> "AI tells you what your blood test means."

It is:

> "MyHealthReport turns your blood results, health profile and lifestyle into a personalised health roadmap."

Its core promise should be:

- **Understand** — what is happening.
- **Prioritise** — what matters most.
- **Act** — what can be improved.
- **Escalate** — when professional medical assessment is appropriate.
- **Explain** — why every recommendation is being made.
- **Track** — whether health is improving over time.

---

## 34. The Central MyHealthReport Algorithm

The entire Version 1 framework can ultimately be represented as:

$$Health\ Interpretation = Lab\ Findings + Patterns + Patient\ Context + Risk + Trend$$

followed by:

$$Action\ Plan = Priority \times Modifiability \times Benefit \times Safety$$

subject to:

$$Safety\ Override > Wellness\ Recommendation$$

and finally:

$$MyHealthReport = Understand + Prioritise + Act + Explain + Monitor$$

This should be treated as the **Version 1 master architecture**.

The next layer beneath this framework should be the actual **Master Clinical Logic System**, beginning with the Laboratory Interpretation Matrix, Trigger Matrix, Safety Matrix and Recommendation Matrix.
