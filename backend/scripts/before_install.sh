#!/bin/bash
# CodeDeploy BeforeInstall: start from a clean app folder so deleted files don't linger.
set -euo pipefail
rm -rf /opt/quickbite/app
mkdir -p /opt/quickbite/app /etc/quickbite
