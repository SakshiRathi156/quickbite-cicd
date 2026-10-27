#!/bin/bash
# CodeDeploy ApplicationStop: stop the running version (if any).
set -uo pipefail
if systemctl list-unit-files | grep -q '^quickbite.service'; then
  systemctl stop quickbite || true
fi
exit 0
