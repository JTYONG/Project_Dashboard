"""EVA SQUARE — FastAPI application entrypoint.

Local "basis version" wiring: this one process (1) creates/owns the SQLite
database in ../database/square.db, (2) exposes the REST API under /api/*,
and (3) serves the built frontend as static files at "/" — so the whole
stack starts with a single command (`uvicorn app.main:app`) and needs no
separate web server or CORS configuration. For a deployed web version, step
(3) goes away (the frontend is instead built/hosted separately, e.g. behind
a CDN) and step (1)'s DATABASE_URL points at a managed Postgres instance —
everything else here is unchanged. See the top-level README for that
upgrade path.
"""
import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from .database import Base, engine
from .routers import auth, consent, settings as settings_router, reports, meta, action_plan

Base.metadata.create_all(bind=engine)

app = FastAPI(title="EVA SQUARE API", version="1.0.0", description="Health interpretation platform — FullStructure basis version.")

app.include_router(auth.router)
app.include_router(consent.router)
app.include_router(settings_router.router)
app.include_router(reports.router)
app.include_router(meta.router)
app.include_router(action_plan.router)

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)
FRONTEND_DIR = os.path.join(PROJECT_ROOT, "frontend")


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "EVA SQUARE API"}


if os.path.isdir(FRONTEND_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIR, "assets")), name="assets")
    app.mount("/css", StaticFiles(directory=os.path.join(FRONTEND_DIR, "css")), name="css")
    app.mount("/js", StaticFiles(directory=os.path.join(FRONTEND_DIR, "js")), name="js")

    @app.get("/")
    def index():
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

    @app.get("/{full_path:path}")
    def spa_fallback(full_path: str):
        """Hash-routed SPA: any non-API, non-asset path still serves
        index.html so a hard refresh on e.g. /#/dashboard keeps working."""
        candidate = os.path.join(FRONTEND_DIR, full_path)
        if os.path.isfile(candidate):
            return FileResponse(candidate)
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))
