#!/bin/bash
# Builds the single deployable package for Azure App Service:
#   React build (frontend/dist) -> backend/public, plus production node_modules,
#   plus version.json with the commit id. Output: dist-azure/quickbite.zip
# Run from the repository root after `npm ci --prefix frontend`.
set -euo pipefail

COMMIT="$(git rev-parse HEAD 2>/dev/null || echo local)"
OUT=dist-azure
STAGE="$OUT/app"

rm -rf "$OUT"
mkdir -p "$STAGE"

npm run build --prefix frontend

# Copy the API without tests, local installs or reports.
tar -C backend \
  --exclude=node_modules --exclude=tests --exclude=coverage --exclude=reports --exclude=public \
  -cf - . | tar -C "$STAGE" -xf -
cp -r frontend/dist "$STAGE/public"

cat > "$STAGE/version.json" <<EOF
{"commit":"$COMMIT","builtAt":"$(date -u +%Y-%m-%dT%H:%M:%SZ)","runId":"${GITHUB_RUN_ID:-local}"}
EOF

npm ci --omit=dev --no-audit --no-fund --prefix "$STAGE"

(cd "$STAGE" && zip -qr ../quickbite.zip .)
echo "Packaged commit $COMMIT -> $OUT/quickbite.zip ($(du -h "$OUT/quickbite.zip" | cut -f1))"
