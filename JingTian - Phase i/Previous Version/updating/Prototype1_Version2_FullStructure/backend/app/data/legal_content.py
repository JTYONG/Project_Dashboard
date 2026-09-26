"""EVA SQUARE — Terms & Conditions / Consent content. Python port of
js/data/legalContent.js, sample details filled in per agreed prototype
scope (see README)."""

ORG = {
    "legalName": "EVA SQUARE Health Sdn Bhd (sample entity for this prototype)",
    "supportEmail": "support@evasquare.example",
    "legalEmail": "legal@evasquare.example",
    "address": "Level 12, Menara EVA SQUARE, Jalan Ampang, 50450 Kuala Lumpur, Malaysia (sample address)",
    "effectiveDate": "29 August 2026",
    "version": "Draft v1.0",
}


def _org_name(): return ORG["legalName"]
def _org_email(): return ORG["legalEmail"]
def _org_addr(): return ORG["address"]


TERMS_SECTIONS = [
    {"id": "about", "title": "1. About EVA SQUARE", "body": [
        "EVA SQUARE is a personal health interpretation and wellness-navigation platform. We help you understand your screening information, organise important insights, and plan next steps for your health and wellbeing.",
        f'These Terms form a binding agreement between you and {_org_name()} ("EVA SQUARE", "we", "us"). By creating an account or continuing to use EVA SQUARE, you confirm that you have read and accepted these Terms.',
    ]},
    {"id": "scope", "title": "2. Scope of Service", "body": ["EVA SQUARE provides the following services to support your health journey:"],
     "list": ["Health information organisation", "Personalised wellness education", "Risk-awareness guidance", "Follow-up and progress tracking"],
     "note": {"tone": "info", "title": "Important: EVA SQUARE does not provide a medical diagnosis.",
              "text": "Platform guidance does not replace assessment, diagnosis or treatment by a qualified healthcare professional."}},
    {"id": "not-diagnosis", "title": "3. Not Medical Diagnosis or Emergency Care", "body": [
        "Unless EVA SQUARE expressly identifies a separately booked consultation delivered by a named, registered healthcare professional, EVA SQUARE's output is general informational and educational content — not a diagnosis, medical opinion, prescription or treatment plan.",
        "Use of the automated platform alone does not create a doctor-patient relationship. EVA SQUARE does not continuously monitor your data and may not detect deterioration or emergencies.",
    ], "note": {"tone": "bad", "title": "Emergency warning",
                "text": "EVA SQUARE must not be used for urgent or emergency care. If you may have a medical emergency, contact Malaysia's emergency services at 999 or go to the nearest emergency department immediately."}},
    {"id": "responsibilities", "title": "4. User Responsibilities", "body": [
        "You agree to provide information that is accurate, current and complete; to answer questionnaires honestly; and to avoid uploading altered, illegible or mismatched reports.",
        "You remain responsible for your decisions and for obtaining appropriate professional care. You must not change medication, supplements or treatment solely because of EVA SQUARE output.",
    ]},
    {"id": "privacy", "title": "5. Data and Privacy", "body": [
        "EVA SQUARE may process identity, demographic, lifestyle, laboratory, medical-history and other health-related information. Health information is sensitive personal data, and its processing requires your separate, specific consent — recorded on the Consent screen.",
        "Optional consent for research or communications is never bundled with access to the core service, and may be withdrawn at any time.",
    ]},
    {"id": "referral", "title": "6. Professional Referral", "body": [
        "EVA SQUARE may display or facilitate referrals to independent doctors, clinics, laboratories or allied health professionals. Unless expressly identified as our employee or agent, each provider is independent and responsible for their own advice, treatment and fees.",
        "A referral, listing or link is not a guarantee or endorsement of outcome — you may choose another qualified provider.",
    ]},
    {"id": "limitations", "title": "7. Platform Limitations", "body": [
        "We aim to provide a reliable service but do not promise uninterrupted or error-free access. Automated outputs — including optical character recognition, unit conversion, calculators and rule-based classification — may occasionally misread, omit or misclassify information.",
        "Before relying on an output, compare the patient identity, test name, value, unit and reference interval against your original report. Nothing in these Terms excludes a right that cannot lawfully be excluded, including for fraud, wilful misconduct, or death or personal injury caused by negligence.",
    ]},
    {"id": "account", "title": "8. Account and Access", "body": [
        "You must be at least 18 years old and have legal capacity to use EVA SQUARE, unless a service is expressly made available to minors through a parent or guardian.",
        "You are responsible for safeguarding your credentials and for activity through your account. We may suspend or restrict access to protect users, data or the Services, and will provide notice where reasonably possible.",
    ]},
    {"id": "changes", "title": "9. Changes to These Terms", "body": [
        "We may update these Terms to reflect changes in law, safety, technology or business operations. We will post the updated version with its effective date, and request renewed acceptance for material changes where required.",
    ]},
    {"id": "contact", "title": "10. Contact Us", "body": [
        f"Questions, complaints, account requests and legal notices may be sent to {_org_email()} or {_org_addr()}.",
        "These Terms are governed by the laws of Malaysia. We will first attempt to resolve any complaint in good faith through our support channel.",
    ]},
]

CONSENT_REQUIRED = [
    {"id": "processHealthData", "icon": "\U0001F512", "title": "Process my health information",
     "body": "I consent to EVA SQUARE securely processing the information and health reports I provide to generate personalised interpretation, education and action guidance.",
     "detail": "Includes account and contact details; demographics; anthropometrics and lifestyle responses; uploaded laboratory reports and extracted values; and platform activity needed to provide, secure and audit the service."},
    {"id": "nonDiagnosticAck", "icon": "\U0001F9D1‍⚕️", "title": "Non-diagnostic platform acknowledgement",
     "body": "I understand that EVA SQUARE provides health interpretation, education and wellness guidance — not a diagnosis, medical treatment, prescription or emergency service.",
     "detail": "EVA SQUARE does not establish a doctor-patient relationship merely because I use the platform. Laboratory reference ranges can differ between laboratories, methods and populations."},
    {"id": "professionalCareAck", "icon": "\U0001FA7A", "title": "Professional-care acknowledgement",
     "body": "I understand that I should obtain qualified healthcare assessment when advised, when symptoms concern me, when results are unexpected, or whenever I am unsure.",
     "detail": "EVA SQUARE must not be used for urgent or emergency care. If I may have a medical emergency, I will contact Malaysia's emergency services at 999 or go to the nearest emergency department immediately."},
]

CONSENT_OPTIONAL = [
    {"id": "research", "title": "Contribute to health research",
     "body": "Allow de-identified platform data to be considered for ethically approved research that may improve health understanding and services.",
     "points": ["Your name and direct identifiers are removed", "Choosing no will not affect platform access", "You can withdraw this permission later", "Additional approval may be required for specific studies"]},
    {"id": "updates", "title": "Receive helpful updates",
     "body": "Get occasional health education and platform updates. No promotional messages without permission.", "points": []},
]
