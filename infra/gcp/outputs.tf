output "project_id" {
  description = "GCP project everything was created in."
  value       = local.project
}

output "region" {
  value = var.region
}

output "service_name" {
  description = "Cloud Run service name, for `gcloud run deploy`."
  value       = google_cloud_run_v2_service.app.name
}

output "web_app_url" {
  description = "Public URL of the web app."
  value       = google_cloud_run_v2_service.app.uri
}

output "image" {
  description = "Where the webapp image is pushed, for `gcloud builds submit --pack image=...`."
  value       = local.image
}

output "build_service_account" {
  description = "Service account Cloud Build runs as."
  value       = google_service_account.build.email
}

output "storage_bucket_name" {
  value = google_storage_bucket.st.name
}

output "sql_connection_name" {
  value = var.enable_sql ? google_sql_database_instance.sql[0].connection_name : null
}

output "postgres_connection_name" {
  value = var.enable_postgres ? google_sql_database_instance.psql[0].connection_name : null
}
