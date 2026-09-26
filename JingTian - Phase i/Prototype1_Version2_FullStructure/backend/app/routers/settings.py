"""EVA SQUARE — user settings endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DBSession

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user

router = APIRouter(prefix="/api/settings", tags=["settings"])


def _get_or_create(db: DBSession, user: models.User) -> models.Settings:
    s = db.query(models.Settings).filter_by(user_id=user.id).first()
    if not s:
        s = models.Settings(user_id=user.id)
        db.add(s)
        db.commit()
        db.refresh(s)
    return s


def _out(s: models.Settings) -> dict:
    return {"units": s.units, "notifications": s.notifications, "theme": s.theme}


@router.get("")
def get_settings(user: models.User = Depends(get_current_user), db: DBSession = Depends(get_db)):
    return _out(_get_or_create(db, user))


@router.patch("")
def patch_settings(body: schemas.SettingsPatch, user: models.User = Depends(get_current_user), db: DBSession = Depends(get_db)):
    s = _get_or_create(db, user)
    if body.units is not None:
        s.units = body.units
    if body.notifications is not None:
        s.notifications = body.notifications
    if body.theme is not None:
        s.theme = body.theme
    db.commit()
    return _out(s)
