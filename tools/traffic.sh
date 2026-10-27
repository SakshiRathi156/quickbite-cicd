#!/bin/bash
# Sends steady traffic to QuickBite so CloudWatch has requests to measure.
# Use it during the "error after deploy" demo (README, Demo 3).
#   ./tools/traffic.sh https://dxxxxxxxx.cloudfront.net
set -uo pipefail
BASE="${1:?Usage: $0 <site-url>}"
echo "Sending traffic to $BASE (Ctrl+C to stop)"
while true; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/menu")
  printf '%s %s\n' "$(date +%T)" "$code"
  sleep 0.5
done
