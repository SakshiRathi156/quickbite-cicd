#!/bin/bash
# One-time Azure setup for QuickBite. Run it in Azure Cloud Shell (Bash) from the repo root:
#   bash infra/azure/setup.sh
# Creates (all free tier): a resource group, a Linux App Service plan (F1) and a Node 20
# web app. Then saves the deployment credentials to GitHub so the workflow can deploy.
set -euo pipefail

RG="${RG:-quickbite-rg}"
APP="${APP:-quickbite-$(tr -dc 'a-z0-9' </dev/urandom | head -c 6)}"
PLAN="${PLAN:-quickbite-plan}"
# Student subscriptions only allow some regions, so try several.
REGIONS="${REGIONS:-centralindia southindia southeastasia eastus westeurope eastus2 westus2}"

echo "Subscription: $(az account show --query name -o tsv)"

created=""
for LOC in $REGIONS; do
  echo "Trying region $LOC ..."
  if az group create -n "$RG" -l "$LOC" -o none 2>/dev/null &&
     az appservice plan create -g "$RG" -n "$PLAN" --is-linux --sku F1 -l "$LOC" -o none 2>/tmp/plan.err; then
    created="$LOC"
    break
  fi
  sed -n '1,3p' /tmp/plan.err 2>/dev/null || true
  az group delete -n "$RG" --yes -o none 2>/dev/null || true
done
[ -n "$created" ] || { echo "Could not create a free App Service plan in any region tried."; exit 1; }
echo "Using region $created"

az webapp create -g "$RG" -p "$PLAN" -n "$APP" --runtime "NODE:20-lts" -o none
az webapp config set -g "$RG" -n "$APP" --startup-file "node src/server.js" -o none
az webapp config appsettings set -g "$RG" -n "$APP" -o none --settings \
  NODE_ENV=production \
  SCM_DO_BUILD_DURING_DEPLOYMENT=false \
  TRACKING_STEP_SECONDS=30

# The GitHub workflow deploys with a publish profile, which needs basic publishing auth.
az resource update -g "$RG" --namespace Microsoft.Web --resource-type basicPublishingCredentialsPolicies \
  --parent "sites/$APP" -n scm --set properties.allow=true -o none

PROFILE_FILE="$HOME/quickbite-publish-profile.xml"
az webapp deployment list-publishing-profiles -g "$RG" -n "$APP" --xml > "$PROFILE_FILE"
chmod 600 "$PROFILE_FILE"

if command -v gh >/dev/null && gh auth status >/dev/null 2>&1; then
  gh variable set AZURE_WEBAPP_NAME --body "$APP"
  gh secret set AZURE_WEBAPP_PUBLISH_PROFILE < "$PROFILE_FILE"
  rm -f "$PROFILE_FILE"
  echo "Saved AZURE_WEBAPP_NAME and AZURE_WEBAPP_PUBLISH_PROFILE to GitHub."
else
  echo "GitHub CLI not signed in. In GitHub > Settings > Secrets and variables > Actions, add:"
  echo "  variable AZURE_WEBAPP_NAME = $APP"
  echo "  secret   AZURE_WEBAPP_PUBLISH_PROFILE = contents of $PROFILE_FILE"
fi

echo
echo "Done. Site: https://$APP.azurewebsites.net (live after the first pipeline run)"
