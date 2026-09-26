#!/usr/bin/env bash
# Passive/baseline dynamic scan. STAGING ONLY.
#
#   bash Security/dast/zap-baseline.sh https://staging.example.internal
#
# The baseline scan is passive plus a small set of safe active checks: it will
# not attack, flood or mutate data. Run the full active scan only against a
# disposable environment with synthetic patients, and only with the rules of
# engagement signed off.
set -euo pipefail

TARGET="${1:-}"
if [ -z "$TARGET" ]; then
  echo "usage: $0 <target-url>"; exit 2
fi

case "$TARGET" in
  *prod*|*production*|*www.*)
    echo "REFUSING: target looks like production. See RULES_OF_ENGAGEMENT.md"; exit 3;;
esac

cd "$(dirname "$0")/../.."
STAMP="$(date +%Y-%m-%d-%H%M)"
OUT="Security/evidence/${STAMP}-dast"
mkdir -p "$OUT"

docker run --rm -v "$(pwd)/$OUT:/zap/wrk:rw" -t ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py \
    -t "$TARGET" \
    -c "../../Security/dast/zap-rules.tsv" \
    -r report.html -J report.json -a \
  || true   # baseline exits non-zero when it finds anything

echo "Report: $OUT/report.html"
echo
echo "ZAP finds configuration and injection classes. It will NOT find broken"
echo "object-level authorisation — the highest risk for this app. Work through"
echo "Security/checklists/authz-and-business-logic.md by hand or with an agent."
