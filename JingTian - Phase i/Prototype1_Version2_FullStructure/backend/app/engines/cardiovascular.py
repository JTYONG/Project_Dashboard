"""EVA SQUARE — Cardiovascular Domain engine. Direct, function-for-function
Python port of the frontend-v2 js/engine/cardiovascular.js — see that
file's header comment for the full rationale (this is the one domain
implemented against a real source document, the Cardiovascular Domain
Specification; CV-01 through CV-14 calculator register; prohibited-claims
list; unit conventions). Nothing here should ever diverge in behavior from
the JS version — if you change a threshold, change it in both places (or,
in a deployed version, delete the JS engine entirely and have the frontend
call this API exclusively, which is exactly what this FullStructure build
already does).
"""
import math
import datetime as dt

SOURCE = ("Cardiovascular Domain Specification — MOH Malaysia Hypertension 5th ed. 2018; "
          "D'Agostino RB Sr et al., Framingham General CVD, Circulation 2008;117:743-753; "
          "ESC/EAS Dyslipidaemia guidelines.")

EMERGENCY_SYMPTOMS = [
    "Chest pain", "Severe breathlessness", "Sudden weakness", "Facial droop",
    "Speech difficulty", "Confusion", "Severe headache", "Blurred vision", "Collapse",
]

# ---------------------------------------------------------------------
# CV-01 Blood pressure classification (MOH Malaysia Hypertension CPG, 5th ed. 2018)
# ---------------------------------------------------------------------
_BP_BANDS = [
    ("optimal", "Optimal", 1, "good", lambda s, d: s < 120 and d < 80, "Within the optimal range."),
    ("normal", "Normal", 2, "good", lambda s, d: 120 <= s <= 129 and 80 <= d <= 84, "Within the normal range."),
    ("atrisk", "At-risk / high-normal", 3, "warn", lambda s, d: (130 <= s <= 139) or (85 <= d <= 89), "Above optimal — worth monitoring."),
    ("grade1", "Grade 1 Hypertension", 4, "warn", lambda s, d: (140 <= s <= 159) or (90 <= d <= 99), "Raised — confirmation with repeat readings is recommended."),
    ("grade2", "Grade 2 Hypertension", 5, "bad", lambda s, d: (160 <= s <= 179) or (100 <= d <= 109), "High — prompt clinical review is recommended."),
    ("grade3", "Grade 3 Hypertension", 6, "bad", lambda s, d: s >= 180 or d >= 110, "Very high — urgent assessment is recommended."),
]


def classify_bp(sbp, dbp):
    if sbp is None or dbp is None:
        return None
    if sbp >= 140 and dbp < 90:
        return {"id": "isolated-systolic", "label": "Isolated Systolic Hypertension", "rank": 4, "tone": "warn",
                "note": "Systolic pressure raised with a normal diastolic pressure.", "sbp": sbp, "dbp": dbp, "source": SOURCE}
    for bid, label, rank, tone, test, note in _BP_BANDS:
        if test(sbp, dbp):
            return {"id": bid, "label": label, "rank": rank, "tone": tone, "note": note, "sbp": sbp, "dbp": dbp, "source": SOURCE}
    return {"id": "grade3", "label": "Grade 3 Hypertension", "rank": 6, "tone": "bad",
            "note": "Very high — urgent assessment is recommended.", "sbp": sbp, "dbp": dbp, "source": SOURCE}


def bp_escalation(sbp, dbp, symptoms_now):
    symptoms = symptoms_now or []
    has_emergency_symptom = any(s in EMERGENCY_SYMPTOMS for s in symptoms)
    if sbp is not None and dbp is not None and (sbp >= 180 or dbp >= 120):
        if has_emergency_symptom:
            return {"urgency": "emergency", "reason": "Blood pressure ≥180/120 mmHg with symptoms that may indicate a medical emergency.",
                    "action": "Advise immediate emergency services / emergency department. Stop routine risk scoring."}
        return {"urgency": "urgent", "reason": "Blood pressure ≥180/120 mmHg without reported symptoms.",
                "action": "Repeat the reading correctly and arrange urgent, same-day clinical review."}
    if has_emergency_symptom:
        return {"urgency": "emergency", "reason": "Reported symptoms may indicate a medical emergency, independent of the blood pressure reading.",
                "action": "Advise immediate emergency services / emergency department."}
    return None


# ---------------------------------------------------------------------
# CV-02 Framingham General CVD Risk Score (D'Agostino 2008, sex-specific)
# ---------------------------------------------------------------------
MMOL_TO_MGDL_CHOL = 38.67

_FRS_COEF = {
    "M": {"age": 3.06117, "tc": 1.12370, "hdl": -0.93263, "sbpU": 1.93303, "sbpT": 1.99881, "smoker": 0.65451, "diabetes": 0.57367, "mean": 23.9802, "s0": 0.88431},
    "F": {"age": 2.32888, "tc": 1.20904, "hdl": -0.70833, "sbpU": 2.76157, "sbpT": 2.82263, "smoker": 0.52873, "diabetes": 0.69154, "mean": 26.1931, "s0": 0.94833},
}


def _framingham_eligibility(ctx):
    reasons = []
    if ctx.get("hasEstablishedCVD"):
        reasons.append("Established cardiovascular disease — routed to secondary-prevention pathway instead of a fresh 10-year estimate.")
    if ctx.get("pregnancyStatus") in ("Pregnant", "Postpartum"):
        reasons.append("Pregnancy / postpartum — outside the model's validated population.")
    age = ctx.get("age")
    if age is None or age < 30 or age > 74:
        reasons.append("Age outside the model's validated range (30–74 years).")
    if ctx.get("sex") not in ("M", "F"):
        reasons.append("Sex not specified.")
    if ctx.get("tc") is None or ctx.get("hdl") is None:
        reasons.append("Total cholesterol and/or HDL-cholesterol missing, or not from the same sample.")
    if ctx.get("sbp") is None:
        reasons.append("Blood pressure missing.")
    if ctx.get("smoker") is None:
        reasons.append("Smoking status not confirmed.")
    if ctx.get("diabetes") is None:
        reasons.append("Diabetes status not confirmed.")
    if ctx.get("acuteSymptoms"):
        reasons.append("Acute symptoms reported — routine risk scoring is paused pending safety review.")
    return {"eligible": len(reasons) == 0, "reasons": reasons}


def framingham_risk(ctx):
    elig = _framingham_eligibility(ctx)
    if not elig["eligible"]:
        return {"eligible": False, "reasons": elig["reasons"], "source": SOURCE}
    c = _FRS_COEF[ctx["sex"]]
    tc_mgdl = ctx["tc"] * MMOL_TO_MGDL_CHOL
    hdl_mgdl = ctx["hdl"] * MMOL_TO_MGDL_CHOL
    sbp_coef = c["sbpT"] if ctx.get("treated") else c["sbpU"]
    L = (c["age"] * math.log(ctx["age"]) + c["tc"] * math.log(tc_mgdl) + c["hdl"] * math.log(hdl_mgdl)
         + sbp_coef * math.log(ctx["sbp"]) + c["smoker"] * (1 if ctx.get("smoker") else 0)
         + c["diabetes"] * (1 if ctx.get("diabetes") else 0))
    risk_fraction = 1 - (c["s0"] ** math.exp(L - c["mean"]))
    risk_percent = max(0.1, min(99, risk_fraction * 100))

    if risk_percent < 10:
        band, tone, note = "Low", "good", "Below 10% — lower estimated 10-year risk."
    elif risk_percent < 20:
        band, tone, note = "Intermediate", "warn", "10–19.9% — intermediate estimated 10-year risk."
    else:
        band, tone, note = "High", "bad", "20% or higher — high estimated 10-year risk. Clinician review is recommended."

    return {
        "eligible": True, "riskPercent": round(risk_percent, 1), "band": band, "tone": tone, "note": note,
        "inputs": {"age": ctx["age"], "sex": ctx["sex"], "tcMgdl": round(tc_mgdl), "hdlMgdl": round(hdl_mgdl),
                   "sbp": ctx["sbp"], "treated": bool(ctx.get("treated")), "smoker": bool(ctx.get("smoker")), "diabetes": bool(ctx.get("diabetes"))},
        "caution": "This is a population-based estimate, not a prediction for a specific individual. CKD, very high LDL-C, familial hypercholesterolaemia and high Lp(a) can push true risk above this percentage.",
        "source": SOURCE,
    }


# ---------------------------------------------------------------------
# CV-03 / CV-04 Non-HDL-C and calculated (Friedewald) LDL-C
# ---------------------------------------------------------------------
def non_hdl(tc, hdl):
    if tc is None or hdl is None:
        return None
    return round((tc - hdl) * 10) / 10


def calculated_ldl(tc, hdl, tg):
    if tc is None or hdl is None or tg is None:
        return {"value": None, "valid": False, "reason": "One or more of TC, HDL-C, TG is missing."}
    if tg >= 4.5:
        return {"value": None, "valid": False, "reason": "Friedewald calculation is not valid when triglycerides are ≥4.5 mmol/L. A direct LDL-C measurement is required."}
    ldl = tc - hdl - tg / 2.2
    return {"value": round(ldl * 10) / 10, "valid": True, "label": "Calculated LDL-C (Friedewald)", "source": SOURCE}


# ---------------------------------------------------------------------
# CV-05 Atherogenic Index of Plasma (supplementary only)
# ---------------------------------------------------------------------
def aip(tg, hdl):
    if tg is None or hdl is None or tg <= 0 or hdl <= 0:
        return None
    value = math.log10(tg / hdl)
    if value < 0.11:
        band, tone = "Lower", "good"
    elif value <= 0.21:
        band, tone = "Intermediate", "warn"
    else:
        band, tone = "Higher", "bad"
    return {"value": round(value, 2), "band": band, "tone": tone, "status": "Supplementary",
            "note": "A supplementary index — it does not override LDL-C, non-HDL-C, ApoB, Lp(a) or your overall risk score.", "source": SOURCE}


# ---------------------------------------------------------------------
# CV-06 / CV-07 / CV-08 Castelli I & II, Atherogenic coefficient
# ---------------------------------------------------------------------
def castelli_i(tc, hdl, sex):
    if tc is None or hdl is None or hdl <= 0:
        return None
    value = round((tc / hdl) * 100) / 100
    desirable = 3.5 if sex == "F" else 4.0
    higher = 4.5 if sex == "F" else 5.0
    if value < desirable:
        band, tone = "Desirable", "good"
    elif value <= higher:
        band, tone = "Borderline", "warn"
    else:
        band, tone = "Higher", "bad"
    return {"value": value, "band": band, "tone": tone, "status": "Supplementary", "source": SOURCE}


def castelli_ii(ldl, hdl, sex, ldl_valid):
    if ldl is None or hdl is None or hdl <= 0 or ldl_valid is False:
        return None
    value = round((ldl / hdl) * 100) / 100
    desirable = 2.5 if sex == "F" else 3.0
    if value < desirable:
        band, tone = "Desirable", "good"
    else:
        band, tone = "Higher", "warn"
    return {"value": value, "band": band, "tone": tone, "status": "Supplementary", "source": SOURCE}


def atherogenic_coefficient(tc, hdl):
    if tc is None or hdl is None or hdl <= 0:
        return None
    return round(((tc - hdl) / hdl) * 100) / 100


# ---------------------------------------------------------------------
# CV-09 ApoB risk-linked goal
# ---------------------------------------------------------------------
def apo_b_goal(risk_band, secondary_prevention):
    if secondary_prevention:
        return {"target": 65, "label": "Very-high risk (established disease)"}
    if risk_band == "High":
        return {"target": 80, "label": "High risk"}
    if risk_band == "Intermediate":
        return {"target": 100, "label": "Moderate risk"}
    return {"target": 100, "label": "Moderate risk (default goal pending full risk assessment)"}


def apo_b_assessment(apob, risk_band, secondary_prevention):
    if apob is None:
        return None
    goal = apo_b_goal(risk_band, secondary_prevention)
    above_goal = apob > goal["target"]
    return {"value": apob, "unit": "mg/dL", "target": goal["target"], "goalLabel": goal["label"],
            "aboveGoal": above_goal, "status": "Advanced core", "source": SOURCE}


def apo_ratio(apob, apoa1):
    if apob is None or apoa1 is None or apoa1 <= 0:
        return None
    return {"value": round((apob / apoa1) * 100) / 100, "status": "Supplementary",
            "note": "Lower is more favourable. No single universal cut-off — read alongside the lab's own interpretation.", "source": SOURCE}


# ---------------------------------------------------------------------
# CV-11 Lp(a) — dual-unit bands, never cross-converted
# ---------------------------------------------------------------------
def lpa_band(value, unit="nmol/L"):
    if value is None:
        return None
    if unit == "nmol/L":
        if value < 75:
            band, tone = "Lower", "good"
        elif value < 125:
            band, tone = "Intermediate", "warn"
        else:
            band, tone = "Elevated / risk-enhancing", "bad"
    else:
        if value < 30:
            band, tone = "Lower", "good"
        elif value < 50:
            band, tone = "Intermediate", "warn"
        else:
            band, tone = "Elevated / risk-enhancing", "bad"
    return {"value": value, "unit": unit, "band": band, "tone": tone, "status": "Advanced core",
            "note": "Reported in its own native unit — Lp(a) mass and molar units are not interconverted with a fixed factor.", "source": SOURCE}


# ---------------------------------------------------------------------
# CV-12 Metabolic syndrome — any 3 of 5
# ---------------------------------------------------------------------
def metabolic_syndrome(inp):
    criteria = []
    known = 0
    met = 0
    missing = False

    def add(cid, label, value, ok):
        nonlocal known, met, missing
        if value is None:
            criteria.append({"id": cid, "label": label, "status": "unknown"})
            missing = True
            return
        known += 1
        if ok:
            met += 1
        criteria.append({"id": cid, "label": label, "status": "met" if ok else "not-met"})

    waist = inp.get("waist")
    sex = inp.get("sex")
    add("waist", "Central obesity (waist)", waist,
        waist is not None and ((sex == "M" and waist >= 90) or (sex == "F" and waist >= 80)))
    tg = inp.get("tg")
    add("tg", "Triglycerides ≥1.7 mmol/L or treated", tg, tg is not None and (tg >= 1.7 or inp.get("tgTreated")))
    hdl = inp.get("hdl")
    add("hdl", "Low HDL-C or treated", hdl,
        hdl is not None and ((sex == "M" and hdl < 1.0) or (sex == "F" and hdl < 1.3) or inp.get("hdlTreated")))
    sbp, dbp = inp.get("sbp"), inp.get("dbp")
    bp_met = (sbp is not None and dbp is not None and (sbp >= 130 or dbp >= 85)) or bool(inp.get("bpTreated"))
    add("bp", "Blood pressure ≥130/85 or treated", sbp, bp_met)
    glucose = inp.get("glucose")
    add("glucose", "Fasting glucose ≥5.6 mmol/L or known diabetes", glucose,
        (glucose is not None and glucose >= 5.6) or bool(inp.get("diabetes")))

    return {
        "criteriaMet": met, "criteriaKnown": known, "criteria": criteria, "positive": met >= 3,
        "indeterminate": (met < 3) and missing,
        "note": "One or more components could not be fully determined — this result cannot be fully confirmed either way." if (missing and met < 3) else None,
        "source": SOURCE,
    }


# ---------------------------------------------------------------------
# CV-13 "Possible FH" referral trigger — never an auto-diagnosis
# ---------------------------------------------------------------------
def fh_trigger(ldl, family_history_premature_cvd, xanthomata):
    flags = []
    if ldl is not None and ldl >= 4.9:
        flags.append("Markedly elevated LDL-cholesterol (≥4.9 mmol/L on this sample).")
    if family_history_premature_cvd == "Yes":
        flags.append("Family history of premature cardiovascular disease.")
    if xanthomata:
        flags.append("Reported tendon xanthomata.")
    return {"triggered": len(flags) > 0, "flags": flags,
            "note": "A single lipid value does not diagnose familial hypercholesterolaemia. This flag routes to clinical assessment; it is not a diagnosis.", "source": SOURCE}


# ---------------------------------------------------------------------
# CV-14 Triglyceride safety tiers
# ---------------------------------------------------------------------
def tg_safety(tg):
    if tg is None:
        return None
    if tg >= 10:
        return {"tier": "severe", "tone": "bad", "urgency": "urgent", "note": "Severely elevated — urgent clinical assessment is recommended (pancreatitis risk)."}
    if tg >= 4.5:
        return {"tier": "high", "tone": "bad", "urgency": "prompt", "note": "Elevated enough that calculated LDL-C is not valid — prompt clinical review is recommended."}
    if tg >= 1.7:
        return {"tier": "raised", "tone": "warn", "urgency": "routine", "note": "Raised — consider assessment for metabolic or secondary causes."}
    return {"tier": "desirable", "tone": "good", "urgency": "none", "note": "Within the desirable range."}


# ---------------------------------------------------------------------
# Lipid discordance interpretation (spec's worked-example table)
# ---------------------------------------------------------------------
def discordance(ldl, apob_assessment, tg_safety_result, hdl, aip_result, lpa_result):
    notes = []
    if ldl is not None and ldl < 3.4 and apob_assessment and apob_assessment["aboveGoal"]:
        notes.append({"id": "ldl-apob", "title": "Balanced lipid explanation",
                      "text": "Your LDL-cholesterol is within the stated laboratory range, but ApoB is above the goal associated with your risk category. This means the number of cholesterol-carrying particles may be higher than LDL-cholesterol alone suggests. Any supplementary ratios support the same overall pattern but are not treatment targets on their own."})
    elif ldl is not None and ldl >= 3.4 and apob_assessment and not apob_assessment["aboveGoal"]:
        notes.append({"id": "ldl-high-apob-lower", "title": "LDL-cholesterol remains meaningful",
                      "text": "LDL-cholesterol is above range even though ApoB is closer to goal. LDL-cholesterol should not be dismissed — both are shown together rather than one overriding the other."})
    if (tg_safety_result and tg_safety_result["tier"] in ("raised", "high") and hdl is not None and hdl < 1.0
            and aip_result and aip_result["band"] != "Lower"):
        notes.append({"id": "atherogenic-pattern", "title": "Atherogenic / metabolic pattern",
                      "text": "Raised triglycerides together with lower HDL-cholesterol and a higher supplementary index suggest an atherogenic metabolic pattern. Checking glucose, waist circumference and blood pressure together with this result is recommended."})
    if ldl is not None and ldl < 3.4 and lpa_result and lpa_result["band"] == "Elevated / risk-enhancing":
        notes.append({"id": "lpa-modifier", "title": "Inherited risk modifier",
                      "text": "LDL-cholesterol is controlled, but Lp(a) is elevated. Lp(a) is largely inherited and adds residual risk on top of a controlled LDL-cholesterol — this profile should not be read as fully reassuring on its own."})
    return notes


# ---------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------
def analyze(profile, labs, questionnaire):
    q = questionnaire or {}
    sex = profile.get("sex")
    age = profile.get("age")

    bp = q.get("recentBP") or profile.get("homeBP") or {}
    home_bp = profile.get("homeBP") or {}
    sbp = bp.get("sbp") if bp.get("sbp") is not None else home_bp.get("sbp")
    dbp = bp.get("dbp") if bp.get("dbp") is not None else home_bp.get("dbp")
    treated = q.get("bpMedication") == "Yes" or home_bp.get("treated") or False
    smoker = q.get("smokingStatus") == "Current smoker"
    diabetes = q.get("diagnosedDiabetes") == "Yes"
    symptoms_now = q.get("symptomsNow") or []

    bp_class = classify_bp(sbp, dbp)
    escalation = bp_escalation(sbp, dbp, symptoms_now)

    frs = framingham_risk({
        "age": age, "sex": sex, "tc": labs.get("LAB_TC"), "hdl": labs.get("LAB_HDL"), "sbp": sbp, "treated": treated,
        "smoker": smoker, "diabetes": diabetes, "hasEstablishedCVD": bool(q.get("establishedCVD")),
        "pregnancyStatus": q.get("pregnancyStatus"), "acuteSymptoms": bool(escalation),
    })

    non_hdl_v = non_hdl(labs.get("LAB_TC"), labs.get("LAB_HDL"))
    ldl_calc = calculated_ldl(labs.get("LAB_TC"), labs.get("LAB_HDL"), labs.get("LAB_TG"))
    ldl_value = labs.get("LAB_LDL") if labs.get("LAB_LDL") is not None else ldl_calc["value"]
    ldl_is_measured = labs.get("LAB_LDL") is not None

    aip_result = aip(labs.get("LAB_TG"), labs.get("LAB_HDL"))
    c1 = castelli_i(labs.get("LAB_TC"), labs.get("LAB_HDL"), sex)
    c2 = castelli_ii(ldl_value, labs.get("LAB_HDL"), sex, True if ldl_is_measured else ldl_calc["valid"])
    ac = atherogenic_coefficient(labs.get("LAB_TC"), labs.get("LAB_HDL"))

    risk_band = frs["band"] if frs["eligible"] else "Intermediate"
    apob = apo_b_assessment(labs.get("LAB_APOB"), risk_band, bool(q.get("establishedCVD")))
    apo_ratio_result = apo_ratio(labs.get("LAB_APOB"), labs.get("LAB_APOA1"))
    lpa = lpa_band(labs.get("LAB_LPA"), "nmol/L")

    met_syn = metabolic_syndrome({
        "sex": sex, "waist": profile.get("waist"), "tg": labs.get("LAB_TG"), "hdl": labs.get("LAB_HDL"),
        "sbp": sbp, "dbp": dbp, "bpTreated": treated, "glucose": labs.get("LAB_GLU_FAST"), "diabetes": diabetes,
    })

    fh = fh_trigger(ldl_value, q.get("familyHistoryPrematureCVD"), bool(q.get("tendonXanthomata")))
    tg_safety_result = tg_safety(labs.get("LAB_TG"))
    discordance_notes = discordance(ldl_value, apob, tg_safety_result, labs.get("LAB_HDL"), aip_result, lpa)

    urgency_order = ["emergency", "urgent", "prompt", "routine"]
    urgency = "routine"
    urgency_reasons = []

    def raise_(level, reason):
        nonlocal urgency
        if not level:
            return
        urgency_reasons.append({"level": level, "reason": reason})
        if urgency_order.index(level) < urgency_order.index(urgency):
            urgency = level

    if escalation:
        raise_(escalation["urgency"], escalation["reason"])
    if tg_safety_result and tg_safety_result.get("urgency") and tg_safety_result["urgency"] != "none":
        raise_(tg_safety_result["urgency"], f"Triglycerides {tg_safety_result['tier']} ({labs.get('LAB_TG')} mmol/L).")
    if fh["triggered"]:
        raise_("prompt", "Possible familial hypercholesterolaemia pathway triggered.")
    if frs["eligible"] and frs["band"] == "High":
        raise_("prompt", "High 10-year cardiovascular risk score.")
    if lpa and lpa["band"] == "Elevated / risk-enhancing":
        raise_("routine", "Elevated Lp(a) — risk modifier, clinician CV-risk review suggested.")
    if apob and apob["aboveGoal"]:
        raise_("routine", "ApoB above the goal linked to your risk category.")

    bp_category_rank = bp_class["rank"] if bp_class else None

    return {
        "generatedAt": dt.datetime.utcnow().isoformat(),
        "source": SOURCE, "status": "real",
        "inputs": {"sbp": sbp, "dbp": dbp, "treated": treated, "smoker": smoker, "diabetes": diabetes, "age": age, "sex": sex},
        "safety": {"emergencySymptoms": [s for s in symptoms_now if s in EMERGENCY_SYMPTOMS], "escalation": escalation},
        "bp": bp_class,
        "framingham": frs,
        "lipids": {"tc": labs.get("LAB_TC"), "hdl": labs.get("LAB_HDL"), "tg": labs.get("LAB_TG"),
                   "ldl": {"value": ldl_value, "measured": ldl_is_measured, "calc": ldl_calc}, "nonHdl": non_hdl_v},
        "supplementary": {"aip": aip_result, "castelliI": c1, "castelliII": c2, "atherogenicCoefficient": ac},
        "advanced": {"apoB": apob, "apoRatio": apo_ratio_result, "lpa": lpa},
        "metabolicSyndrome": met_syn, "fh": fh, "tgSafety": tg_safety_result,
        "discordanceNotes": discordance_notes, "urgency": urgency, "urgencyReasons": urgency_reasons,
        "summary": {
            "bpCategoryRank": bp_category_rank, "bpCategory": bp_class["label"] if bp_class else None,
            "ldl": ldl_value, "nonHdl": non_hdl_v, "tg": labs.get("LAB_TG"),
            "apobFlag": bool(apob and apob["aboveGoal"]), "lpaFlag": bool(lpa and lpa["band"] == "Elevated / risk-enhancing"),
            "fhFlag": fh["triggered"], "frsBand": frs["band"] if frs["eligible"] else None, "urgency": urgency,
        },
    }
