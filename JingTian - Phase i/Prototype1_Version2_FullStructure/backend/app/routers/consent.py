"""EVA SQUARE — consent state endpoints (content lives in routers/meta.py)."""
import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DBSession

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user
from ..data.legal_content import CONSENT_REQUIRED, ORG

router = APIRouter(prefix="/api/consent", tags=["consent"])


def _get_or_create(db: DBSession, user: models.User) -> models.ConsentRecord:
    rec = db.query(models.ConsentRecord).filter_by(user_id=user.id).first()
    if not rec:
        rec = models.ConsentRecord(user_id=user.id, required_json="{}", optional_json="{}")
        db.add(rec)
        db.commit()
        db.refresh(rec)
    return rec


@router.get("")
def get_consent(user: models.User = Depends(get_current_user), db: DBSession = Depends(get_db)):
    rec = _get_or_create(db, user)
    required = json.loads(rec.required_json)
    complete = all(required.get(c["id"]) for c in CONSENT_REQUIRED)
    return {"required": required, "optional": json.loads(rec.optional_json),
            "acceptedTermsVersion": rec.accepted_terms_version, "requiredComplete": complete}


@router.post("/accept-terms")
def accept_terms(user: models.User = Depends(get_current_user), db: DBSession = Depends(get_db)):
    rec = _get_or_create(db, user)
    rec.accepted_terms_version = ORG["version"]
    db.commit()
    return {"acceptedTermsVersion": rec.accepted_terms_version}


@router.patch("")
def patch_consent(body: schemas.ConsentPatch, user: models.User = Depends(get_current_user), db: DBSession = Depends(get_db)):
    rec = _get_or_create(db, user)
    field = "required_json" if body.kind == "required" else "optional_json"
    data = json.loads(getattr(rec, field))
    data[body.id] = body.value
    setattr(rec, field, json.dumps(data))
    db.commit()
    required = json.loads(rec.required_json)
    complete = all(required.get(c["id"]) for c in CONSENT_REQUIRED)
    return {"required": json.loads(rec.required_json), "optional": json.loads(rec.optional_json), "requiredComplete": complete}
