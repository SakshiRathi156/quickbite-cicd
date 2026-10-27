#!/bin/bash
# CodeDeploy ApplicationStart: start (or restart) the API under systemd.
set -euo pipefail
systemctl enable quickbite
systemctl restart quickbite
