"""EVA SQUARE — Triggered Health Questionnaire (Screen 9 spec). Python port
of js/data/questionnaire.js — see that file's header comment for the
adaptive-section rationale."""

QUESTIONNAIRE_SECTIONS = [
    {
        "id": "cardiovascular", "label": "Cardiovascular", "icon": "❤️",
        "triggerDomains": ["cardiovascular"],
        "questions": [
            {"id": "everDiagnosedHighBP", "prompt": "Have you ever been diagnosed with high blood pressure?",
             "type": "choice", "options": ["Yes", "No", "Not sure"],
             "why": "A prior diagnosis changes how a single elevated reading should be interpreted."},
            {"id": "recentBP", "prompt": "What is your most recent blood pressure reading?", "type": "bp-pair",
             "why": "A home or clinic reading lets SQUARE confirm or contextualise the reading on your lab report."},
            {"id": "bpMedication", "prompt": "Do you currently take medication for blood pressure?",
             "type": "choice", "options": ["Yes", "No", "Prefer not to answer"],
             "why": "Treated blood pressure is interpreted differently to untreated readings in the risk calculators."},
            {"id": "familyHistoryPrematureCVD", "prompt": "Do any parents or siblings have a history of heart attack or stroke before age 60?",
             "type": "choice", "options": ["Yes", "No", "Not sure"],
             "why": "Premature family history is a risk-enhancing factor alongside your lipid results."},
        ],
    },
    {
        "id": "metabolic", "label": "Metabolic Health", "icon": "\U0001F4A7",
        "triggerDomains": ["metabolic"],
        "questions": [
            {"id": "diagnosedDiabetes", "prompt": "Have you been diagnosed with diabetes or prediabetes?",
             "type": "choice", "options": ["Yes", "No", "Not sure"],
             "why": "A confirmed diagnosis is treated differently to one unconfirmed elevated glucose reading."},
            {"id": "diabetesMedication", "prompt": "Are you currently taking medication for blood glucose?",
             "type": "choice", "options": ["Yes", "No", "Prefer not to answer"],
             "why": "Treatment status affects how a glucose or HbA1c result should be read."},
            {"id": "familyHistoryDiabetes", "prompt": "Do any close family members have diabetes?",
             "type": "choice", "options": ["Yes", "No", "Not sure"],
             "why": "Family history is one of several factors used to contextualise metabolic findings."},
            {"id": "activityLevel", "prompt": "How would you describe your typical physical activity level?",
             "type": "choice", "options": ["Sedentary", "Light", "Moderate", "Active"],
             "why": "Activity level is a modifiable factor considered in your action plan."},
        ],
    },
    {
        "id": "liver", "label": "Liver & Lifestyle", "icon": "\U0001FAC0",
        "triggerDomains": ["liver"],
        "questions": [
            {"id": "alcoholIntake", "prompt": "How would you describe your typical alcohol intake?",
             "type": "choice", "options": ["None", "Occasional", "Regular", "Heavy"],
             "why": "Alcohol intake is one of the most common contributors to a raised liver enzyme result."},
            {"id": "fattyLiverHistory", "prompt": "Have you been told you have fatty liver or another liver condition?",
             "type": "choice", "options": ["Yes", "No", "Not sure"],
             "why": "A known liver condition changes how a liver enzyme result should be interpreted."},
            {"id": "smokingStatus", "prompt": "What is your current smoking status?",
             "type": "choice", "options": ["Never smoked", "Former smoker", "Current smoker"],
             "why": "Smoking status is a required input to your cardiovascular risk calculation."},
        ],
    },
    {
        "id": "history", "label": "Medication & History", "icon": "\U0001F48A",
        "triggerDomains": [],
        "questions": [
            {"id": "regularMedication", "prompt": "Are you currently taking any regular prescription medication?",
             "type": "choice-with-text", "options": ["Yes", "No"], "textLabel": "If yes, please list what you're taking (optional)",
             "why": "Some medications change how a result should be read or which advice is appropriate."},
            {"id": "kidneyDisease", "prompt": "Have you been diagnosed with kidney disease?",
             "type": "choice", "options": ["Yes", "No", "Not sure"],
             "why": "Kidney function changes how several other findings should be weighed."},
            {"id": "pregnancyStatus", "prompt": "Are you currently pregnant, or within 6 months postpartum?",
             "type": "choice", "options": ["Not applicable", "Pregnant", "Postpartum", "Prefer not to answer"],
             "why": "Pregnancy changes reference ranges and routes some findings to a separate safety pathway."},
        ],
    },
]
