"""EVA SQUARE — registration / login / demo-login / session endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession

from .. import models, schemas, security
from ..database import get_db
from ..deps import get_current_user
from ..data.sample_reports import SAMPLE_SCENARIOS

router = APIRouter(prefix="/api/auth", tags=["auth"])

DEMO_PASSWORD = "demo-password"  # only ever used for the seeded demo accounts


def _user_out(user: models.User) -> dict:
    return {"id": user.id, "fullName": user.full_name, "email": user.email}


def _issue_session(db: DBSession, user: models.User) -> str:
    token = security.new_session_token()
    db.add(models.Session(token=token, user_id=user.id, expires_at=security.session_expiry()))
    db.commit()
    return token


def _ensure_defaults(db: DBSession, user: models.User):
    existing = db.query(models.ConsentRecord).filter_by(user_id=user.id).first()
    if not existing:
        db.add(models.ConsentRecord(user_id=user.id, required_json="{}", optional_json="{}"))
    if not db.query(models.Settings).filter_by(user_id=user.id).first():
        db.add(models.Settings(user_id=user.id))
    db.commit()


@router.post("/register", response_model=schemas.AuthOut)
def register(body: schemas.RegisterIn, db: DBSession = Depends(get_db)):
    if db.query(models.User).filter_by(email=body.email).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists — try logging in instead.")
    user = models.User(full_name=body.fullName, email=body.email, password_hash=security.hash_password(body.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    _ensure_defaults(db, user)
    token = _issue_session(db, user)
    return {"token": token, "user": _user_out(user)}


@router.post("/login", response_model=schemas.AuthOut)
def login(body: schemas.LoginIn, db: DBSession = Depends(get_db)):
    user = db.query(models.User).filter_by(email=body.email).first()
    if not user or not security.verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    _ensure_defaults(db, user)
    token = _issue_session(db, user)
    return {"token": token, "user": _user_out(user)}


@router.post("/demo-login/{scenario}", response_model=schemas.AuthOut)
def demo_login(scenario: str, db: DBSession = Depends(get_db)):
    """Get-or-create the seeded demo account for `scenario` and log in as
    them — this is what the "Load a routine/urgent sample" shortcuts call so
    a visitor can explore the whole app without filling in a registration
    form first."""
    sc = SAMPLE_SCENARIOS.get(scenario)
    if not sc:
        raise HTTPException(status_code=404, detail="Unknown demo scenario.")
    email = sc["profile"]["email"]
    user = db.query(models.User).filter_by(email=email).first()
    if not user:
        user = models.User(full_name=sc["profile"]["fullName"], email=email, password_hash=security.hash_password(DEMO_PASSWORD))
        db.add(user)
        db.commit()
        db.refresh(user)
    _ensure_defaults(db, user)
    token = _issue_session(db, user)
    return {"token": token, "user": _user_out(user)}


@router.post("/logout")
def logout(authorization: str = "", db: DBSession = Depends(get_db), user: models.User = Depends(get_current_user)):
    db.query(models.Session).filter_by(user_id=user.id).delete()
    db.commit()
    return {"ok": True}


@router.get("/me")
def me(user: models.User = Depends(get_current_user), db: DBSession = Depends(get_db)):
    consent = db.query(models.ConsentRecord).filter_by(user_id=user.id).first()
    settings = db.query(models.Settings).filter_by(user_id=user.id).first()
    import json
    return {
        "user": _user_out(user),
        "consent": {
            "required": json.loads(consent.required_json) if consent else {},
            "optional": json.loads(consent.optional_json) if consent else {},
            "acceptedTermsVersion": consent.accepted_terms_version if consent else None,
        },
        "settings": {"units": settings.units, "notifications": settings.notifications, "theme": settings.theme} if settings else {},
    }
