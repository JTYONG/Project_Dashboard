"""EVA SQUARE — reports: sample seeding / upload / verify / questionnaire /
analysis / trends. This is the core clinical-data pipeline endpoint group."""
import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session as DBSession

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user, get_owned_report
from ..data.sample_reports import SAMPLE_SCENARIOS
from ..engines import orchestrator, trend_engine

router = APIRouter(prefix="/api/reports", tags=["reports"])


def _report_out(r: models.Report, include_original_text=True) -> dict:
    out = {
        "id": r.id, "fileName": r.file_name, "lab": r.lab, "reportDate": r.report_date, "status": r.status,
        "profile": json.loads(r.profile_json), "labsRaw": json.loads(r.labs_raw_json),
        "labsVerified": json.loads(r.labs_verified_json) if r.labs_verified_json else None,
        "labConfidence": json.loads(r.lab_confidence_json), "trendHistory": json.loads(r.trend_history_json),
        "uploadedAt": r.uploaded_at.isoformat() if r.uploaded_at else None,
    }
    if include_original_text:
        out["originalText"] = r.original_text
    return out


@router.get("")
def list_reports(user: models.User = Depends(get_current_user), db: DBSession = Depends(get_db)):
    reports = db.query(models.Report).filter_by(user_id=user.id).order_by(models.Report.uploaded_at.desc()).all()
    return [_report_out(r, include_original_text=False) for r in reports]


@router.get("/{report_id}")
def get_report(report_id: str, user: models.User = Depends(get_current_user), db: DBSession = Depends(get_db)):
    r = get_owned_report(report_id, db, user)
    return _report_out(r)


def _create_from_scenario(db: DBSession, user: models.User, scenario_key: str, file_name: Optional[str], full_pipeline: bool) -> models.Report:
    sc = SAMPLE_SCENARIOS.get(scenario_key)
    if not sc:
        raise HTTPException(status_code=404, detail="Unknown demo scenario.")
    report = models.Report(
        user_id=user.id, file_name=file_name or sc["fileName"], lab=sc["lab"], report_date=sc["reportDate"],
        status="verified" if full_pipeline else "pending-verify",
        profile_json=json.dumps(sc["profile"]), labs_raw_json=json.dumps(sc["labs"]),
        labs_verified_json=json.dumps(sc["labs"]) if full_pipeline else None,
        lab_confidence_json=json.dumps(sc["labConfidence"]), original_text=sc["originalText"],
        trend_history_json=json.dumps(sc["trendHistory"]),
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    db.add(models.QuestionnaireAnswer(report_id=report.id, answers_json=json.dumps(sc["questionnaireDefaults"])))
    db.commit()
    if full_pipeline:
        _run_and_store_analysis(db, report)
    return report


@router.post("/sample")
def create_sample_report(body: schemas.SampleReportIn, user: models.User = Depends(get_current_user), db: DBSession = Depends(get_db)):
    report = _create_from_scenario(db, user, body.scenario, body.fileName, body.fullPipeline)
    return _report_out(report)


@router.post("/upload")
def upload_report(file: UploadFile = File(...), user: models.User = Depends(get_current_user), db: DBSession = Depends(get_db)):
    """This basis version has no live OCR pipeline — any uploaded file is
    matched to the routine sample lab panel (see README) so Verify still has
    something meaningful to check, and the file's own name is preserved."""
    report = _create_from_scenario(db, user, "routine", file.filename, full_pipeline=False)
    return _report_out(report)


@router.post("/{report_id}/verify")
def verify_report(report_id: str, body: schemas.VerifyIn, user: models.User = Depends(get_current_user), db: DBSession = Depends(get_db)):
    r = get_owned_report(report_id, db, user)
    current = json.loads(r.labs_verified_json) if r.labs_verified_json else json.loads(r.labs_raw_json)
    current.update(body.values)
    r.labs_verified_json = json.dumps(current)
    r.status = "verified"
    db.commit()
    return _report_out(r)


@router.get("/{report_id}/questionnaire")
def get_questionnaire(report_id: str, user: models.User = Depends(get_current_user), db: DBSession = Depends(get_db)):
    r = get_owned_report(report_id, db, user)
    qa = db.query(models.QuestionnaireAnswer).filter_by(report_id=r.id).first()
    return {"answers": json.loads(qa.answers_json) if qa else {}}


@router.patch("/{report_id}/questionnaire")
def patch_questionnaire(report_id: str, body: schemas.AnswersPatch, user: models.User = Depends(get_current_user), db: DBSession = Depends(get_db)):
    r = get_owned_report(report_id, db, user)
    qa = db.query(models.QuestionnaireAnswer).filter_by(report_id=r.id).first()
    if not qa:
        qa = models.QuestionnaireAnswer(report_id=r.id, answers_json="{}")
        db.add(qa)
    answers = json.loads(qa.answers_json) if qa.answers_json else {}
    answers.update(body.patch)
    qa.answers_json = json.dumps(answers)
    db.commit()
    return {"answers": answers}


def _run_and_store_analysis(db: DBSession, r: models.Report) -> dict:
    profile = json.loads(r.profile_json)
    labs = json.loads(r.labs_verified_json) if r.labs_verified_json else json.loads(r.labs_raw_json)
    qa = db.query(models.QuestionnaireAnswer).filter_by(report_id=r.id).first()
    answers = json.loads(qa.answers_json) if qa else {}
    result = orchestrator.run_analysis(r.file_name, profile, labs, answers)

    existing = db.query(models.AnalysisResult).filter_by(report_id=r.id).first()
    if existing:
        existing.result_json = json.dumps(result)
    else:
        db.add(models.AnalysisResult(report_id=r.id, result_json=json.dumps(result)))
    db.commit()
    return result


@router.post("/{report_id}/analyze")
def analyze_report(report_id: str, user: models.User = Depends(get_current_user), db: DBSession = Depends(get_db)):
    r = get_owned_report(report_id, db, user)
    if r.status != "verified":
        raise HTTPException(status_code=400, detail="Verify the report's lab values before running analysis.")
    return _run_and_store_analysis(db, r)


@router.get("/{report_id}/analysis")
def get_analysis(report_id: str, user: models.User = Depends(get_current_user), db: DBSession = Depends(get_db)):
    r = get_owned_report(report_id, db, user)
    existing = db.query(models.AnalysisResult).filter_by(report_id=r.id).first()
    if existing:
        return json.loads(existing.result_json)
    if r.status != "verified":
        raise HTTPException(status_code=400, detail="No analysis yet — verify the report first.")
    return _run_and_store_analysis(db, r)


@router.get("/{report_id}/trends")
def get_trends(report_id: str, user: models.User = Depends(get_current_user), db: DBSession = Depends(get_db)):
    r = get_owned_report(report_id, db, user)
    history = json.loads(r.trend_history_json)
    out = {}
    for key, series in history.items():
        out[key] = {"series": series, "direction": trend_engine.direction(series), "delta": trend_engine.delta(series)}
    return out
