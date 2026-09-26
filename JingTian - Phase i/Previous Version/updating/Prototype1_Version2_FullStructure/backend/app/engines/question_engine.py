"""EVA SQUARE — Adaptive Health Questionnaire logic. Python port of
js/engine/questionEngine.js."""
from ..data.questionnaire import QUESTIONNAIRE_SECTIONS
from ..data.lab_dictionary import LAB_DICTIONARY


def active_sections(present_domains):
    domains = present_domains or []
    return [s for s in QUESTIONNAIRE_SECTIONS if not s["triggerDomains"] or any(d in domains for d in s["triggerDomains"])]


def domains_present_in_labs(lab_values):
    present = set()
    for code, value in (lab_values or {}).items():
        meta = LAB_DICTIONARY.get(code)
        if meta and value is not None:
            present.add(meta["domain"])
    return list(present)


def is_complete(section, answers):
    for q in section["questions"]:
        v = answers.get(q["id"])
        if q["type"] == "bp-pair":
            if not v or v.get("sbp") is None or v.get("dbp") is None:
                return False
        else:
            if v is None or v == "":
                return False
    return True
