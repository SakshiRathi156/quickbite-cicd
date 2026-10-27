#!/bin/bash
# CodeDeploy AfterInstall: install production packages, write config, install the service.
set -euo pipefail
export PATH=/usr/local/bin:$PATH
APP=/opt/quickbite/app
cd "$APP"

npm ci --omit=dev --no-audit --no-fund

# infra.env is written by the EC2 launch template (CloudFormation) and holds
# AWS_REGION, DB_HOST and DB_SECRET_ARN — never the password itself.
# shellcheck disable=SC1091
source /etc/quickbite/infra.env

SECRET_JSON='{}'
if [ -n "${DB_HOST:-}" ] && [ -n "${DB_SECRET_ARN:-}" ]; then
  SECRET_JSON=$(aws secretsmanager get-secret-value \
    --region "$AWS_REGION" --secret-id "$DB_SECRET_ARN" \
    --query SecretString --output text)
fi

# Write the systemd environment file with node so special characters in the
# password are escaped safely.
DB_HOST="${DB_HOST:-}" SECRET_JSON="$SECRET_JSON" node -e '
  const fs = require("fs");
  const secret = JSON.parse(process.env.SECRET_JSON || "{}");
  const env = { NODE_ENV: "production", PORT: "3000" };
  if (process.env.DB_HOST) {
    Object.assign(env, {
      DB_HOST: process.env.DB_HOST,
      DB_PORT: "3306",
      DB_NAME: "quickbite",
      DB_USER: secret.username,
      DB_PASSWORD: secret.password,
    });
  }
  const lines = Object.entries(env).map(([k, v]) => `${k}=${JSON.stringify(String(v))}`);
  fs.writeFileSync("/etc/quickbite/app.env", lines.join("\n") + "\n", { mode: 0o600 });
'

cp "$APP/scripts/quickbite.service" /etc/systemd/system/quickbite.service
id quickbite >/dev/null 2>&1 || useradd --system --home /opt/quickbite --shell /sbin/nologin quickbite
chown -R quickbite:quickbite "$APP"
systemctl daemon-reload
