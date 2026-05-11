#!/bin/bash
# Infrastructure provisioning for my-next-b12c9
# Run once: bash infrastructure/setup.sh

set -e

PROJECT_ID="my-next-b12c9"
REGION="us-central1"
VPC_NAME="myagent-vpc"
SUBNET_NAME="myagent-subnet"
VPC_CONNECTOR="myagent-connector"
DB_INSTANCE="myagent-db"
DB_NAME="myagent"
DB_USER="myagent-user"
SA_ESPV2="espv2-gateway"

echo "==> Enabling required APIs"
gcloud services enable \
  compute.googleapis.com \
  vpcaccess.googleapis.com \
  sqladmin.googleapis.com \
  endpoints.googleapis.com \
  cloudfunctions.googleapis.com \
  --project=$PROJECT_ID

# --- VPC ---
echo "==> Creating VPC"
gcloud compute networks create $VPC_NAME \
  --project=$PROJECT_ID --subnet-mode=custom

gcloud compute networks subnets create $SUBNET_NAME \
  --project=$PROJECT_ID --region=$REGION \
  --network=$VPC_NAME --range=10.0.0.0/24

# --- VPC Connector (links Cloud Functions to VPC) ---
echo "==> Creating VPC Connector"
gcloud compute networks vpc-access connectors create $VPC_CONNECTOR \
  --project=$PROJECT_ID --region=$REGION \
  --network=$VPC_NAME --range=10.8.0.0/28

# --- Private Services Access (required for Cloud SQL private IP) ---
echo "==> Setting up Private Services Access"
gcloud services enable servicenetworking.googleapis.com --project=$PROJECT_ID

gcloud compute addresses create google-managed-services \
  --global --purpose=VPC_PEERING --prefix-length=16 \
  --network=$VPC_NAME --project=$PROJECT_ID

gcloud services vpc-peerings connect \
  --service=servicenetworking.googleapis.com \
  --ranges=google-managed-services \
  --network=$VPC_NAME --project=$PROJECT_ID

# --- Cloud SQL (PostgreSQL, db-f1-micro, 10GB, private IP only) ---
echo "==> Creating Cloud SQL instance (this takes ~5 min)"
gcloud sql instances create $DB_INSTANCE \
  --project=$PROJECT_ID --region=$REGION \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --storage-size=10 \
  --storage-type=SSD \
  --network=$VPC_NAME \
  --no-assign-ip

# Save the private IP
DB_HOST=$(gcloud sql instances describe $DB_INSTANCE \
  --project=$PROJECT_ID --format='value(ipAddresses[0].ipAddress)')
echo "Cloud SQL private IP: $DB_HOST"

gcloud sql databases create $DB_NAME \
  --instance=$DB_INSTANCE --project=$PROJECT_ID

# Generate a random password and store as secret
DB_PASS=$(openssl rand -base64 16 | tr -d '/')
gcloud services enable secretmanager.googleapis.com --project=$PROJECT_ID
echo -n "$DB_PASS" | gcloud secrets create db-password \
  --project=$PROJECT_ID --data-file=-
echo -n "$DB_HOST" | gcloud secrets create db-host \
  --project=$PROJECT_ID --data-file=-

gcloud sql users create $DB_USER \
  --instance=$DB_INSTANCE --project=$PROJECT_ID --password="$DB_PASS"

# --- Messages table ---
echo "==> Creating messages table"
export PGPASSWORD="$DB_PASS"
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" << 'SQL'
CREATE TABLE IF NOT EXISTS messages (
  id          SERIAL PRIMARY KEY,
  user_id     VARCHAR(128) NOT NULL,
  user_email  VARCHAR(256),
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
SQL

# --- IAM: ESPv2 service account ---
echo "==> Creating ESPv2 service account"
gcloud iam service-accounts create $SA_ESPV2 \
  --display-name="ESPv2 API Gateway" --project=$PROJECT_ID

SA_EMAIL="$SA_ESPV2@$PROJECT_ID.iam.gserviceaccount.com"

# Allow ESPv2 SA to invoke the private saveMessage function
gcloud functions add-iam-policy-binding saveMessage \
  --region=$REGION --project=$PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/cloudfunctions.invoker" \
  --gen2

# Allow functions SA to read secrets
FUNCTIONS_SA="$PROJECT_ID@appspot.gserviceaccount.com"
gcloud secrets add-iam-policy-binding db-password \
  --project=$PROJECT_ID \
  --member="serviceAccount:$FUNCTIONS_SA" \
  --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding db-host \
  --project=$PROJECT_ID \
  --member="serviceAccount:$FUNCTIONS_SA" \
  --role="roles/secretmanager.secretAccessor"

# --- ESPv2 API Gateway ---
echo "==> Deploying Cloud Endpoints (ESPv2)"
gcloud endpoints services deploy infrastructure/openapi.yaml --project=$PROJECT_ID

echo ""
echo "Done! Add these to GitHub Secrets:"
echo "  DB_HOST=$DB_HOST"
echo "  DB_PASS=$DB_PASS  (also stored in Secret Manager as 'db-password')"
echo "  DB_NAME=$DB_NAME"
echo "  DB_USER=$DB_USER"
echo "  VPC_CONNECTOR=projects/$PROJECT_ID/locations/$REGION/connectors/$VPC_CONNECTOR"
