"""EVA SQUARE — database engine/session setup.

The local "Database Environment" for this basis version is a single SQLite
file living in the sibling `database/` directory (kept OUTSIDE `backend/` on
purpose, so frontend/backend/database read as three independent concerns —
see the top-level README). Swapping to Postgres/MySQL for a deployed web
version is a one-line change: replace DATABASE_URL with a
`postgresql+psycopg://...` URL: every model and query below is plain
SQLAlchemy Core/ORM with no SQLite-specific features.
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)
DATABASE_DIR = os.path.join(PROJECT_ROOT, "database")
os.makedirs(DATABASE_DIR, exist_ok=True)
DATABASE_PATH = os.path.join(DATABASE_DIR, "square.db")

DATABASE_URL = os.environ.get("SQUARE_DATABASE_URL", f"sqlite:///{DATABASE_PATH}")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
