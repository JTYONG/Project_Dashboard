"""EVA SQUARE — shared FastAPI dependencies: DB session + current-user auth."""
import datetime as dt
from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session as DBSession

from .database import get_db
from . import models


def get_current_user(authorization: str = Header(default=""), db: DBSession = Depends(get_db)) -> models.User:
    token = ""
    if authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing bearer token — log in first.")
    session = db.get(models.Session, token)
    if not session or session.expires_at < dt.datetime.utcnow():
        raise HTTPException(status_code=401, detail="Session expired or invalid — log in again.")
    user = db.get(models.User, session.user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User no longer exists.")
    return user


def get_owned_report(report_id: str, db: DBSession, user: models.User) -> models.Report:
    report = db.get(models.Report, report_id)
    if not report or report.user_id != user.id:
        raise HTTPException(status_code=404, detail="Report not found.")
    return report
