"""EVA SQUARE — assembles the printable report in the block order defined by
the Cardiovascular Domain Specification's report-generation rules. Python
port of js/engine/reportGenerator.js."""
import datetime as dt
from ..data.lab_dictionary import DOMAINS


def headline(cv):
    if not cv:
        return "Your report is ready to review."
    bits = []
    if cv.get("bp"):
        bits.append(cv["bp"]["label"].lower() + " blood pressure")
    ldl = cv.get("lipids", {}).get("ldl", {})
    if ldl.get("value") is not None:
        bits.append(("elevated" if ldl["value"] >= 3.4 else "acceptable") + " LDL-cholesterol")
    if cv.get("framingham", {}).get("eligible"):
        bits.append(cv["framingham"]["band"].lower() + " estimated 10-year cardiovascular risk")
    if not bits:
        return "Your cardiovascular results are summarised below."
    return "This report shows " + ", ".join(bits) + "."


def build(scenario_label, cv, others, safety, recs):
    blocks = []
    blocks.append({"id": "safety", "title": "Safety status",
                    "body": "No emergency or urgent flags were identified in this report." if safety["overall"] == "self"
                    else (safety["level"]["description"] + " " + safety["level"]["action"])})
    blocks.append({"id": "headline", "title": "Headline", "body": headline(cv)})

    if cv and cv.get("bp"):
        blocks.append({"id": "bp", "title": "Blood pressure",
                        "body": f"{cv['bp']['sbp']}/{cv['bp']['dbp']} mmHg — {cv['bp']['label']}. {cv['bp']['note']}"})

    if cv and cv.get("framingham"):
        frs = cv["framingham"]
        blocks.append({"id": "risk", "title": "10-year cardiovascular risk",
                        "body": (f"Estimated at {frs['riskPercent']}% ({frs['band']}). {frs['caution']}") if frs["eligible"]
                        else ("Not calculated: " + " ".join(frs["reasons"]))})

    if cv and cv.get("lipids"):
        li = cv["lipids"]
        ldl_txt = (f"{li['ldl']['value']} mmol/L" + ("" if li['ldl']['measured'] else " (calculated)")) if li['ldl']['value'] is not None else "not available"
        blocks.append({"id": "core-lipids", "title": "Core lipids",
                        "body": f"Total cholesterol {li['tc']} mmol/L, LDL-C {ldl_txt}, HDL-C {li['hdl']} mmol/L, "
                                f"Triglycerides {li['tg']} mmol/L, Non-HDL-C {li['nonHdl']} mmol/L."})

    adv = cv.get("advanced", {}) if cv else {}
    if adv.get("apoB") or adv.get("lpa"):
        parts = []
        if adv.get("apoB"):
            parts.append(f"ApoB {adv['apoB']['value']} mg/dL (goal <{adv['apoB']['target']} mg/dL for your risk category)")
        if adv.get("apoRatio"):
            parts.append(f"ApoB/ApoA-I ratio {adv['apoRatio']['value']}")
        if adv.get("lpa"):
            parts.append(f"Lp(a) {adv['lpa']['value']} {adv['lpa']['unit']} ({adv['lpa']['band']})")
        blocks.append({"id": "advanced-lipids", "title": "Advanced lipids", "body": "; ".join(parts) + "."})

    supp = cv.get("supplementary", {}) if cv else {}
    if supp:
        parts = []
        if supp.get("aip"):
            parts.append(f"AIP {supp['aip']['value']} ({supp['aip']['band']})")
        if supp.get("castelliI"):
            parts.append(f"Castelli I {supp['castelliI']['value']}")
        if supp.get("castelliII"):
            parts.append(f"Castelli II {supp['castelliII']['value']}")
        blocks.append({"id": "supplementary", "title": "Supplementary indices",
                        "body": (", ".join(parts) or "Not available") + ". These are supplementary and do not override the core lipid or risk results above."})

    if cv and (cv["fh"]["triggered"] or cv.get("metabolicSyndrome", {}).get("positive")
               or (adv.get("lpa") and adv["lpa"]["band"] == "Elevated / risk-enhancing")):
        parts = []
        if cv["fh"]["triggered"]:
            parts.append("Possible familial hypercholesterolaemia pathway flagged: " + " ".join(cv["fh"]["flags"]))
        if cv.get("metabolicSyndrome", {}).get("positive"):
            parts.append(f"Metabolic syndrome criteria met ({cv['metabolicSyndrome']['criteriaMet']} of 5).")
        if adv.get("lpa") and adv["lpa"]["band"] == "Elevated / risk-enhancing":
            parts.append("Elevated Lp(a) adds inherited residual risk.")
        blocks.append({"id": "modifiers", "title": "Risk modifiers", "body": " ".join(parts)})

    if cv and cv.get("discordanceNotes"):
        blocks.append({"id": "why", "title": "Why this result",
                        "body": "\n\n".join(f"{n['title']} — {n['text']}" for n in cv["discordanceNotes"])})

    if recs:
        blocks.append({"id": "actions", "title": "Actions", "body": "\n".join("• " + r["action"] for r in recs[:5])})

    blocks.append({"id": "followup", "title": "Follow-up",
                    "body": "Follow the urgent guidance above before your next scheduled review." if safety["overall"] in ("emergency", "urgent")
                    else "Repeat a fasting lipid panel and blood pressure check at your next routine interval, or sooner if advised."})

    if others:
        for key, d in others.items():
            if not d:
                continue
            label = DOMAINS.get(key, {}).get("label", key)
            blocks.append({"id": f"domain-{key}", "title": f"{label} (illustrative)", "body": d.get("note", "")})

    return {"generatedAt": dt.datetime.utcnow().isoformat(), "scenario": scenario_label, "blocks": blocks}
