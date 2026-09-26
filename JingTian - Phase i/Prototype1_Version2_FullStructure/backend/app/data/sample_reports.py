"""EVA SQUARE — two seed scenarios (Python port of js/data/sampleReports.js).
See that file's header for the rationale: an internally-consistent original
dataset chosen to exercise both the routine path and the safety-escalation
matrix, deliberately reproducing the spec document's LDL/ApoB discordance
worked example."""

SAMPLE_SCENARIOS = {
    "routine": {
        "key": "routine", "label": "Sample Blood Report (routine)",
        "lab": "HealthPlus Labs", "reportDate": "2026-08-20", "fileName": "Sample Blood Report.pdf",
        "profile": {
            "fullName": "Dexter Tan", "email": "dexter@demo.square", "age": 35, "sex": "M", "country": "Malaysia",
            "height": 173, "weight": 78.2, "waist": 94, "restingHR": 72,
            "homeBP": {"sbp": 131, "dbp": 84, "readings": 14, "treated": False},
        },
        "labs": {
            "LAB_TC": 5.4, "LAB_LDL": 3.2, "LAB_HDL": 1.3, "LAB_TG": 1.4,
            "LAB_APOB": 105, "LAB_APOA1": 145, "LAB_LPA": 45,
            "LAB_GLU_FAST": 5.8, "LAB_HBA1C": 5.9, "LAB_ALT": 34, "LAB_AST": 26,
            "LAB_CREAT": 82, "LAB_EGFR": 96, "LAB_HB": 14.2, "LAB_WBC": 6800, "LAB_PLT": 2.6,
        },
        "labConfidence": {"LAB_TC": 99, "LAB_LDL": 98, "LAB_HDL": 99, "LAB_TG": 97, "LAB_GLU_FAST": 82, "LAB_ALT": 95, "LAB_HB": 99},
        "questionnaireDefaults": {
            "everDiagnosedHighBP": "No", "recentBP": {"sbp": 131, "dbp": 84}, "bpMedication": "No", "familyHistoryPrematureCVD": "No",
            "diagnosedDiabetes": "No", "diabetesMedication": "No", "familyHistoryDiabetes": "Not sure", "activityLevel": "Light",
            "alcoholIntake": "Occasional", "fattyLiverHistory": "No", "smokingStatus": "Never smoked",
            "regularMedication": "No", "regularMedicationText": "", "kidneyDisease": "No", "pregnancyStatus": "Not applicable",
        },
        "trendHistory": {
            "LAB_LDL": [{"date": "2023-11-05", "value": 3.3}, {"date": "2024-05-02", "value": 3.6}, {"date": "2026-08-20", "value": 3.2}],
            "weight": [{"date": "2026-03-01", "value": 79.8}, {"date": "2026-05-01", "value": 79.1}, {"date": "2026-07-01", "value": 78.6}, {"date": "2026-08-20", "value": 78.2}],
            "homeBP": [
                {"date": "2026-08-14", "sbp": 134, "dbp": 86}, {"date": "2026-08-15", "sbp": 129, "dbp": 82}, {"date": "2026-08-16", "sbp": 132, "dbp": 85},
                {"date": "2026-08-17", "sbp": 128, "dbp": 81}, {"date": "2026-08-18", "sbp": 133, "dbp": 86}, {"date": "2026-08-19", "sbp": 130, "dbp": 83}, {"date": "2026-08-20", "sbp": 131, "dbp": 84},
            ],
        },
        "originalText": """SAMPLE LABORATORY REPORT                     Report Date: 20 Aug 2026
Sample ID: 260820-00417        Age/Gender: 35 / Male
Collected: 19 Aug 2026 07:40   Ref By: Dr. A. Physician
Reported:  20 Aug 2026 11:05   Lab ID: HL-224981

LIPID PROFILE
  Total Cholesterol      5.4   mmol/L   <5.2
  LDL Cholesterol        3.2   mmol/L   <3.4
  HDL Cholesterol        1.3   mmol/L   >1.0
  Triglycerides          1.4   mmol/L   <1.7
  Apolipoprotein B       105   mg/dL    <100 (risk-linked)
  Apolipoprotein A-I     145   mg/dL    -
  Lipoprotein(a)         45    nmol/L   <75

GLYCAEMIC
  Fasting Glucose        5.8   mmol/L   3.9-5.5
  HbA1c                  5.9   %        <5.7

LIVER FUNCTION
  ALT (SGPT)             34    U/L      7-41
  AST (SGOT)             26    U/L      8-40

RENAL FUNCTION
  Creatinine             82    umol/L   60-110
  eGFR                   96    mL/min/1.73m2   >90

FULL BLOOD COUNT
  Haemoglobin            14.2  g/dL     13.0-17.0
  White Blood Cells      6800  cells/uL 4000-11000
  Platelets              2.6   Lakh/uL  1.5-4.5
*** This is a simulated report generated for prototype demonstration. ***""",
    },
    "urgent": {
        "key": "urgent", "label": "Screening Report (urgent pathway demo)",
        "lab": "Wellness Diagnostics", "reportDate": "2026-08-21", "fileName": "Screening Report.pdf",
        "profile": {
            "fullName": "Priya Kumar", "email": "priya@demo.square", "age": 58, "sex": "F", "country": "Malaysia",
            "height": 160, "weight": 74, "waist": 96, "restingHR": 88,
            "homeBP": {"sbp": 190, "dbp": 122, "readings": 3, "treated": False},
        },
        "labs": {
            "LAB_TC": 7.8, "LAB_LDL": 6.1, "LAB_HDL": 1.0, "LAB_TG": 11.2,
            "LAB_APOB": 168, "LAB_APOA1": 118, "LAB_LPA": 140,
            "LAB_GLU_FAST": 9.1, "LAB_HBA1C": 8.2, "LAB_ALT": 30, "LAB_AST": 28,
            "LAB_CREAT": 95, "LAB_EGFR": 72, "LAB_HB": 12.8, "LAB_WBC": 7600, "LAB_PLT": 2.4,
        },
        "labConfidence": {"LAB_TC": 97, "LAB_LDL": 95, "LAB_HDL": 98, "LAB_TG": 93, "LAB_GLU_FAST": 96, "LAB_ALT": 98, "LAB_HB": 97},
        "questionnaireDefaults": {
            "everDiagnosedHighBP": "Yes", "recentBP": {"sbp": 190, "dbp": 122}, "bpMedication": "Yes", "familyHistoryPrematureCVD": "Yes",
            "diagnosedDiabetes": "Yes", "diabetesMedication": "Yes", "familyHistoryDiabetes": "Yes", "activityLevel": "Sedentary",
            "alcoholIntake": "None", "fattyLiverHistory": "Not sure", "smokingStatus": "Former smoker",
            "regularMedication": "Yes", "regularMedicationText": "Metformin, Amlodipine", "kidneyDisease": "Not sure", "pregnancyStatus": "Not applicable",
            "symptomsNow": ["Severe headache", "Blurred vision"],
        },
        "trendHistory": {
            "LAB_LDL": [{"date": "2023-11-10", "value": 5.2}, {"date": "2024-05-08", "value": 5.7}, {"date": "2026-08-21", "value": 6.1}],
            "weight": [{"date": "2026-03-01", "value": 75.6}, {"date": "2026-05-01", "value": 75.0}, {"date": "2026-07-01", "value": 74.4}, {"date": "2026-08-21", "value": 74.0}],
            "homeBP": [
                {"date": "2026-08-15", "sbp": 176, "dbp": 114}, {"date": "2026-08-16", "sbp": 182, "dbp": 118}, {"date": "2026-08-17", "sbp": 179, "dbp": 116},
                {"date": "2026-08-18", "sbp": 185, "dbp": 119}, {"date": "2026-08-19", "sbp": 188, "dbp": 121}, {"date": "2026-08-20", "sbp": 184, "dbp": 120}, {"date": "2026-08-21", "sbp": 190, "dbp": 122},
            ],
        },
        "originalText": """SCREENING REPORT                              Report Date: 21 Aug 2026
Sample ID: 260821-00933        Age/Gender: 58 / Female
Collected: 21 Aug 2026 08:10   Ref By: Self-referred screening
Reported:  21 Aug 2026 13:20   Lab ID: WD-551203

LIPID PROFILE
  Total Cholesterol      7.8   mmol/L   <5.2
  LDL Cholesterol        6.1   mmol/L   <3.4
  HDL Cholesterol        1.0   mmol/L   >1.0
  Triglycerides          11.2  mmol/L   <1.7
  Apolipoprotein B       168   mg/dL    <100 (risk-linked)
  Apolipoprotein A-I     118   mg/dL    -
  Lipoprotein(a)         140   nmol/L   <75

GLYCAEMIC
  Fasting Glucose        9.1   mmol/L   3.9-5.5
  HbA1c                  8.2   %        <5.7

LIVER FUNCTION
  ALT (SGPT)             30    U/L      7-41
  AST (SGOT)             28    U/L      8-40

RENAL FUNCTION
  Creatinine             95    umol/L   60-110
  eGFR                   72    mL/min/1.73m2   >90

FULL BLOOD COUNT
  Haemoglobin            12.8  g/dL     13.0-17.0 (flag: below range)
  White Blood Cells      7600  cells/uL 4000-11000
  Platelets              2.4   Lakh/uL  1.5-4.5
*** This is a simulated report generated for prototype demonstration. ***""",
    },
}
