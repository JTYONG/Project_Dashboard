"""EVA SQUARE — generic classify-by-range helper. Python port of
js/engine/ruleEngine.js. Kept free of clinical knowledge of its own: it only
reads the threshold dicts in data/lab_dictionary.py#SIMPLE_RANGES."""
from ..data.lab_dictionary import SIMPLE_RANGES, LAB_DICTIONARY


def _band_label(band):
    return {
        "severe-low": "Markedly below range", "severe-high": "Markedly above range",
        "mild-low": "Below range", "mild-high": "Above range",
        "below-range": "Below range", "above-range": "Above range",
    }.get(band, "Within range")


def classify_by_range(code, value):
    r = SIMPLE_RANGES.get(code)
    meta = LAB_DICTIONARY.get(code)
    if not r or value is None:
        return None

    band, tone = "normal", "good"
    if r.get("severeLow") is not None and value <= r["severeLow"]:
        band, tone = "severe-low", "bad"
    elif r.get("severeHigh") is not None and value >= r["severeHigh"]:
        band, tone = "severe-high", "bad"
    elif r.get("mildLow") is not None and value <= r["mildLow"]:
        band, tone = "mild-low", "warn"
    elif r.get("mildHigh") is not None and value >= r["mildHigh"]:
        band, tone = "mild-high", "warn"
    elif r.get("normalLow") is not None and value < r["normalLow"]:
        band, tone = "below-range", "warn"
    elif r.get("normalHigh") is not None and value > r["normalHigh"]:
        band, tone = "above-range", "warn"

    return {
        "code": code, "value": value, "band": band, "tone": tone, "label": _band_label(band),
        "name": meta["name"] if meta else code, "unit": meta["unit"] if meta else "",
        "source": r.get("source", "Demo threshold — illustrative."), "isIllustrative": True,
    }
