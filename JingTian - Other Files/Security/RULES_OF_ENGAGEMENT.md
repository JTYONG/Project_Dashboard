# Rules of Engagement

Complete this before the first test run that touches anything on a network.
It is also the document a hospital, laboratory or insurance partner will ask
for, and the one that protects you if a test goes wrong.

## 1. Authorisation

| Field | Value |
|---|---|
| System owner | _(name, role)_ |
| Tester | _(name — you, a teammate, or an automated agent under your account)_ |
| Authorisation given by | _(name, date)_ |
| Written authorisation held at | _(link/file)_ |

Test only systems in scope below. Third-party services (laboratory portals,
OCR vendors, cloud consoles, model providers) are **out of scope** and must
never be attacked, including by an autonomous agent that wanders there.

## 2. Scope

**In scope**

- `_(staging URL)_` — MyHealthReport web app, staging only
- `_(staging API base)_`
- The application repository (static analysis)
- The AI extraction/interpretation layer, via its staging endpoint

**Explicitly out of scope**

- Production, and any environment holding real patient data
- Physical, social-engineering and phishing tests against staff
- Denial-of-service and volumetric load testing
- Any host not listed above, including shared cloud infrastructure
- Laboratory partners' systems and any external OCR/model provider

## 3. Data rule

Synthetic patients only. No real blood report, name, IC/passport number,
phone number or address enters a test environment at any point — not as a
fixture, not "just once to check the OCR". Test data lives in
`Security/llm/corpus/` and the demo's sample patients.

If real data is ever discovered in a test environment, stop the run, record
it as an incident, and purge before continuing.

## 4. Autonomous agents

Agents get the same scope as a human tester, plus:

- Run inside a container with egress restricted to the in-scope hosts.
- Point them at a disposable database seeded with synthetic data; assume
  every run destroys it.
- No credential harvesting, no persistence, no lateral movement beyond the
  listed hosts, no exfiltration of any dataset off the test host.
- A human reviews every finding before it is treated as real, and before any
  exploit proof-of-concept is re-run.
- Kill switch: _(how you stop a run — container stop command, revoke key)_.

## 5. Timing

- Permitted window: _(e.g. any time on staging; never during a partner demo)_
- Notify _(who)_ before a run that could take staging down.

## 6. Evidence and disclosure

- Every run writes to `Security/evidence/YYYY-MM-DD-<what>/`: command log,
  raw tool output, findings, and the reproduction for each finding.
- Retain evidence for at least the life of the current release. This is the
  audit trail that shows testing was actually performed.
- If a finding affects a third party or real user data, disclose it to
  _(who)_ within _(how long)_.

## 7. Non-negotiables

- Never test a system you do not own or have written permission to test.
- Never point the harness at production.
- Never commit credentials, API keys or real reports into this repository.
