# MyHealthReport — Security Testing Harness

A staged security-testing setup for the MyHealthReport platform, built so it
can be run today against the Phase 1 client-side demo and grow into a full
agentic penetration test once the backend and the AI extraction layer exist.

Nothing here is a substitute for an independent assessment before handling
real patient data. It is the continuous, cheap layer that runs on every
change so that the paid assessment finds interesting things instead of
obvious ones.

## Read first

- `RULES_OF_ENGAGEMENT.md` — what may be tested, by whom, against what. Fill
  in the placeholders before the first run that touches anything networked.
- `THREAT_MODEL.md` — assets, trust boundaries and the ranked risk list this
  harness is actually aimed at.
- `BASELINE_FINDINGS.md` — the result of the first scan of the Phase 1 demo
  (2026-09-01). Start here for what to fix.

## Layout

```
Security/
  RULES_OF_ENGAGEMENT.md   scope + authorisation
  THREAT_MODEL.md          assets, boundaries, ranked risks
  BASELINE_FINDINGS.md     findings from the first run
  checklists/              manual tests no scanner will find
  sast/                    Semgrep config + custom MyHealthReport rules
  dast/                    ZAP baseline scan (activates when staging exists)
  llm/                     promptfoo config + prompt-injection corpus
  agent/                   runbook + prompt for driving an agentic pentest
  ci/                      GitHub Actions workflow
  tools/                   dependency-free scanners that run today
  evidence/                one folder per run; keep it, it is your audit trail
```

## Run it now (Phase 1 demo, no backend)

```bash
node Security/tools/dom-sink-scan.js "Phase i/demo"
```

Dependency-free, no install. Flags unescaped HTML sinks, unsafe randomness,
path handling and PHI-in-storage patterns. This is the only piece that is
meaningful while the app is a static client-side prototype.

Optional, once `npm i -D playwright` is available in the demo folder (the
existing `test/smoke.js` already uses it):

```bash
node Security/tools/xss-probe.js
```

Loads the demo with a poisoned lab dictionary and reports whether an injected
payload executes — the regression test for finding MHR-001.

## Run it when the backend lands

```bash
# 1. static analysis
pip install semgrep
bash Security/sast/run-sast.sh

# 2. dynamic scan against STAGING only
bash Security/dast/zap-baseline.sh https://staging.example.internal

# 3. LLM layer, once extraction/interpretation runs through a model
npx promptfoo@latest eval -c Security/llm/promptfooconfig.yaml
npx promptfoo@latest redteam run -c Security/llm/redteam.yaml
```

## The staged plan

| Stage | Trigger | What runs |
|---|---|---|
| 0 — now | Phase 1 demo | `dom-sink-scan.js`, the two checklists read once |
| 1 | first server-side code | Semgrep + secrets scanning in CI on every commit |
| 2 | staging environment up | ZAP baseline nightly, auth/business-logic checklist by hand |
| 3 | OCR/LLM extraction live | promptfoo in CI, injection corpus, redteam run per model change |
| 4 | before real patient data | agentic pentest per `agent/RUNBOOK.md`, then an independent external assessment |

## A note on what AI agents are good for here

Agents are weak at finding memory-safety-style bugs and strong at the things
that need context: triaging scanner output against the actual code paths,
chaining two medium findings into one real one, and reasoning about business
logic ("consent was revoked — can this report still be generated?"). Treat
the deterministic scanners as the sensors and the agent as the analyst.
Every agent claim goes in `evidence/` with a reproduction, or it is not a
finding.
