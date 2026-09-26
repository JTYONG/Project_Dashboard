"""EVA SQUARE — optional CLI seed script.

The app already seeds demo accounts lazily (see routers/auth.py#demo_login,
called by the frontend's "Load a sample report" buttons), so this script is
not required to run the app. It exists for convenience: run it once after a
fresh `database/square.db` is created to pre-populate both demo accounts
with a fully-analysed report, so the database has example rows to inspect
immediately (e.g. with the sqlite3 CLI or a DB browser) without opening the
app first.

Usage:  cd backend && python -m app.seed
"""
from .database import Base, engine, SessionLocal
from . import models, security
from .data.sample_reports import SAMPLE_SCENARIOS
from .routers.auth import DEMO_PASSWORD
from .routers.reports import _create_from_scenario


def run():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        for key, sc in SAMPLE_SCENARIOS.items():
            email = sc["profile"]["email"]
            user = db.query(models.User).filter_by(email=email).first()
            if not user:
                user = models.User(full_name=sc["profile"]["fullName"], email=email,
                                    password_hash=security.hash_password(DEMO_PASSWORD))
                db.add(user)
                db.commit()
                db.refresh(user)
                print(f"Created demo user: {email}")
            if not db.query(models.Settings).filter_by(user_id=user.id).first():
                db.add(models.Settings(user_id=user.id))
            if not db.query(models.ConsentRecord).filter_by(user_id=user.id).first():
                db.add(models.ConsentRecord(user_id=user.id, required_json="{}", optional_json="{}"))
            db.commit()
            if not db.query(models.Report).filter_by(user_id=user.id).first():
                report = _create_from_scenario(db, user, key, None, full_pipeline=True)
                print(f"Seeded report {report.id} ({key}) for {email}")
        print("Seed complete.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
