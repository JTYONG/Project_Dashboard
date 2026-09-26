"""EVA SQUARE — evaluates data/recommendations.py#RECOMMENDATIONS against the
assembled findings dict ("fh"). Python port of js/engine/recommendationEngine.js."""
from ..data.recommendations import RECOMMENDATIONS, EDUCATION


def evaluate(fh):
    if not fh:
        return []
    matched = []
    for r in RECOMMENDATIONS:
        try:
            if r["when"](fh):
                matched.append(r)
        except Exception:
            continue
    return sorted(matched, key=lambda r: -r["weight"])


def education_for(codes):
    out = []
    for c in (codes or []):
        text = EDUCATION.get(c)
        if text:
            out.append({"code": c, "text": text})
    return out


def serializable(rec):
    """Strip the non-JSON-serializable `when` callable before sending a
    recommendation over the API."""
    return {k: v for k, v in rec.items() if k != "when"}
