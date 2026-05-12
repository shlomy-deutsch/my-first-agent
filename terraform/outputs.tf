output "db_private_ip" {
  value = google_sql_database_instance.db.private_ip_address
}

output "vpc_connector_path" {
  value = "projects/${var.project_id}/locations/${var.region}/connectors/${google_vpc_access_connector.connector.name}"
}

output "espv2_service_account" {
  value = google_service_account.espv2.email
}

output "db_password" {
  value     = random_password.db_password.result
  sensitive = true
}
