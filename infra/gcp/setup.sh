#!/bin/bash
# One-time Google Cloud setup for QuickBite. Run it in Cloud Shell from the repo root:
#   bash infra/gcp/setup.sh <github-owner> [repo-name]
# Creates: the needed APIs, an Artifact Registry repo, a deployer service account and a
# Cloud Build trigger that runs cloudbuild.yaml on every push to main.
# Run it again after approving the GitHub connection; every step is safe to repeat.
set -euo pipefail

OWNER="${1:?usage: setup.sh <github-owner> [repo-name]}"
REPO_NAME="${2:-quickbite-cicd}"
REGION="${REGION:-us-central1}"
PROJECT="$(gcloud config get-value project 2>/dev/null)"
[ -n "$PROJECT" ] || { echo "No project selected. Run: gcloud config set project <project-id>"; exit 1; }
NUMBER="$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')"
SA="quickbite-deployer@$PROJECT.iam.gserviceaccount.com"
CONN=quickbite-github

echo "Project $PROJECT ($NUMBER), region $REGION, repo $OWNER/$REPO_NAME"

echo "Enabling APIs (takes a minute the first time)..."
gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com secretmanager.googleapis.com iam.googleapis.com

gcloud artifacts repositories describe quickbite --location "$REGION" >/dev/null 2>&1 ||
  gcloud artifacts repositories create quickbite --location "$REGION" \
    --repository-format docker --description "QuickBite container images"
# Keep only the 5 newest images so storage stays inside the free 0.5 GB.
cat > /tmp/qb-cleanup.json <<'EOF'
[{"name":"keep-5","action":{"type":"Keep"},"mostRecentVersions":{"keepCount":5}},
 {"name":"delete-old","action":{"type":"Delete"},"condition":{"olderThan":"1d"}}]
EOF
gcloud artifacts repositories set-cleanup-policies quickbite --location "$REGION" \
  --policy /tmp/qb-cleanup.json --no-dry-run --quiet >/dev/null

gcloud iam service-accounts describe "$SA" >/dev/null 2>&1 ||
  gcloud iam service-accounts create quickbite-deployer --display-name "QuickBite pipeline"
for role in roles/run.admin roles/iam.serviceAccountUser roles/artifactregistry.writer roles/logging.logWriter; do
  gcloud projects add-iam-policy-binding "$PROJECT" --member "serviceAccount:$SA" \
    --role "$role" --condition None --quiet >/dev/null
done
echo "Deployer service account ready: $SA"

# GitHub connection (Cloud Build 2nd gen). The Cloud Build agent stores the GitHub token
# in Secret Manager, so it needs this role first.
gcloud beta services identity create --service cloudbuild.googleapis.com >/dev/null 2>&1 || true
gcloud projects add-iam-policy-binding "$PROJECT" \
  --member "serviceAccount:service-$NUMBER@gcp-sa-cloudbuild.iam.gserviceaccount.com" \
  --role roles/secretmanager.admin --condition None --quiet >/dev/null

if ! gcloud builds connections describe "$CONN" --region "$REGION" >/dev/null 2>&1; then
  gcloud builds connections create github "$CONN" --region "$REGION"
fi
stage="$(gcloud builds connections describe "$CONN" --region "$REGION" --format='value(installationState.stage)')"
if [ "$stage" != "COMPLETE" ]; then
  echo
  echo "ACTION NEEDED: open this link, sign in to GitHub and install the Cloud Build app on $REPO_NAME:"
  gcloud builds connections describe "$CONN" --region "$REGION" --format='value(installationState.actionUri)'
  echo "Then run this script again."
  exit 0
fi

REPO_RES="projects/$PROJECT/locations/$REGION/connections/$CONN/repositories/$REPO_NAME"
gcloud builds repositories describe "$REPO_NAME" --connection "$CONN" --region "$REGION" >/dev/null 2>&1 ||
  gcloud builds repositories create "$REPO_NAME" --connection "$CONN" --region "$REGION" \
    --remote-uri "https://github.com/$OWNER/$REPO_NAME.git"

if ! gcloud builds triggers describe quickbite-main --region "$REGION" >/dev/null 2>&1; then
  gcloud builds triggers create github --name quickbite-main --region "$REGION" \
    --repository "$REPO_RES" --branch-pattern '^main$' --build-config cloudbuild.yaml \
    --service-account "projects/$PROJECT/serviceAccounts/$SA" \
    --description "QuickBite CI/CD: build, test, deploy, smoke test, release"
fi

echo
echo "Done. Every push to main now runs the pipeline."
echo "Start the first run now with:"
echo "  gcloud builds triggers run quickbite-main --region $REGION --branch main"
