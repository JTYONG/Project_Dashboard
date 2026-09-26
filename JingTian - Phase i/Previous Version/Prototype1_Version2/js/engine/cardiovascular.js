/* SQUARE — Cardiovascular Domain engine.
 *
 * This is the ONE domain in this prototype implemented against a real
 * source document: Content/Cardiovascular Domain Specification.pdf.
 * Every threshold, formula and escalation rule below is traceable to that
 * document (calculator register CV-01 through CV-14). Nothing here is
 * invented — where the spec leaves a decision to a clinician (e.g. exact
 * FH diagnosis, medication changes), this engine stops at "flag for
 * review" and does not go further. See README.md §"What's real vs
 * illustrative" for the domain-by-domain breakdown.
 *
 * Units in flow through this module:
 *   TC, LDL-C, HDL-C, TG      -> mmol/L  (matches labDictionary.js)
 *   ApoB, ApoA-I              -> mg/dL
 *   Lp(a)                     -> nmol/L (native unit; mg/dL supported, never
 *                                        cross-converted — spec explicitly
 *                                        forbids a fixed conversion factor)
 *   BP                        -> mmHg
 *
 * Prohibited claims (spec, verbatim intent) are never emitted by this
 * module: no "blocked arteries" from AIP/Castelli, no "no cardiovascular
 * risk" from a single normal value, no FH diagnosis from one LDL-C value,
 * no "your heart is healthy" from normal lipids, no medication directives.
 */
window.SQ = window.SQ || {};
SQ.engines = SQ.engines || {};

(function () {
  "use strict";

  const SOURCE = "Cardiovascular Domain Specification — MOH Malaysia Hypertension 5th ed. 2018; " +
    "D'Agostino RB Sr et al., Framingham General CVD, Circulation 2008;117:743-753; ESC/EAS Dyslipidaemia guidelines.";

  const EMERGENCY_SYMPTOMS = [
    "Chest pain", "Severe breathlessness", "Sudden weakness", "Facial droop",
    "Speech difficulty", "Confusion", "Severe headache", "Blurred vision", "Collapse",
  ];

  // ---------------------------------------------------------------------
  // CV-01  Blood pressure classification
  // Source: MOH Malaysia Clinical Practice Guidelines — Hypertension, 5th ed. 2018.
  // ---------------------------------------------------------------------
  const BP_BANDS = [
    { id: "optimal",  label: "Optimal",                 rank: 1, tone: "good", test: (s, d) => s < 120 && d < 80,
      note: "Within the optimal range." },
    { id: "normal",   label: "Normal",                  rank: 2, tone: "good", test: (s, d) => s >= 120 && s <= 129 && d >= 80 && d <= 84,
      note: "Within the normal range." },
    { id: "atrisk",   label: "At-risk / high-normal",   rank: 3, tone: "warn", test: (s, d) => (s >= 130 && s <= 139) || (d >= 85 && d <= 89),
      note: "Above optimal — worth monitoring." },
    { id: "grade1",   label: "Grade 1 Hypertension",    rank: 4, tone: "warn", test: (s, d) => (s >= 140 && s <= 159) || (d >= 90 && d <= 99),
      note: "Raised — confirmation with repeat readings is recommended." },
    { id: "grade2",   label: "Grade 2 Hypertension",    rank: 5, tone: "bad",  test: (s, d) => (s >= 160 && s <= 179) || (d >= 100 && d <= 109),
      note: "High — prompt clinical review is recommended." },
    { id: "grade3",   label: "Grade 3 Hypertension",    rank: 6, tone: "bad",  test: (s, d) => s >= 180 || d >= 110,
      note: "Very high — urgent assessment is recommended." },
  ];

  function classifyBP(sbp, dbp) {
    if (sbp == null || dbp == null) return null;
    // Isolated systolic hypertension is called out separately per spec.
    if (sbp >= 140 && dbp < 90) {
      return { id: "isolated-systolic", label: "Isolated Systolic Hypertension", rank: 4, tone: "warn",
        note: "Systolic pressure raised with a normal diastolic pressure.", sbp, dbp, source: SOURCE };
    }
    for (const band of BP_BANDS) {
      if (band.test(sbp, dbp)) {
        return { id: band.id, label: band.label, rank: band.rank, tone: band.tone, note: band.note, sbp, dbp, source: SOURCE };
      }
    }
    return { id: "grade3", label: "Grade 3 Hypertension", rank: 6, tone: "bad", note: "Very high — urgent assessment is recommended.", sbp, dbp, source: SOURCE };
  }

  // BP / symptom escalation — the safety layer sits above every other calculator.
  function bpEscalation(sbp, dbp, symptomsNow) {
    const symptoms = Array.isArray(symptomsNow) ? symptomsNow : [];
    const hasEmergencySymptom = symptoms.some((s) => EMERGENCY_SYMPTOMS.includes(s));
    if (sbp >= 180 || dbp >= 120) {
      if (hasEmergencySymptom) {
        return { urgency: "emergency", reason: "Blood pressure ≥180/120 mmHg with symptoms that may indicate a medical emergency.",
          action: "Advise immediate emergency services / emergency department. Stop routine risk scoring." };
      }
      return { urgency: "urgent", reason: "Blood pressure ≥180/120 mmHg without reported symptoms.",
        action: "Repeat the reading correctly and arrange urgent, same-day clinical review." };
    }
    if (hasEmergencySymptom) {
      return { urgency: "emergency", reason: "Reported symptoms may indicate a medical emergency, independent of the blood pressure reading.",
        action: "Advise immediate emergency services / emergency department." };
    }
    return null;
  }

  // ---------------------------------------------------------------------
  // CV-02  Framingham General CVD Risk Score (D'Agostino 2008, sex-specific,
  // "general" model — not the older coronary-only model). Coefficients are
  // fit on cholesterol in mg/dL, so TC/HDL are converted internally.
  // ---------------------------------------------------------------------
  const MMOL_TO_MGDL_CHOL = 38.67;

  const FRS_COEF = {
    M: { age: 3.06117, tc: 1.12370, hdl: -0.93263, sbpU: 1.93303, sbpT: 1.99881, smoker: 0.65451, diabetes: 0.57367, mean: 23.9802, s0: 0.88431 },
    F: { age: 2.32888, tc: 1.20904, hdl: -0.70833, sbpU: 2.76157, sbpT: 2.82263, smoker: 0.52873, diabetes: 0.69154, mean: 26.1931, s0: 0.94833 },
  };

  function framinghamEligibility(ctx) {
    const reasons = [];
    if (ctx.hasEstablishedCVD) reasons.push("Established cardiovascular disease — routed to secondary-prevention pathway instead of a fresh 10-year estimate.");
    if (ctx.pregnancyStatus === "Pregnant" || ctx.pregnancyStatus === "Postpartum") reasons.push("Pregnancy / postpartum — outside the model's validated population.");
    if (ctx.age == null || ctx.age < 30 || ctx.age > 74) reasons.push("Age outside the model's validated range (30–74 years).");
    if (ctx.sex !== "M" && ctx.sex !== "F") reasons.push("Sex not specified.");
    if (ctx.tc == null || ctx.hdl == null) reasons.push("Total cholesterol and/or HDL-cholesterol missing, or not from the same sample.");
    if (ctx.sbp == null) reasons.push("Blood pressure missing.");
    if (ctx.smoker == null) reasons.push("Smoking status not confirmed.");
    if (ctx.diabetes == null) reasons.push("Diabetes status not confirmed.");
    if (ctx.acuteSymptoms) reasons.push("Acute symptoms reported — routine risk scoring is paused pending safety review.");
    return { eligible: reasons.length === 0, reasons };
  }

  function framinghamRisk(ctx) {
    const elig = framinghamEligibility(ctx);
    if (!elig.eligible) {
      return { eligible: false, reasons: elig.reasons, source: SOURCE };
    }
    const c = FRS_COEF[ctx.sex];
    const tcMgdl = ctx.tc * MMOL_TO_MGDL_CHOL;
    const hdlMgdl = ctx.hdl * MMOL_TO_MGDL_CHOL;
    const sbpCoef = ctx.treated ? c.sbpT : c.sbpU;
    const L =
      c.age * Math.log(ctx.age) +
      c.tc * Math.log(tcMgdl) +
      c.hdl * Math.log(hdlMgdl) +
      sbpCoef * Math.log(ctx.sbp) +
      c.smoker * (ctx.smoker ? 1 : 0) +
      c.diabetes * (ctx.diabetes ? 1 : 0);
    const riskFraction = 1 - Math.pow(c.s0, Math.exp(L - c.mean));
    const riskPercent = Math.max(0.1, Math.min(99, riskFraction * 100));

    let band, tone, note;
    if (riskPercent < 10) { band = "Low"; tone = "good"; note = "Below 10% — lower estimated 10-year risk."; }
    else if (riskPercent < 20) { band = "Intermediate"; tone = "warn"; note = "10–19.9% — intermediate estimated 10-year risk."; }
    else { band = "High"; tone = "bad"; note = "20% or higher — high estimated 10-year risk. Clinician review is recommended."; }

    return {
      eligible: true, riskPercent: Math.round(riskPercent * 10) / 10, band, tone, note,
      inputs: { age: ctx.age, sex: ctx.sex, tcMgdl: Math.round(tcMgdl), hdlMgdl: Math.round(hdlMgdl), sbp: ctx.sbp, treated: !!ctx.treated, smoker: !!ctx.smoker, diabetes: !!ctx.diabetes },
      caution: "This is a population-based estimate, not a prediction for a specific individual. CKD, very high LDL-C, familial hypercholesterolaemia and high Lp(a) can push true risk above this percentage.",
      source: SOURCE,
    };
  }

  // ---------------------------------------------------------------------
  // CV-03 / CV-04  Non-HDL-C and calculated (Friedewald) LDL-C
  // ---------------------------------------------------------------------
  function nonHDL(tc, hdl) {
    if (tc == null || hdl == null) return null;
    return Math.round((tc - hdl) * 10) / 10;
  }

  function calculatedLDL(tc, hdl, tg) {
    if (tc == null || hdl == null || tg == null) return { value: null, valid: false, reason: "One or more of TC, HDL-C, TG is missing." };
    if (tg >= 4.5) return { value: null, valid: false, reason: "Friedewald calculation is not valid when triglycerides are ≥4.5 mmol/L. A direct LDL-C measurement is required." };
    const ldl = tc - hdl - tg / 2.2;
    return { value: Math.round(ldl * 10) / 10, valid: true, label: "Calculated LDL-C (Friedewald)", source: SOURCE };
  }

  // ---------------------------------------------------------------------
  // CV-05  Atherogenic Index of Plasma (supplementary only)
  // ---------------------------------------------------------------------
  function aip(tg, hdl) {
    if (tg == null || hdl == null || tg <= 0 || hdl <= 0) return null;
    const value = Math.log10(tg / hdl);
    let band, tone;
    if (value < 0.11) { band = "Lower"; tone = "good"; }
    else if (value <= 0.21) { band = "Intermediate"; tone = "warn"; }
    else { band = "Higher"; tone = "bad"; }
    return { value: Math.round(value * 100) / 100, band, tone, status: "Supplementary", note: "A supplementary index — it does not override LDL-C, non-HDL-C, ApoB, Lp(a) or your overall risk score.", source: SOURCE };
  }

  // ---------------------------------------------------------------------
  // CV-06 / CV-07 / CV-08  Castelli I & II, Atherogenic coefficient
  // ---------------------------------------------------------------------
  function castelliI(tc, hdl, sex) {
    if (tc == null || hdl == null || hdl <= 0) return null;
    const value = Math.round((tc / hdl) * 100) / 100;
    const desirable = sex === "F" ? 3.5 : 4.0;
    const higher = sex === "F" ? 4.5 : 5.0;
    let band, tone;
    if (value < desirable) { band = "Desirable"; tone = "good"; }
    else if (value <= higher) { band = "Borderline"; tone = "warn"; }
    else { band = "Higher"; tone = "bad"; }
    return { value, band, tone, status: "Supplementary", source: SOURCE };
  }

  function castelliII(ldl, hdl, sex, ldlValid) {
    if (ldl == null || hdl == null || hdl <= 0 || ldlValid === false) return null;
    const value = Math.round((ldl / hdl) * 100) / 100;
    const desirable = sex === "F" ? 2.5 : 3.0;
    let band, tone;
    if (value < desirable) { band = "Desirable"; tone = "good"; }
    else { band = "Higher"; tone = "warn"; }
    return { value, band, tone, status: "Supplementary", source: SOURCE };
  }

  function atherogenicCoefficient(tc, hdl) {
    if (tc == null || hdl == null || hdl <= 0) return null;
    return Math.round(((tc - hdl) / hdl) * 100) / 100;
  }

  // ---------------------------------------------------------------------
  // CV-09  ApoB risk-linked goal
  // ---------------------------------------------------------------------
  function apoBGoal(riskBand, secondaryPrevention) {
    if (secondaryPrevention) return { target: 65, label: "Very-high risk (established disease)" };
    if (riskBand === "High") return { target: 80, label: "High risk" };
    if (riskBand === "Intermediate") return { target: 100, label: "Moderate risk" };
    return { target: 100, label: "Moderate risk (default goal pending full risk assessment)" };
  }

  function apoBAssessment(apob, riskBand, secondaryPrevention) {
    if (apob == null) return null;
    const goal = apoBGoal(riskBand, secondaryPrevention);
    const aboveGoal = apob > goal.target;
    return { value: apob, unit: "mg/dL", target: goal.target, goalLabel: goal.label, aboveGoal, status: "Advanced core", source: SOURCE };
  }

  function apoRatio(apob, apoa1) {
    if (apob == null || apoa1 == null || apoa1 <= 0) return null;
    return { value: Math.round((apob / apoa1) * 100) / 100, status: "Supplementary", note: "Lower is more favourable. No single universal cut-off — read alongside the lab's own interpretation.", source: SOURCE };
  }

  // ---------------------------------------------------------------------
  // CV-11  Lp(a) — dual-unit bands, never cross-converted
  // ---------------------------------------------------------------------
  function lpaBand(value, unit) {
    if (value == null) return null;
    unit = unit || "nmol/L";
    let band, tone;
    if (unit === "nmol/L") {
      if (value < 75) { band = "Lower"; tone = "good"; }
      else if (value < 125) { band = "Intermediate"; tone = "warn"; }
      else { band = "Elevated / risk-enhancing"; tone = "bad"; }
    } else {
      if (value < 30) { band = "Lower"; tone = "good"; }
      else if (value < 50) { band = "Intermediate"; tone = "warn"; }
      else { band = "Elevated / risk-enhancing"; tone = "bad"; }
    }
    return { value, unit, band, tone, status: "Advanced core", note: "Reported in its own native unit — Lp(a) mass and molar units are not interconverted with a fixed factor.", source: SOURCE };
  }

  // ---------------------------------------------------------------------
  // CV-12  Metabolic syndrome — any 3 of 5
  // ---------------------------------------------------------------------
  function metabolicSyndrome(input) {
    const criteria = [];
    let known = 0, met = 0, missing = false;

    function add(id, label, value, ok) {
      if (value === undefined || value === null) { criteria.push({ id, label, status: "unknown" }); missing = true; return; }
      known++; if (ok) met++;
      criteria.push({ id, label, status: ok ? "met" : "not-met" });
    }

    add("waist", "Central obesity (waist)", input.waist,
      input.waist != null && ((input.sex === "M" && input.waist >= 90) || (input.sex === "F" && input.waist >= 80)));
    add("tg", "Triglycerides ≥1.7 mmol/L or treated", input.tg,
      input.tg != null && (input.tg >= 1.7 || input.tgTreated));
    add("hdl", "Low HDL-C or treated", input.hdl,
      input.hdl != null && ((input.sex === "M" && input.hdl < 1.0) || (input.sex === "F" && input.hdl < 1.3) || input.hdlTreated));
    add("bp", "Blood pressure ≥130/85 or treated", input.sbp,
      (input.sbp != null && input.dbp != null && (input.sbp >= 130 || input.dbp >= 85)) || input.bpTreated);
    add("glucose", "Fasting glucose ≥5.6 mmol/L or known diabetes", input.glucose,
      (input.glucose != null && input.glucose >= 5.6) || input.diabetes);

    return {
      criteriaMet: met, criteriaKnown: known, criteria,
      positive: met >= 3,
      indeterminate: !( met >= 3) && missing,
      note: missing && met < 3 ? "One or more components could not be fully determined — this result cannot be fully confirmed either way." : null,
      source: SOURCE,
    };
  }

  // ---------------------------------------------------------------------
  // CV-13  "Possible FH" referral trigger — never an auto-diagnosis
  // ---------------------------------------------------------------------
  function fhTrigger(ldl, familyHistoryPrematureCVD, xanthomata) {
    const flags = [];
    if (ldl != null && ldl >= 4.9) flags.push("Markedly elevated LDL-cholesterol (≥4.9 mmol/L on this sample).");
    if (familyHistoryPrematureCVD === "Yes") flags.push("Family history of premature cardiovascular disease.");
    if (xanthomata) flags.push("Reported tendon xanthomata.");
    return { triggered: flags.length > 0, flags, note: "A single lipid value does not diagnose familial hypercholesterolaemia. This flag routes to clinical assessment; it is not a diagnosis.", source: SOURCE };
  }

  // ---------------------------------------------------------------------
  // CV-14  Triglyceride safety tiers
  // ---------------------------------------------------------------------
  function tgSafety(tg) {
    if (tg == null) return null;
    if (tg >= 10) return { tier: "severe", tone: "bad", urgency: "urgent", note: "Severely elevated — urgent clinical assessment is recommended (pancreatitis risk)." };
    if (tg >= 4.5) return { tier: "high", tone: "bad", urgency: "prompt", note: "Elevated enough that calculated LDL-C is not valid — prompt clinical review is recommended." };
    if (tg >= 1.7) return { tier: "raised", tone: "warn", urgency: "routine", note: "Raised — consider assessment for metabolic or secondary causes." };
    return { tier: "desirable", tone: "good", urgency: "none", note: "Within the desirable range." };
  }

  // ---------------------------------------------------------------------
  // Lipid discordance interpretation (spec's worked-example table)
  // ---------------------------------------------------------------------
  function discordance(ldl, apobAssessment, tgSafetyResult, hdl, aipResult, lpaResult) {
    const notes = [];
    if (ldl != null && ldl < 3.4 && apobAssessment && apobAssessment.aboveGoal) {
      notes.push({ id: "ldl-apob", title: "Balanced lipid explanation",
        text: "Your LDL-cholesterol is within the stated laboratory range, but ApoB is above the goal associated with your risk category. This means the number of cholesterol-carrying particles may be higher than LDL-cholesterol alone suggests. Any supplementary ratios support the same overall pattern but are not treatment targets on their own." });
    } else if (ldl != null && ldl >= 3.4 && apobAssessment && !apobAssessment.aboveGoal) {
      notes.push({ id: "ldl-high-apob-lower", title: "LDL-cholesterol remains meaningful",
        text: "LDL-cholesterol is above range even though ApoB is closer to goal. LDL-cholesterol should not be dismissed — both are shown together rather than one overriding the other." });
    }
    if (tgSafetyResult && (tgSafetyResult.tier === "raised" || tgSafetyResult.tier === "high") && hdl != null && ((hdl < 1.0)) && aipResult && aipResult.band !== "Lower") {
      notes.push({ id: "atherogenic-pattern", title: "Atherogenic / metabolic pattern",
        text: "Raised triglycerides together with lower HDL-cholesterol and a higher supplementary index suggest an atherogenic metabolic pattern. Checking glucose, waist circumference and blood pressure together with this result is recommended." });
    }
    if (ldl != null && ldl < 3.4 && lpaResult && lpaResult.band === "Elevated / risk-enhancing") {
      notes.push({ id: "lpa-modifier", title: "Inherited risk modifier",
        text: "LDL-cholesterol is controlled, but Lp(a) is elevated. Lp(a) is largely inherited and adds residual risk on top of a controlled LDL-cholesterol — this profile should not be read as fully reassuring on its own." });
    }
    return notes;
  }

  // ---------------------------------------------------------------------
  // Orchestrator
  // ---------------------------------------------------------------------
  function analyze(input) {
    const profile = input.profile || {};
    const labs = input.labs || {};
    const q = input.questionnaire || {};
    const sex = profile.sex;
    const age = profile.age;

    const bp = q.recentBP || profile.homeBP || {};
    const sbp = bp.sbp != null ? bp.sbp : (profile.homeBP && profile.homeBP.sbp);
    const dbp = bp.dbp != null ? bp.dbp : (profile.homeBP && profile.homeBP.dbp);
    const treated = q.bpMedication === "Yes" || (profile.homeBP && profile.homeBP.treated) || false;
    const smoker = q.smokingStatus === "Current smoker";
    const diabetes = q.diagnosedDiabetes === "Yes";
    const symptomsNow = q.symptomsNow || [];

    const bpClass = classifyBP(sbp, dbp);
    const escalation = bpEscalation(sbp, dbp, symptomsNow);

    const frs = framinghamRisk({
      age, sex, tc: labs.LAB_TC, hdl: labs.LAB_HDL, sbp, treated, smoker, diabetes,
      hasEstablishedCVD: !!q.establishedCVD, pregnancyStatus: q.pregnancyStatus, acuteSymptoms: !!escalation,
    });

    const nonHdl = nonHDL(labs.LAB_TC, labs.LAB_HDL);
    const ldlCalc = calculatedLDL(labs.LAB_TC, labs.LAB_HDL, labs.LAB_TG);
    const ldlValue = labs.LAB_LDL != null ? labs.LAB_LDL : ldlCalc.value;
    const ldlIsMeasured = labs.LAB_LDL != null;

    const aipResult = aip(labs.LAB_TG, labs.LAB_HDL);
    const c1 = castelliI(labs.LAB_TC, labs.LAB_HDL, sex);
    const c2 = castelliII(ldlValue, labs.LAB_HDL, sex, ldlIsMeasured ? true : ldlCalc.valid);
    const ac = atherogenicCoefficient(labs.LAB_TC, labs.LAB_HDL);

    const riskBand = frs.eligible ? frs.band : "Intermediate"; // conservative default goal when FRS not computable
    const apoB = apoBAssessment(labs.LAB_APOB, riskBand, !!q.establishedCVD);
    const apoRatioResult = apoRatio(labs.LAB_APOB, labs.LAB_APOA1);
    const lpa = lpaBand(labs.LAB_LPA, "nmol/L");

    const metSyn = metabolicSyndrome({
      sex, waist: profile.waist, tg: labs.LAB_TG, hdl: labs.LAB_HDL,
      sbp, dbp, bpTreated: treated, glucose: labs.LAB_GLU_FAST, diabetes,
    });

    const fh = fhTrigger(ldlValue, q.familyHistoryPrematureCVD, !!q.tendonXanthomata);
    const tgSafetyResult = tgSafety(labs.LAB_TG);
    const discordanceNotes = discordance(ldlValue, apoB, tgSafetyResult, labs.LAB_HDL, aipResult, lpa);

    // Overall CV urgency — worst-of across every trigger in the safety matrix.
    const urgencyOrder = ["emergency", "urgent", "prompt", "routine"];
    let urgency = "routine";
    const urgencyReasons = [];
    function raise(level, reason) {
      if (!level) return;
      urgencyReasons.push({ level, reason });
      if (urgencyOrder.indexOf(level) < urgencyOrder.indexOf(urgency)) urgency = level;
    }
    if (escalation) raise(escalation.urgency, escalation.reason);
    if (tgSafetyResult && tgSafetyResult.urgency && tgSafetyResult.urgency !== "none") raise(tgSafetyResult.urgency, "Triglycerides " + tgSafetyResult.tier + " (" + labs.LAB_TG + " mmol/L).");
    if (fh.triggered) raise("prompt", "Possible familial hypercholesterolaemia pathway triggered.");
    if (frs.eligible && frs.band === "High") raise("prompt", "High 10-year cardiovascular risk score.");
    if (lpa && lpa.band === "Elevated / risk-enhancing") raise("routine", "Elevated Lp(a) — risk modifier, clinician CV-risk review suggested.");
    if (apoB && apoB.aboveGoal) raise("routine", "ApoB above the goal linked to your risk category.");

    const bpCategoryRank = bpClass ? bpClass.rank : null;

    return {
      generatedAt: new Date().toISOString(),
      source: SOURCE,
      status: "real",
      inputs: { sbp, dbp, treated, smoker, diabetes, age, sex },
      safety: { emergencySymptoms: symptomsNow.filter((s) => EMERGENCY_SYMPTOMS.includes(s)), escalation },
      bp: bpClass,
      framingham: frs,
      lipids: {
        tc: labs.LAB_TC, hdl: labs.LAB_HDL, tg: labs.LAB_TG,
        ldl: { value: ldlValue, measured: ldlIsMeasured, calc: ldlCalc },
        nonHdl,
      },
      supplementary: { aip: aipResult, castelliI: c1, castelliII: c2, atherogenicCoefficient: ac },
      advanced: { apoB, apoRatio: apoRatioResult, lpa },
      metabolicSyndrome: metSyn,
      fh,
      tgSafety: tgSafetyResult,
      discordanceNotes,
      urgency, urgencyReasons,
      // Flat summary block — this is the shape recommendations.js's when(fh)
      // trigger functions read as fh.cv.*
      summary: {
        bpCategoryRank, bpCategory: bpClass ? bpClass.label : null,
        ldl: ldlValue, nonHdl, tg: labs.LAB_TG,
        apobFlag: !!(apoB && apoB.aboveGoal),
        lpaFlag: !!(lpa && lpa.band === "Elevated / risk-enhancing"),
        fhFlag: fh.triggered,
        frsBand: frs.eligible ? frs.band : null,
        urgency,
      },
    };
  }

  SQ.engines.cardiovascular = {
    classifyBP, bpEscalation, framinghamRisk, nonHDL, calculatedLDL, aip,
    castelliI, castelliII, atherogenicCoefficient, apoBGoal, apoBAssessment,
    apoRatio, lpaBand, metabolicSyndrome, fhTrigger, tgSafety, discordance,
    analyze,
  };
})();
