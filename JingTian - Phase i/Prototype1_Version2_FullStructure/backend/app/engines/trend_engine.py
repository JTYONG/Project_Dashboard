"""EVA SQUARE — longitudinal trend helpers. Python port of
js/engine/trendEngine.js, used by the /api/reports/{id}/trends endpoint so
direction/delta are computed once, server-side, rather than duplicated in
the frontend."""


def _numeric(point):
    if point is None:
        return None
    if isinstance(point.get("value"), (int, float)):
        return point["value"]
    if isinstance(point.get("sbp"), (int, float)):
        return point["sbp"]
    return None


def direction(series):
    if not series or len(series) < 2:
        return "flat"
    first = _numeric(series[0])
    last = _numeric(series[-1])
    if first is None or last is None:
        return "flat"
    delta = last - first
    if abs(delta) < 0.01 * max(1, abs(first)):
        return "flat"
    return "up" if delta > 0 else "down"


def delta(series):
    if not series or len(series) < 2:
        return 0
    a = _numeric(series[0])
    b = _numeric(series[-1])
    if a is None or b is None:
        return 0
    return round((b - a) * 100) / 100
