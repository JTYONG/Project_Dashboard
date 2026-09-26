"""EVA SQUARE — aggregates the Cardiovascular safety/escalation matrix with
the other domains' simplified urgency signals into one overall pathway.
Python port of js/engine/safetyEngine.js."""
from ..data.recommendations import REFERRAL_LEVELS

ORDER = ["emergency", "urgent", "prompt", "routine", "self"]


def _worst(levels):
    best = "self"
    for level in levels:
        if not level:
            continue
        if ORDER.index(level) < ORDER.index(best):
            best = level
    return best


def evaluate(analysis):
    reasons = []
    levels = []

    cv = analysis.get("cv")
    if cv:
        levels.append(cv["urgency"])
        for r in cv.get("urgencyReasons", []):
            reasons.append({"domain": "cardiovascular", "level": r["level"], "reason": r["reason"]})

    for key in ("metabolic", "liver", "renal", "haematology"):
        d = analysis.get(key)
        if d and d.get("summary", {}).get("urgency") and d["summary"]["urgency"] != "routine":
            levels.append(d["summary"]["urgency"])
            reasons.append({"domain": key, "level": d["summary"]["urgency"], "reason": f"Illustrative {key} finding outside the demo reference range."})

    overall = _worst(levels)
    if overall == "routine" and not reasons:
        overall = "self"

    level = next((r for r in REFERRAL_LEVELS if r["id"] == overall), REFERRAL_LEVELS[-1])
    return {"overall": overall, "level": level, "reasons": reasons}
