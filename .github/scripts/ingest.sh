#!/usr/bin/env bash
# Call one ingestion endpoint on the hosted app (used by .github/workflows/ingest.yml).
#
#   APP_URL=https://coffee-monitor.onrender.com INGEST_TOKEN=... .github/scripts/ingest.sh /tasks/ingest/news
#
# Pass `/healthz` to only wake the service. Skips cleanly (exit 0) until both
# secrets are set; fails (non-zero) if the app is unreachable or answers non-2xx.
set -euo pipefail

path="${1:?usage: ingest.sh /tasks/ingest/news|/tasks/ingest/data[?only=...]|/healthz}"
if [[ -z "${APP_URL:-}" || -z "${INGEST_TOKEN:-}" ]]; then
  echo "::notice::APP_URL or INGEST_TOKEN secret not set - skipping. See docs/DEPLOY_FREE.md."
  exit 0
fi
base="${APP_URL%/}"
attempts="${WAKE_ATTEMPTS:-6}"

# Render's free plan sleeps after 15 idle minutes; the first request can take ~1 min.
for ((i = 1; ; i++)); do
  if curl -fsS --max-time 90 "$base/healthz" >/dev/null; then
    break
  fi
  if ((i >= attempts)); then
    echo "::error::$base/healthz did not answer after $attempts attempts"
    exit 1
  fi
  sleep "${WAKE_SLEEP:-15}"
done
[[ "$path" == "/healthz" ]] && { echo "awake: $base"; exit 0; }

echo "POST $path"
curl -sS --fail-with-body --max-time 900 -X POST \
  -H "X-Ingest-Token: $INGEST_TOKEN" "$base$path"
echo
