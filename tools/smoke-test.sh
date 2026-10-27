#!/bin/bash
# Post-deployment check (the "Monitor" stage on Azure).
# Passes only when the live site runs the expected commit AND its key pages work.
#   ./tools/smoke-test.sh https://quickbite-xxxx.azurewebsites.net <expected-commit>
set -uo pipefail
BASE="${1:?site url}"
EXPECTED="${2:?expected commit}"
DEADLINE=$((SECONDS + ${SMOKE_TIMEOUT:-300}))   # free-tier apps can take a while to wake up

echo "Waiting for $BASE to serve commit $EXPECTED"
while [ $SECONDS -lt $DEADLINE ]; do
  live=$(curl -fsS --max-time 20 "$BASE/api/version" 2>/dev/null | sed -n 's/.*"commit":"\([^"]*\)".*/\1/p')
  if [ "$live" = "$EXPECTED" ]; then
    echo "New version is live."
    break
  fi
  echo "  live commit: ${live:-<no response>} - retrying"
  sleep 10
done
[ "$live" = "$EXPECTED" ] || { echo "::error::Site never served commit $EXPECTED"; exit 1; }

fail=0
check() {
  local path="$1" want="$2"
  local body code
  body=$(curl -sS --max-time 20 -w '\n%{http_code}' "$BASE$path")
  code=$(tail -n1 <<<"$body")
  if [ "$code" = "200" ] && grep -q "$want" <<<"$body"; then
    echo "  OK   $path"
  else
    echo "::error::Smoke test failed: $path returned $code"
    fail=1
  fi
}

# Several rounds so an intermittent error is caught, like the 5xx alarm on AWS.
for round in 1 2 3; do
  check /api/health '"status":"ok"'
  check /api/menu 'Biryani'
  check / '<div id="root">'
done
exit $fail
