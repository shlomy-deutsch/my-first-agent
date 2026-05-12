# ── APIs ──────────────────────────────────────────────────────────────────────
resource "google_project_service" "apis" {
  for_each = toset([
    "compute.googleapis.com",
    "vpcaccess.googleapis.com",
    "sqladmin.googleapis.com",
    "endpoints.googleapis.com",
    "cloudfunctions.googleapis.com",
    "secretmanager.googleapis.com",
    "servicenetworking.googleapis.com",
  ])
  service            = each.value
  disable_on_destroy = false
}

# ── VPC ───────────────────────────────────────────────────────────────────────
resource "google_compute_network" "vpc" {
  name                    = "myagent-vpc"
  auto_create_subnetworks = false
  depends_on              = [google_project_service.apis]
}

resource "google_compute_subnetwork" "subnet" {
  name          = "myagent-subnet"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.vpc.id
}

# ── Private Services Access (required for Cloud SQL private IP) ───────────────
resource "google_compute_global_address" "private_ip_range" {
  name          = "google-managed-services"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc.id
}

resource "google_service_networking_connection" "private_vpc" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_range.name]
  depends_on              = [google_project_service.apis]
}

# ── VPC Connector (Cloud Functions → Cloud SQL) ───────────────────────────────
resource "google_vpc_access_connector" "connector" {
  name          = "myagent-connector"
  region        = var.region
  network       = google_compute_network.vpc.name
  ip_cidr_range = "10.8.0.0/28"
  depends_on    = [google_project_service.apis]
}

# ── Cloud SQL (PostgreSQL 15, private IP only) ────────────────────────────────
resource "google_sql_database_instance" "db" {
  name             = "myagent-db"
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier      = "db-f1-micro"
    disk_size = 10
    disk_type = "PD_SSD"

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.self_link
    }
  }

  deletion_protection = false
  depends_on          = [google_service_networking_connection.private_vpc]
}

resource "google_sql_database" "db" {
  name     = "myagent"
  instance = google_sql_database_instance.db.name
}

resource "random_password" "db_password" {
  length  = 16
  special = false
}

resource "google_sql_user" "db_user" {
  name     = "myagent-user"
  instance = google_sql_database_instance.db.name
  password = random_password.db_password.result
}

# ── Secret Manager ────────────────────────────────────────────────────────────
resource "google_secret_manager_secret" "db_password" {
  secret_id = "db-password"
  replication { auto {} }
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "db_password" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = random_password.db_password.result
}

resource "google_secret_manager_secret" "db_host" {
  secret_id = "db-host"
  replication { auto {} }
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "db_host" {
  secret      = google_secret_manager_secret.db_host.id
  secret_data = google_sql_database_instance.db.private_ip_address
}

# ── Service Account: ESPv2 API Gateway ───────────────────────────────────────
resource "google_service_account" "espv2" {
  account_id   = "espv2-gateway"
  display_name = "ESPv2 API Gateway"
}

# Allow App Engine default SA (used by Cloud Functions) to read secrets
resource "google_secret_manager_secret_iam_member" "functions_db_password" {
  secret_id = google_secret_manager_secret.db_password.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.project_id}@appspot.gserviceaccount.com"
}

resource "google_secret_manager_secret_iam_member" "functions_db_host" {
  secret_id = google_secret_manager_secret.db_host.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.project_id}@appspot.gserviceaccount.com"
}

# NOTE: ESPv2 → saveMessage invoker binding must be applied AFTER deploying
# Cloud Functions. Run once after `firebase deploy --only functions`:
#   gcloud functions add-iam-policy-binding saveMessage \
#     --region=us-central1 --project=my-next-b12c9 \
#     --member="serviceAccount:espv2-gateway@my-next-b12c9.iam.gserviceaccount.com" \
#     --role="roles/cloudfunctions.invoker" --gen2

# ── Cloud Endpoints (ESPv2 API Gateway) ──────────────────────────────────────
resource "google_endpoints_service" "api" {
  service_name   = "myagent-api.endpoints.${var.project_id}.cloud.goog"
  project        = var.project_id
  openapi_config = file("${path.module}/../infrastructure/openapi.yaml")
  depends_on     = [google_project_service.apis]
}
