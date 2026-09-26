# EVA SQUARE — Database

A single local SQLite file, `square.db`, created automatically the first
time the backend starts (`Base.metadata.create_all()` in
`backend/app/database.py`). It lives here, outside `backend/`, so that
frontend / backend / database read as three independent concerns — you can
delete `square.db` at any time to reset all app data; it will be recreated
empty on the next backend start (or run `python -m app.seed` from
`backend/` to recreate it with both demo accounts pre-populated).

`schema.sql` in this folder is a **generated snapshot** of the schema (via
SQLAlchemy's `CreateTable`), kept for readability — the source of truth is
`backend/app/models.py`. Regenerate it after changing a model with:

```bash
cd backend
python -c "
from app.database import Base, engine
from sqlalchemy.schema import CreateTable
for t in Base.metadata.sorted_tables:
    print(CreateTable(t).compile(engine))
" > ../database/schema.sql
```

## Design

Two kinds of tables, deliberately:

- **Normalized** — `users`, `sessions`, `consent_records`, `settings`,
  `action_plan_items`. Small, queried individually, real columns.
- **Document-style** (`*_json` text columns) — `reports`,
  `questionnaire_answers`, `analysis_results`. These hold large, nested
  payloads (a full lab panel, a full computed analysis) whose shape is
  defined by the Python engine modules in `backend/app/engines/`, not by
  the database. This is a pragmatic "basis version" choice: normalizing
  every lab value and calculator result into its own column/table is
  exactly the kind of migration a deployed v2 would do once the schema has
  proven itself against real usage and query patterns — premature
  normalization here would just be guessing.

## Upgrading to a deployed web version

Swap the SQLite file for a managed Postgres/MySQL instance by setting the
`SQUARE_DATABASE_URL` environment variable before starting the backend,
e.g.:

```bash
export SQUARE_DATABASE_URL="postgresql+psycopg://user:pass@host:5432/eva_square"
```

Nothing else changes — every query in `backend/app/routers/` and
`backend/app/models.py` is plain SQLAlchemy Core/ORM with no SQLite-specific
features. The `*_json` text columns work identically on Postgres (or can be
upgraded to native `JSONB` columns for indexable queries, a small, isolated
follow-up change to `models.py`).
