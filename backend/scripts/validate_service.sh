#!/bin/bash
# CodeDeploy ValidateService: the deployment on this server only succeeds if the
# health check passes. If it fails, CodeDeploy marks the deployment failed and
# (with auto-rollback on) redeploys the last good version.
set -uo pipefail
URL="http://localhost:3000/api/health"
for attempt in $(seq 1 30); do
  if body=$(curl -fsS --max-time 3 "$URL"); then
    echo "Healthy on attempt $attempt: $body"
    exit 0
  fi
  sleep 3
done
echo "QuickBite API failed its health check at $URL" >&2
journalctl -u quickbite --no-pager -n 50 >&2 || true
exit 1
