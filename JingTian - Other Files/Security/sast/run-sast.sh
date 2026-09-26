#!/usr/bin/env bash
# Static analysis pass. Safe to run any time; touches nothing but the repo.
set -uo pipefail
cd "$(dirname "$0")/../.."

STAMP="$(date +%Y-%m-%d)"
OUT="Security/evidence/${STAMP}-sast"
mkdir -p "$OUT"

echo "==> Semgrep (registry packs + MyHealthReport rules)"
if command -v semgrep >/dev/null 2>&1; then
  semgrep scan \
    --config p/javascript \
    --config p/owasp-top-ten \
    --config p/secrets \
    --config Security/sast/semgrep-mhr.yml \
    --json --output "$OUT/semgrep.json" \
    --error || true
  semgrep scan --config Security/sast/semgrep-mhr.yml --text | tee "$OUT/semgrep.txt"
else
  echo "semgrep not installed — pip install semgrep"
fi

echo "==> Dependency-free DOM sink scan"
node Security/tools/dom-sink-scan.js "Phase i/demo" | tee "$OUT/dom-sinks.txt"

echo "==> Dependency audit"
if [ -f package.json ]; then
  npm audit --audit-level=high --json > "$OUT/npm-audit.json" 2>/dev/null || true
  npm audit --audit-level=high || true
else
  echo "no package.json yet — skipped"
fi

echo
echo "Evidence written to $OUT"
echo "Next: have an agent triage $OUT/semgrep.json against the source"
echo "(see Security/agent/RUNBOOK.md, step 2) rather than reading it raw."
