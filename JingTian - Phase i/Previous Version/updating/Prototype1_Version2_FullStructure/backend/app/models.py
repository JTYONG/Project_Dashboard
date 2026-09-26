"""EVA SQUARE — SQLAlchemy ORM models.

Design note: account/session/consent/settings/action-plan state is fully
normalized (one column per fact) because that state is small, queried
individually, and benefits from real columns. Report/questionnaire/analysis
payloads are deliberately stored as JSON text columns (`*_json`) — they are
large, nested, always read/written as a whole document, and their shape
mirrors the JS engine output one-to-one. This is a pragmatic "basis version"
choice: normalizing every lab value and calculator result into its own
table is exactly the kind of migration a deployed v2 would do once the
schema has proven itself against real usage — see database/README.md.
"""
import uuid
import datetime as dt
from sqlalchemy import (
    Column, Integer, String, Boolean, Text, ForeignKey, DateTime, UniqueConstraint
)
from sqlalchemy.orm import relationship
from .database import Base


def _uuid():
    return uuid.uuid4().hex


def _now():
    return dt.datetime.utcnow()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    full_name = Column(String(200), nullable=False)
    email = Column(String(255), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=_now)

    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="user", cascade="all, delete-orphan")
    consent = relationship("ConsentRecord", back_populates="user", uselist=False, cascade="all, delete-orphan")
    settings = relationship("Settings", back_populates="user", uselist=False, cascade="all, delete-orphan")
    action_items = relationship("ActionPlanItem", back_populates="user", cascade="all, delete-orphan")


class Session(Base):
    """Bearer session tokens. Deliberately simple (no JWT/refresh) for this
    basis version — see backend/app/security.py for the upgrade note."""
    __tablename__ = "sessions"
    token = Column(String(64), primary_key=True, default=_uuid)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=_now)
    expires_at = Column(DateTime, nullable=False)

    user = relationship("User", back_populates="sessions")


class ConsentRecord(Base):
    __tablename__ = "consent_records"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    required_json = Column(Text, default="{}")   # {"processHealthData": true, ...}
    optional_json = Column(Text, default="{}")   # {"research": false, "updates": true}
    accepted_terms_version = Column(String(50), nullable=True)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    user = relationship("User", back_populates="consent")


class Settings(Base):
    __tablename__ = "settings"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    units = Column(String(20), default="metric")
    notifications = Column(Boolean, default=True)
    theme = Column(String(20), default="light")

    user = relationship("User", back_populates="settings")


class Report(Base):
    __tablename__ = "reports"
    id = Column(String(40), primary_key=True, default=_uuid)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    file_name = Column(String(255))
    lab = Column(String(255))
    report_date = Column(String(20))
    status = Column(String(20), default="pending-verify")  # pending-verify | verified
    profile_json = Column(Text, default="{}")
    labs_raw_json = Column(Text, default="{}")
    labs_verified_json = Column(Text, nullable=True)
    lab_confidence_json = Column(Text, default="{}")
    original_text = Column(Text, default="")
    trend_history_json = Column(Text, default="{}")
    uploaded_at = Column(DateTime, default=_now)

    user = relationship("User", back_populates="reports")
    questionnaire = relationship("QuestionnaireAnswer", back_populates="report", uselist=False, cascade="all, delete-orphan")
    analysis = relationship("AnalysisResult", back_populates="report", uselist=False, cascade="all, delete-orphan")


class QuestionnaireAnswer(Base):
    __tablename__ = "questionnaire_answers"
    id = Column(Integer, primary_key=True)
    report_id = Column(String(40), ForeignKey("reports.id"), nullable=False, unique=True)
    answers_json = Column(Text, default="{}")
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    report = relationship("Report", back_populates="questionnaire")


class AnalysisResult(Base):
    __tablename__ = "analysis_results"
    id = Column(Integer, primary_key=True)
    report_id = Column(String(40), ForeignKey("reports.id"), nullable=False, unique=True)
    result_json = Column(Text, default="{}")
    computed_at = Column(DateTime, default=_now, onupdate=_now)

    report = relationship("Report", back_populates="analysis")


class ActionPlanItem(Base):
    __tablename__ = "action_plan_items"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rec_code = Column(String(80), nullable=False)
    done = Column(Boolean, default=False)
    updated_at = Column(DateTime, default=_now, onupdate=_now)
    __table_args__ = (UniqueConstraint("user_id", "rec_code", name="uq_user_reccode"),)

    user = relationship("User", back_populates="action_items")
