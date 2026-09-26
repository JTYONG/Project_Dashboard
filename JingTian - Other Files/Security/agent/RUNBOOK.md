# Runbook — Driving a Security Test With AI Agents

The harness has two halves. Deterministic tools are the sensors; the agent is
the analyst. Agents are weak at finding low-level bugs and strong at the
things that need context: triaging scanner noise against real code paths,
chaining two mediums into a high, and reasoning about business logic
("consent was revoked — can this report still be generated?").

**Every agent claim goes into `../evidence/` with a reproduction, or it is
not a finding.** An unverified agent finding is a hypothesis.

## Guardrails (non-negotiable)

- Scope comes from `../RULES_OF_ENGAGEMENT.md`. The agent gets that file.
- Run in a container with egress restricted to in-scope hosts.
- Disposable database, synthetic patients, assume every run destroys it.
- Never production. Never real patient data. Never a third party's system.
- A human reviews findings before they are acted on or re-run.

## Step 1 — Recon and mapping (agent, read-only)

Give the agent the repository plus `THREAT_MODEL.md` and ask for an attack
surface map: every route, every parameter, every place untrusted input
reaches storage or the DOM, and which of the 26 modules owns it. Output is a
table, not prose. This is cheap and it is what makes step 2 accurate.

## Step 2 — Triage the scanners (agent, read-only)

```bash
bash Security/sast/run-sast.sh
```

Then hand the agent `evidence/<run>/semgrep.json` with this task:

> For each finding: is the sink reachable from untrusted input on a real code
> path? Cite the path file:line → file:line. Classify as EXPLOITABLE,
> LATENT (safe today, unsafe once <specific change> lands), or FALSE
> POSITIVE with a reason. Do not propose fixes yet.

This is the highest-value use of an agent in the whole harness. Most SAST
output is noise; an agent with repo context sorts it in minutes.

## Step 3 — Business logic (agent, active, staging only)

Give the agent `checklists/authz-and-business-logic.md` as a task list and two
synthetic accounts. It works the checklist, records request/response pairs,
and stops on the first destructive-looking action for human confirmation.

Section A (object-level authorisation) is the single most valuable thing to
automate: it is mechanical, high-risk, and no scanner does it.

## Step 4 — Autonomous pentest (optional, when staging is real)

Pick one. In rough order of "least setup for a solo builder":

| Tool | What it is | Use when |
|---|---|---|
| **HexStrike AI** | MCP server exposing ~150 security tools | You already drive an agent (Claude Code, etc.) and want it to hold the tools. Shortest path. |
| **Strix** | Autonomous agent that produces a working PoC per finding | You want low false positives and evidence you can act on |
| **PentAGI** | Self-hosted multi-agent, Docker-sandboxed | You want the full run isolated end to end |
| **CAI** | Build-your-own agent framework | You want to write the loop yourself |
| **PentestGPT** | Reasoning assistant, task-tree sessions | You are learning the methodology rather than automating it |

`mcp-servers.example.json` has a starting configuration for the MCP route.

## Step 5 — The AI layer

If extraction or interpretation runs through a model, run `../llm/` — see
that folder's README. The single highest-value test in the whole harness:
embed injection text inside a lab report PDF and check whether the extracted
values or the pathway change.

## Step 6 — Report

Write `evidence/<run>/findings.md`. Per finding: title, severity, affected
module number, reproduction, impact in one sentence, fix, and status. Keep
every run. That folder is the evidence that testing was performed, which is
what a partner or auditor will ask for.

---

## Agent system prompt (copy this)

```
You are performing an authorised security assessment of MyHealthReport, a
health platform that ingests blood reports and produces clinical risk
reports. Read Security/RULES_OF_ENGAGEMENT.md and Security/THREAT_MODEL.md
before acting; they define your scope and you may not act outside it.

Rules:
- Staging only. If a target resolves to production or to any host not listed
  in scope, stop and report it.
- Synthetic patient data only. If you encounter data that looks real, stop
  immediately and report it as an incident.
- Read-only until told otherwise. Do not delete data, do not create
  persistence, do not modify accounts you were not given.
- No denial of service, no volumetric testing, no credential brute-forcing
  beyond confirming that rate limiting exists.
- Never attack a third-party service (laboratory portals, OCR or model
  providers, cloud consoles), even if the application points you at one.

Method:
- Prefer proving a finding over listing a possibility. A finding without a
  reproduction is a hypothesis; label it as such.
- Prioritise by Security/THREAT_MODEL.md section 4: object-level
  authorisation and prompt injection in the extraction path come first.
- Remember this app outputs a clinical pathway. An attack that DOWNGRADES an
  URGENT result is as serious as one that steals data. Test integrity, not
  only confidentiality.
- Record every request and response you consider evidence into
  Security/evidence/<run>/.

Output format per finding: title, severity (Critical/High/Medium/Low),
affected module number, reproduction steps, impact in one sentence,
recommended fix.
```
