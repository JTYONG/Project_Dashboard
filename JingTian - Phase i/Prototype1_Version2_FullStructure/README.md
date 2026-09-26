# EVA SQUARE — Prototype 1, Version 2 (Full Structure)

This is the **full frontend / backend / database** build of the EVA SQUARE
prototype: the same 20-screen application and clinical content as
`Prototype1_Version2`, rebuilt on a real three-tier architecture so it is
ready to grow into a deployable web product, rather than a single
self-contained HTML file.

```
Prototype1_Version2_FullStructure/
├── frontend/     static HTML/CSS/JS single-page app (no build step)
├── backend/      FastAPI + SQLAlchemy Python application (the REST API)
└── database/     local SQLite database + schema snapshot
```

Each layer is deliberately independent — see `database/README.md` for the
schema, and every backend module under `backend/app/` for inline comments
explaining the deployment upgrade path.

## What's new versus Prototype1_Version2

Prototype1_Version2 computed everything client-side in the browser and
stored data in `localStorage`. This build moves that logic into a real
Python backend with its own database, and adds four interactive features
requested for this version:

1. **Interactive anatomy board** (Dashboard) — after a report is analysed,
   a schematic 2D body diagram shows one shape per health domain
   (heart = Cardiovascular, liver, kidneys = Renal, etc.), coloured by that
   domain's risk level. Hovering an organ (or its matching legend row)
   darkens it and adds a glow; clicking it opens that domain's full report.
   See `frontend/js/ui/anatomy.js`.
2. **Expandable reference-scale rows** — every quantity in a domain's
   Results tab (and the single-marker Result Detail page) has a ▾ button
   that reveals the quantity's whole reference scale as a coloured bar
   (green/amber/red), with the patient's value marked on it. Backed by a
   new `backend/app/data/reference_scales.py` and the
   `GET /api/meta/reference-scales` endpoint. See `frontend/js/ui/scaleRow.js`.
3. **Enlarged interactive trend charts** — clicking a quantity on the
   Trends page opens a zoomable, pannable canvas chart (scroll to zoom,
   drag to pan). Axis labels are set in Times New Roman; the fitted-trend
   formula is shown in Cambria Math; the plotted line's colour follows the
   quantity's own risk level as a smooth gradient. See
   `frontend/js/ui/trendChart.js`.
4. **Hover feedback everywhere** — buttons, cards, nav links, tabs, table
   rows, toggles and the two features above all have a hover transition
   (see the end of `frontend/css/style.css`).

The content itself — every screen, all clinical logic, both sample
scenarios — is unchanged from `Prototype1_Version2`: the real
Cardiovascular Domain Specification engine (blood pressure, Friedewald
LDL, Framingham risk, ApoB/Lp(a)/AIP/Castelli indices, FH and metabolic
syndrome triggers, four-level safety escalation) has been ported line-for-line
to Python in `backend/app/engines/`, and the other five domains keep their
clearly-labelled illustrative demo logic.

## Running it locally

### Windows — one click

Double-click **`run.bat`** in this folder. The first run sets up a Python
virtual environment, installs dependencies, and creates the local database
with both demo accounts (this can take a minute); every run after that
starts in a few seconds. Your browser opens automatically at
**http://localhost:8000**. Close the black console window (or press
Ctrl+C in it) to stop the server.

Requires Python 3.9+ installed with "Add python.exe to PATH" checked
during setup — `run.bat` will tell you if it can't find Python, with a
link to install it. (A true `.exe` would need to bundle its own Python
interpreter via a packaging tool like PyInstaller, which makes for a much
larger, harder-to-update file for no real benefit at this stage — `run.bat`
gives the same "double-click and it opens" experience without that.)

### macOS / Linux, or the manual steps on Windows

Requires Python 3.9+.

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m app.seed                # optional — pre-populates both demo accounts
uvicorn app.main:app --reload
```

Then open **http://localhost:8000** — the same FastAPI process serves both
the API (under `/api/*`) and the frontend, so nothing else needs to run.
Interactive API docs are at **http://localhost:8000/docs**.

Two demo accounts exist (or are created on first use if you skip the seed
step): sign in from the Welcome screen with "Load a routine sample report"
/ "Load an urgent-pathway sample", or log in directly as
`dexter@demo.square` / `priya@demo.square` with password `demo-password`.

## The database

A single SQLite file at `database/square.db`, created automatically on
first run. Delete it any time to reset all app data — it's recreated empty
on the next backend start. See `database/README.md` for the schema and the
`SQUARE_DATABASE_URL` environment variable that swaps it for Postgres.

## Upgrading to a deployed web version

This basis version was built so that becoming a real deployed product is a
matter of configuration, not rewriting:

- **Database**: set `SQUARE_DATABASE_URL` to a managed Postgres instance
  (`database/README.md`). No code changes — every query is plain
  SQLAlchemy.
- **Auth**: `backend/app/security.py` currently hashes passwords with
  stdlib PBKDF2 and issues opaque bearer tokens with no external
  dependencies, by design — the module's docstring notes exactly where to
  swap in `passlib`/`argon2` and JWTs for production.
- **Frontend hosting**: split `frontend/` out from FastAPI's StaticFiles
  mount onto its own host/CDN, and point `frontend/js/api.js`'s single
  `API_BASE` constant at the deployed API's URL — everything else in the
  frontend already talks to the backend exclusively through `SQ.api.*`.
- **OCR**: `POST /api/reports/upload` currently matches any uploaded file
  to the routine sample lab panel (there is no live OCR in this basis
  version, matching Prototype1_Version2's behaviour) — `backend/app/routers/reports.py`
  documents exactly where a real extraction pipeline would plug in.

## Content parity

Every screen's content matches the corresponding page in the project's
`Screen/` mockup directory and `Prototype1_Version2` exactly — this build
only changes *how* the app is built (three tiers instead of one file), not
what it says.
