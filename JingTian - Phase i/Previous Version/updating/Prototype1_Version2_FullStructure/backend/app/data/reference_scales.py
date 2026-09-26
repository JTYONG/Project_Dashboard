"""EVA SQUARE — reference-scale definitions for the "expand row to see the
full scale" UI feature (FullStructure spec item #2). Each scale is a
{unit, min, max, bands:[{from,to,label,tone}], source} object; `from`/`to`
are inclusive-lower/exclusive-upper except the last band, which extends to
`max`. Cardiovascular scales reuse the exact thresholds already implemented
in engines/cardiovascular.py; illustrative-domain scales are generated from
data/lab_dictionary.py#SIMPLE_RANGES so there is one source of truth for
those thresholds. LDL/TC/HDL/Non-HDL/Castelli general bands are NOT part of
the Cardiovascular Domain Specification (which ties LDL to risk-linked ApoB
goals, not a fixed absolute scale) — they are standard NCEP ATP III-style
population reference bands, added ONLY so the UI has something illustrative
to show on the scale widget, and are labelled as such everywhere they
appear.
"""
from .lab_dictionary import SIMPLE_RANGES, ANTHRO_RULES, LAB_DICTIONARY

NCEP_NOTE = "General population reference bands (NCEP ATP III-style), shown for illustration only — EVA SQUARE's actual guidance uses the risk-linked ApoB goals and discordance rules in the Cardiovascular Domain Specification, not a fixed absolute scale."
SPEC_SOURCE = "Cardiovascular Domain Specification"

CARDIO_SCALES = {
    "BP_SYSTOLIC": {"name": "Systolic blood pressure", "unit": "mmHg", "min": 80, "max": 200, "source": "MOH Malaysia Hypertension CPG, 5th ed. 2018",
        "bands": [
            {"from": 80, "to": 120, "label": "Optimal", "tone": "good"},
            {"from": 120, "to": 130, "label": "Normal", "tone": "good"},
            {"from": 130, "to": 140, "label": "At-risk / high-normal", "tone": "warn"},
            {"from": 140, "to": 160, "label": "Grade 1 Hypertension", "tone": "warn"},
            {"from": 160, "to": 180, "label": "Grade 2 Hypertension", "tone": "bad"},
            {"from": 180, "to": 200, "label": "Grade 3 Hypertension", "tone": "bad"},
        ]},
    "BP_DIASTOLIC": {"name": "Diastolic blood pressure", "unit": "mmHg", "min": 50, "max": 130, "source": "MOH Malaysia Hypertension CPG, 5th ed. 2018",
        "bands": [
            {"from": 50, "to": 80, "label": "Optimal", "tone": "good"},
            {"from": 80, "to": 85, "label": "Normal", "tone": "good"},
            {"from": 85, "to": 90, "label": "At-risk / high-normal", "tone": "warn"},
            {"from": 90, "to": 100, "label": "Grade 1 Hypertension", "tone": "warn"},
            {"from": 100, "to": 110, "label": "Grade 2 Hypertension", "tone": "bad"},
            {"from": 110, "to": 130, "label": "Grade 3 Hypertension", "tone": "bad"},
        ]},
    "LAB_LDL": {"name": "LDL Cholesterol", "unit": "mmol/L", "min": 0, "max": 8, "source": NCEP_NOTE,
        "bands": [
            {"from": 0, "to": 2.6, "label": "Optimal", "tone": "good"},
            {"from": 2.6, "to": 3.4, "label": "Near optimal", "tone": "good"},
            {"from": 3.4, "to": 4.1, "label": "Borderline high", "tone": "warn"},
            {"from": 4.1, "to": 4.9, "label": "High", "tone": "bad"},
            {"from": 4.9, "to": 8, "label": "Very high", "tone": "bad"},
        ]},
    "LAB_HDL": {"name": "HDL Cholesterol", "unit": "mmol/L", "min": 0, "max": 3, "source": NCEP_NOTE + " Higher is more favourable.",
        "bands": [
            {"from": 0, "to": 1.0, "label": "Low", "tone": "bad"},
            {"from": 1.0, "to": 1.3, "label": "Below average", "tone": "warn"},
            {"from": 1.3, "to": 1.6, "label": "Average", "tone": "good"},
            {"from": 1.6, "to": 3, "label": "High / protective", "tone": "good"},
        ]},
    "LAB_TC": {"name": "Total Cholesterol", "unit": "mmol/L", "min": 0, "max": 9, "source": NCEP_NOTE,
        "bands": [
            {"from": 0, "to": 5.2, "label": "Desirable", "tone": "good"},
            {"from": 5.2, "to": 6.2, "label": "Borderline high", "tone": "warn"},
            {"from": 6.2, "to": 9, "label": "High", "tone": "bad"},
        ]},
    "LAB_TG": {"name": "Triglycerides", "unit": "mmol/L", "min": 0, "max": 12, "source": SPEC_SOURCE,
        "bands": [
            {"from": 0, "to": 1.7, "label": "Desirable", "tone": "good"},
            {"from": 1.7, "to": 4.5, "label": "Raised", "tone": "warn"},
            {"from": 4.5, "to": 10, "label": "High (Friedewald LDL-C invalid)", "tone": "bad"},
            {"from": 10, "to": 12, "label": "Severe (pancreatitis risk)", "tone": "bad"},
        ]},
    "NON_HDL": {"name": "Non-HDL Cholesterol", "unit": "mmol/L", "min": 0, "max": 8, "source": NCEP_NOTE,
        "bands": [
            {"from": 0, "to": 3.4, "label": "Desirable", "tone": "good"},
            {"from": 3.4, "to": 4.9, "label": "Borderline high", "tone": "warn"},
            {"from": 4.9, "to": 8, "label": "High", "tone": "bad"},
        ]},
    "LAB_APOB": {"name": "Apolipoprotein B", "unit": "mg/dL", "min": 0, "max": 200, "source": SPEC_SOURCE + " (risk-linked goal table; shown here against the highest-risk goal of <65, moderate goal <100)",
        "bands": [
            {"from": 0, "to": 65, "label": "Meets very-high-risk goal", "tone": "good"},
            {"from": 65, "to": 80, "label": "Meets high-risk goal", "tone": "good"},
            {"from": 80, "to": 100, "label": "Meets moderate-risk goal only", "tone": "warn"},
            {"from": 100, "to": 200, "label": "Above goal for all risk categories", "tone": "bad"},
        ]},
    "LAB_LPA": {"name": "Lipoprotein(a)", "unit": "nmol/L", "min": 0, "max": 300, "source": SPEC_SOURCE,
        "bands": [
            {"from": 0, "to": 75, "label": "Lower", "tone": "good"},
            {"from": 75, "to": 125, "label": "Intermediate", "tone": "warn"},
            {"from": 125, "to": 300, "label": "Elevated / risk-enhancing", "tone": "bad"},
        ]},
    "AIP": {"name": "Atherogenic Index of Plasma", "unit": "log10(TG/HDL-C)", "min": -0.5, "max": 1.0, "source": SPEC_SOURCE + " (supplementary index)",
        "bands": [
            {"from": -0.5, "to": 0.11, "label": "Lower", "tone": "good"},
            {"from": 0.11, "to": 0.21, "label": "Intermediate", "tone": "warn"},
            {"from": 0.21, "to": 1.0, "label": "Higher", "tone": "bad"},
        ]},
    "CASTELLI_I": {"name": "Castelli Risk Index I (TC/HDL-C)", "unit": "ratio", "min": 2, "max": 8, "source": SPEC_SOURCE + " (supplementary; shown using the men's cut-off — women's cut-offs are slightly lower)",
        "bands": [
            {"from": 2, "to": 4.0, "label": "Desirable", "tone": "good"},
            {"from": 4.0, "to": 5.0, "label": "Borderline", "tone": "warn"},
            {"from": 5.0, "to": 8, "label": "Higher", "tone": "bad"},
        ]},
    "CASTELLI_II": {"name": "Castelli Risk Index II (LDL/HDL-C)", "unit": "ratio", "min": 1, "max": 6, "source": SPEC_SOURCE + " (supplementary; shown using the men's cut-off)",
        "bands": [
            {"from": 1, "to": 3.0, "label": "Desirable", "tone": "good"},
            {"from": 3.0, "to": 6, "label": "Higher", "tone": "warn"},
        ]},
    "FRS_RISK": {"name": "Framingham 10-year CVD risk", "unit": "%", "min": 0, "max": 40, "source": SPEC_SOURCE,
        "bands": [
            {"from": 0, "to": 10, "label": "Low", "tone": "good"},
            {"from": 10, "to": 20, "label": "Intermediate", "tone": "warn"},
            {"from": 20, "to": 40, "label": "High", "tone": "bad"},
        ]},
}


def _bands_from_simple_range(code, margin_low=0.15, margin_high=0.3):
    """Derive a 3-4 zone band list from a SIMPLE_RANGES threshold dict, with
    tone semantics matching engines/rule_engine.py#classify_by_range exactly:
    only a severeLow/severeHigh breach is "bad"; every other deviation
    (mild-* or below/above the normal bounds) is "warn", since that engine
    maps both to the same tone. mildLow/mildHigh therefore only affect the
    *severity threshold*, not a separately-colored zone — a mild deviation
    and a below/above-range deviation render as one continuous warn region,
    which is the correct, non-misleading picture for a color scale."""
    r = SIMPLE_RANGES[code]
    vals = [v for k, v in r.items() if isinstance(v, (int, float))]
    lo = min(vals) * (1 - margin_low) if min(vals) > 0 else min(vals) - 1
    hi = max(vals) * (1 + margin_high)
    normal_low = r.get("normalLow")
    normal_high = r.get("normalHigh")
    severe_low = r.get("severeLow")
    severe_high = r.get("severeHigh")
    bands = []
    cur = lo
    if severe_low is not None:
        bands.append({"from": cur, "to": severe_low, "label": "Markedly below range", "tone": "bad"}); cur = severe_low
    if normal_low is not None:
        bands.append({"from": cur, "to": normal_low, "label": "Below range", "tone": "warn"}); cur = normal_low
    band_hi = normal_high if normal_high is not None else hi
    bands.append({"from": cur, "to": band_hi, "label": "Within range", "tone": "good"}); cur = band_hi
    if normal_high is not None:
        upper_end = severe_high if severe_high is not None else hi
        if upper_end > cur:
            bands.append({"from": cur, "to": upper_end, "label": "Above range", "tone": "warn"}); cur = upper_end
    if severe_high is not None and cur < hi:
        bands.append({"from": cur, "to": hi, "label": "Markedly above range", "tone": "bad"})
    meta = LAB_DICTIONARY.get(code, {})
    return {"name": meta.get("name", code), "unit": meta.get("unit", ""), "min": round(lo, 2), "max": round(hi, 2), "bands": bands, "source": r["source"]}


ILLUSTRATIVE_CODES = ["LAB_GLU_FAST", "LAB_HBA1C", "LAB_ALT", "LAB_AST", "LAB_CREAT", "LAB_EGFR", "LAB_HB", "LAB_WBC", "LAB_PLT"]
ILLUSTRATIVE_SCALES = {code: _bands_from_simple_range(code) for code in ILLUSTRATIVE_CODES}

ANTHRO_SCALES = {
    "BMI": {"name": "Body Mass Index", "unit": "kg/m²", "min": 12, "max": 45,
            "source": "General illustrative BMI bands (WHO Asian-population cut-offs)",
            "bands": [
                {"from": 12, "to": 18.5, "label": "Underweight", "tone": "warn"},
                {"from": 18.5, "to": 23, "label": "Normal", "tone": "good"},
                {"from": 23, "to": 27.5, "label": "Overweight", "tone": "warn"},
                {"from": 27.5, "to": 45, "label": "Obese", "tone": "bad"},
            ]},
    "WAIST_M": {"name": "Waist circumference (male)", "unit": "cm", "min": 60, "max": 130,
                "source": "Asian population cut-off referenced in the Cardiovascular Domain Specification's metabolic-syndrome criterion",
                "bands": [{"from": 60, "to": 90, "label": "Within cut-off", "tone": "good"}, {"from": 90, "to": 130, "label": "Above cut-off (central obesity)", "tone": "bad"}]},
    "WAIST_F": {"name": "Waist circumference (female)", "unit": "cm", "min": 50, "max": 120,
                "source": "Asian population cut-off referenced in the Cardiovascular Domain Specification's metabolic-syndrome criterion",
                "bands": [{"from": 50, "to": 80, "label": "Within cut-off", "tone": "good"}, {"from": 80, "to": 120, "label": "Above cut-off (central obesity)", "tone": "bad"}]},
}


def get_all_scales():
    """Full registry keyed by quantity code, for the /api/reference-scales endpoint."""
    out = {}
    out.update(CARDIO_SCALES)
    out.update(ILLUSTRATIVE_SCALES)
    out.update(ANTHRO_SCALES)
    return out
