"""EVA SQUARE — static reference content endpoints: domains, lab dictionary,
questionnaire structure, legal text, reference scales, referral ladder,
education snippets. None of this depends on the logged-in user."""
from fastapi import APIRouter

from ..data.lab_dictionary import DOMAINS, DOMAIN_ORDER, LAB_DICTIONARY, SIMPLE_RANGES, ANTHRO_RULES
from ..data.questionnaire import QUESTIONNAIRE_SECTIONS
from ..data.legal_content import ORG, TERMS_SECTIONS, CONSENT_REQUIRED, CONSENT_OPTIONAL
from ..data.recommendations import EDUCATION, REFERRAL_LEVELS
from ..data.reference_scales import get_all_scales
from ..data.sample_reports import SAMPLE_SCENARIOS

router = APIRouter(prefix="/api/meta", tags=["meta"])


@router.get("/domains")
def domains():
    return {"domains": DOMAINS, "order": DOMAIN_ORDER}


@router.get("/lab-dictionary")
def lab_dictionary():
    return {"labs": LAB_DICTIONARY, "simpleRanges": SIMPLE_RANGES, "anthroRules": ANTHRO_RULES}


@router.get("/questionnaire-sections")
def questionnaire_sections():
    return {"sections": QUESTIONNAIRE_SECTIONS}


@router.get("/legal")
def legal():
    return {"org": ORG, "terms": TERMS_SECTIONS, "consentRequired": CONSENT_REQUIRED, "consentOptional": CONSENT_OPTIONAL}


@router.get("/reference-scales")
def reference_scales():
    return get_all_scales()


@router.get("/referral-levels")
def referral_levels():
    return {"levels": REFERRAL_LEVELS}


@router.get("/education")
def education():
    return {"education": EDUCATION}


@router.get("/sample-scenarios")
def sample_scenarios():
    """Lightweight listing (no lab values) for the "try a sample" buttons."""
    return {k: {"key": v["key"], "label": v["label"], "profileName": v["profile"]["fullName"]} for k, v in SAMPLE_SCENARIOS.items()}
