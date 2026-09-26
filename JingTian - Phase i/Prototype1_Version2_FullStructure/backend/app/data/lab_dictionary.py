"""EVA SQUARE — lab dictionary, reference ranges, domains.

Direct Python port of frontend-v2's js/data/labDictionary.js. Cardiovascular
entries are marked source="real" (interpreted by app/engines/cardiovascular.py
against the Cardiovascular Domain Specification); every other domain is
source="illustrative" pending its own domain specification.
"""

DOMAINS = {
    "cardiovascular": {"key": "cardiovascular", "label": "Cardiovascular", "icon": "❤️", "color": "#c0392b"},
    "metabolic":      {"key": "metabolic",      "label": "Metabolic",      "icon": "\U0001F4A7", "color": "#2e5aac"},
    "liver":          {"key": "liver",          "label": "Liver",          "icon": "\U0001FAC0", "color": "#2f9e44"},
    "renal":          {"key": "renal",          "label": "Renal",          "icon": "\U0001FAD8", "color": "#0f8c7f"},
    "haematology":    {"key": "haematology",    "label": "Haematology",    "icon": "\U0001FA78", "color": "#8e44ad"},
    "anthropometric": {"key": "anthropometric", "label": "Anthropometric", "icon": "\U0001F4CF", "color": "#b5650a"},
}

DOMAIN_ORDER = ["cardiovascular", "metabolic", "liver", "renal", "haematology", "anthropometric"]

LAB_DICTIONARY = {
    # ---- Cardiovascular (REAL spec) ----
    "LAB_TC":    {"code": "LAB_TC",    "name": "Total Cholesterol",  "altNames": ["TC", "Cholesterol, Total"], "domain": "cardiovascular", "unit": "mmol/L", "decimals": 1, "source": "real"},
    "LAB_LDL":   {"code": "LAB_LDL",   "name": "LDL Cholesterol",    "altNames": ["LDL-C", "LDL"],             "domain": "cardiovascular", "unit": "mmol/L", "decimals": 1, "source": "real"},
    "LAB_HDL":   {"code": "LAB_HDL",   "name": "HDL Cholesterol",    "altNames": ["HDL-C", "HDL"],             "domain": "cardiovascular", "unit": "mmol/L", "decimals": 1, "source": "real"},
    "LAB_TG":    {"code": "LAB_TG",    "name": "Triglycerides",      "altNames": ["TG"],                       "domain": "cardiovascular", "unit": "mmol/L", "decimals": 1, "source": "real"},
    "LAB_APOB":  {"code": "LAB_APOB",  "name": "Apolipoprotein B",   "altNames": ["ApoB"],                     "domain": "cardiovascular", "unit": "mg/dL",  "decimals": 0, "source": "real", "advanced": True},
    "LAB_APOA1": {"code": "LAB_APOA1", "name": "Apolipoprotein A-I", "altNames": ["ApoA-I", "ApoA1"],          "domain": "cardiovascular", "unit": "mg/dL",  "decimals": 0, "source": "real", "advanced": True},
    "LAB_LPA":   {"code": "LAB_LPA",   "name": "Lipoprotein(a)",     "altNames": ["Lp(a)"],                    "domain": "cardiovascular", "unit": "nmol/L", "decimals": 0, "source": "real", "advanced": True},
    # ---- Metabolic (illustrative) ----
    "LAB_GLU_FAST": {"code": "LAB_GLU_FAST", "name": "Fasting Glucose", "altNames": ["FBS", "FPG"], "domain": "metabolic", "unit": "mmol/L", "decimals": 1, "source": "illustrative"},
    "LAB_HBA1C":    {"code": "LAB_HBA1C",    "name": "HbA1c",           "altNames": ["Glycated Hb"], "domain": "metabolic", "unit": "%",      "decimals": 1, "source": "illustrative"},
    # ---- Liver (illustrative) ----
    "LAB_ALT": {"code": "LAB_ALT", "name": "ALT", "altNames": ["SGPT"], "domain": "liver", "unit": "U/L", "decimals": 0, "source": "illustrative"},
    "LAB_AST": {"code": "LAB_AST", "name": "AST", "altNames": ["SGOT"], "domain": "liver", "unit": "U/L", "decimals": 0, "source": "illustrative"},
    # ---- Renal (illustrative) ----
    "LAB_CREAT": {"code": "LAB_CREAT", "name": "Creatinine", "altNames": ["Serum Creatinine"], "domain": "renal", "unit": "µmol/L", "decimals": 0, "source": "illustrative"},
    "LAB_EGFR":  {"code": "LAB_EGFR",  "name": "eGFR",        "altNames": [],                   "domain": "renal", "unit": "mL/min/1.73m²", "decimals": 0, "source": "illustrative"},
    # ---- Haematology (illustrative) ----
    "LAB_HB":  {"code": "LAB_HB",  "name": "Haemoglobin",       "altNames": ["Hb"],  "domain": "haematology", "unit": "g/dL",     "decimals": 1, "source": "illustrative"},
    "LAB_WBC": {"code": "LAB_WBC", "name": "White Blood Cells", "altNames": ["TLC"], "domain": "haematology", "unit": "cells/µL", "decimals": 0, "source": "illustrative"},
    "LAB_PLT": {"code": "LAB_PLT", "name": "Platelets",         "altNames": [],      "domain": "haematology", "unit": "Lakh/µL", "decimals": 2, "source": "illustrative"},
}

SIMPLE_RANGES = {
    "LAB_GLU_FAST": {"normalLow": 3.9, "normalHigh": 5.5, "mildHigh": 6.9, "severeHigh": 10, "source": "Demo threshold — illustrative, pending metabolic domain specification"},
    "LAB_HBA1C":    {"normalHigh": 5.6, "mildHigh": 6.4, "severeHigh": 9, "source": "Demo threshold — illustrative, pending metabolic domain specification"},
    "LAB_ALT":      {"normalHigh": 41, "mildHigh": 82, "severeHigh": 200, "source": "Demo threshold — illustrative, pending liver domain specification"},
    "LAB_AST":      {"normalHigh": 40, "mildHigh": 80, "severeHigh": 200, "source": "Demo threshold — illustrative, pending liver domain specification"},
    "LAB_CREAT":    {"normalLow": 60, "normalHigh": 110, "severeHigh": 180, "source": "Demo threshold — illustrative, pending renal domain specification"},
    "LAB_EGFR":     {"normalLow": 90, "mildLow": 60, "severeLow": 30, "source": "Demo threshold — illustrative, pending renal domain specification"},
    "LAB_HB":       {"normalLow": 13.0, "normalHigh": 17.0, "mildLow": 11, "severeLow": 8, "source": "Demo threshold — illustrative, pending haematology domain specification"},
    "LAB_WBC":      {"normalLow": 4000, "normalHigh": 11000, "source": "Demo threshold — illustrative, pending haematology domain specification"},
    "LAB_PLT":      {"normalLow": 1.5, "normalHigh": 4.5, "source": "Demo threshold — illustrative, pending haematology domain specification"},
}

ANTHRO_RULES = {
    "bmi": [
        {"max": 18.5, "label": "Underweight", "tone": "warn"},
        {"max": 23,   "label": "Normal",      "tone": "good"},
        {"max": 27.5, "label": "Overweight",  "tone": "warn"},
        {"max": 999,  "label": "Obese",       "tone": "bad"},
    ],
    "waist": {"men": 90, "women": 80},
}
