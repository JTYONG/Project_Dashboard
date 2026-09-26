"""EVA SQUARE — simplified logic for Metabolic, Liver, Renal, Haematology
and Anthropometric domains. Python port of js/engine/otherDomains.js."""
from ..data.lab_dictionary import ANTHRO_RULES
from .rule_engine import classify_by_range


def analyze_metabolic(labs, q):
    glucose = classify_by_range("LAB_GLU_FAST", labs.get("LAB_GLU_FAST"))
    hba1c = classify_by_range("LAB_HBA1C", labs.get("LAB_HBA1C"))
    glucose_flag = bool((glucose and glucose["tone"] != "good") or (hba1c and hba1c["tone"] != "good") or q.get("diagnosedDiabetes") == "Yes")
    urgency = "prompt" if ((glucose and glucose["band"] == "severe-high") or (hba1c and hba1c["band"] == "severe-high")) else "routine"
    return {"status": "illustrative", "domain": "metabolic", "results": [r for r in [glucose, hba1c] if r],
            "summary": {"glucoseFlag": glucose_flag, "urgency": urgency},
            "note": "Illustrative demo thresholds — pending a full metabolic domain specification."}


def analyze_liver(labs, q):
    alt = classify_by_range("LAB_ALT", labs.get("LAB_ALT"))
    ast = classify_by_range("LAB_AST", labs.get("LAB_AST"))
    alt_flag = bool(alt and alt["tone"] != "good")
    urgency = "prompt" if ((alt and alt["band"] == "severe-high") or (ast and ast["band"] == "severe-high")) else "routine"
    return {"status": "illustrative", "domain": "liver", "results": [r for r in [alt, ast] if r],
            "summary": {"altFlag": alt_flag, "urgency": urgency},
            "note": "Illustrative demo thresholds — pending a full liver domain specification."}


def analyze_renal(labs, q):
    creat = classify_by_range("LAB_CREAT", labs.get("LAB_CREAT"))
    egfr = classify_by_range("LAB_EGFR", labs.get("LAB_EGFR"))
    egfr_flag = bool(egfr and egfr["tone"] != "good")
    urgency = "prompt" if (egfr and egfr["band"] == "severe-low") else "routine"
    return {"status": "illustrative", "domain": "renal", "results": [r for r in [creat, egfr] if r],
            "summary": {"egfrFlag": egfr_flag, "urgency": urgency},
            "note": "Illustrative demo thresholds — pending a full renal domain specification."}


def analyze_haematology(labs, q):
    hb = classify_by_range("LAB_HB", labs.get("LAB_HB"))
    wbc = classify_by_range("LAB_WBC", labs.get("LAB_WBC"))
    plt = classify_by_range("LAB_PLT", labs.get("LAB_PLT"))
    any_flag = any(r and r["tone"] != "good" for r in (hb, wbc, plt))
    urgency = "prompt" if (hb and hb["band"] == "severe-low") else "routine"
    return {"status": "illustrative", "domain": "haematology", "results": [r for r in [hb, wbc, plt] if r],
            "summary": {"anyFlag": any_flag, "urgency": urgency},
            "note": "Illustrative demo thresholds — pending a full haematology domain specification."}


def bmi(height_cm, weight_kg):
    if not height_cm or not weight_kg:
        return None
    m = height_cm / 100
    return round((weight_kg / (m * m)) * 10) / 10


def bmi_category(value):
    if value is None:
        return None
    for band in ANTHRO_RULES["bmi"]:
        if value <= band["max"]:
            return band["label"]
    return "Obese"


def analyze_anthropometric(profile):
    value = bmi(profile.get("height"), profile.get("weight"))
    category = bmi_category(value)
    cutoff = ANTHRO_RULES["waist"]["women"] if profile.get("sex") == "F" else ANTHRO_RULES["waist"]["men"]
    waist = profile.get("waist")
    waist_flag = waist is not None and cutoff is not None and waist >= cutoff
    return {"status": "illustrative", "domain": "anthropometric", "bmi": value, "bmiCategory": category,
            "waist": waist, "waistCutoff": cutoff, "waistFlag": waist_flag,
            "summary": {"bmiCategory": category, "waistFlag": waist_flag},
            "note": "BMI bands are general illustrative ranges; waist cut-off uses Asian population thresholds referenced in the Cardiovascular Domain Specification's metabolic-syndrome criterion."}
