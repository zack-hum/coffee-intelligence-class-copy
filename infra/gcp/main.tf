# Google Cloud version of infra/azure. Each Azure piece maps to:
#   resource group         -> the GCP project itself (plus labels on every resource)
#   App Service plan + app -> Cloud Run service (min instances replaces the F1/B1 choice)
#   Log Analytics + AppIns -> a dedicated Cloud Logging bucket (Cloud Run metrics are built in)
#   storage account        -> Cloud Storage bucket
#   Azure SQL / Postgres   -> Cloud SQL for SQL Server Express / Cloud SQL for PostgreSQL
# Extra pieces Cloud Run needs: an Artifact Registry repo for the built image and two
# service accounts (one the app runs as, one Cloud Build uses to build the image).

# ---------------------------------------------------------------------------
# Naming
# ---------------------------------------------------------------------------

# A random suffix keeps globally unique names (bucket, SQL instances) from
# colliding with anyone else's. Each workspace has its own state, so dev and
# prod get different suffixes.
resource "random_string" "suffix" {
  length  = 5
  upper   = false
  special = false
}

locals {
  name    = "${var.project}-${var.environment}"
  suffix  = random_string.suffix.result
  project = data.google_client_config.current.project

  labels = {
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }

  apis = toset(concat(
    [
      "run.googleapis.com",
      "artifactregistry.googleapis.com",
      "cloudbuild.googleapis.com",
      "iam.googleapis.com",
      "logging.googleapis.com",
      "storage.googleapis.com",
    ],
    var.enable_sql || var.enable_postgres ? ["sqladmin.googleapis.com"] : [],
  ))

  image = "${var.region}-docker.pkg.dev/${local.project}/${google_artifact_registry_repository.ar.repository_id}/webapp"
}

data "google_client_config" "current" {}

# Stops the plan if the workspace and the .tfvars file don't match.
resource "terraform_data" "workspace_guard" {
  input = var.environment

  lifecycle {
    precondition {
      condition     = terraform.workspace == var.environment
      error_message = "Workspace and environment do not match. Run 'terraform workspace select ${var.environment}' or use the matching .tfvars file."
    }
    precondition {
      condition     = local.project != null && local.project != ""
      error_message = "No GCP project set. Set the GOOGLE_PROJECT environment variable (see README)."
    }
  }
}

# ---------------------------------------------------------------------------
# APIs. A new project has most services switched off. Turning them on is slow
# the first time, which is why the first apply in a new project takes a while.
# disable_on_destroy = false: destroy removes our resources but leaves the APIs on.
# ---------------------------------------------------------------------------

resource "google_project_service" "apis" {
  for_each           = local.apis
  service            = each.value
  disable_on_destroy = false

  depends_on = [terraform_data.workspace_guard]
}

# ---------------------------------------------------------------------------
# Logging: a dedicated log bucket (stands in for Log Analytics + App Insights)
# ---------------------------------------------------------------------------

resource "google_logging_project_bucket_config" "logs" {
  project        = local.project
  location       = "global"
  bucket_id      = "logs-${local.name}-${local.suffix}"
  retention_days = var.log_retention_days
  description    = "Cloud Run logs for ${local.name}"

  depends_on = [google_project_service.apis]
}

# Copies this service's logs into the bucket above. They also stay in the
# project's _Default bucket, which keeps them 30 days.
resource "google_logging_project_sink" "app" {
  name                   = "sink-${local.name}"
  destination            = "logging.googleapis.com/${google_logging_project_bucket_config.logs.id}"
  filter                 = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"run-${local.name}\""
  unique_writer_identity = true
}

# ---------------------------------------------------------------------------
# Storage bucket (st). Also holds Cloud Build's uploaded source and build logs
# under source/ and build-logs/, which are deleted after 30 days.
# ---------------------------------------------------------------------------

resource "google_storage_bucket" "st" {
  name                        = "st-${local.name}-${local.suffix}"
  location                    = var.region
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = true # destroy deletes the bucket even if it has files, like Azure

  lifecycle_rule {
    condition {
      age            = 30
      matches_prefix = ["source/", "build-logs/"]
    }
    action {
      type = "Delete"
    }
  }

  depends_on = [google_project_service.apis]
}

# ---------------------------------------------------------------------------
# Artifact Registry (ar): where the built webapp image is stored.
# Keeps the 3 newest images and deletes older ones so storage stays in the free tier.
# ---------------------------------------------------------------------------

resource "google_artifact_registry_repository" "ar" {
  repository_id          = "ar-${local.name}"
  location               = var.region
  format                 = "DOCKER"
  description            = "Container images for ${local.name}"
  cleanup_policy_dry_run = false

  cleanup_policies {
    id     = "keep-newest-3"
    action = "KEEP"
    most_recent_versions {
      keep_count = 3
    }
  }

  cleanup_policies {
    id     = "delete-older-than-7-days"
    action = "DELETE"
    condition {
      tag_state  = "ANY"
      older_than = "604800s"
    }
  }

  depends_on = [google_project_service.apis]
}

# ---------------------------------------------------------------------------
# Service accounts
# ---------------------------------------------------------------------------

# The identity the web app runs as (instead of the broad default compute account).
resource "google_service_account" "run" {
  account_id   = "run-${local.name}"
  display_name = "Cloud Run app (${local.name})"

  depends_on = [google_project_service.apis]
}

resource "google_project_iam_member" "run_roles" {
  for_each = toset(concat(
    ["roles/logging.logWriter", "roles/monitoring.metricWriter"],
    var.enable_sql || var.enable_postgres ? ["roles/cloudsql.client"] : [],
  ))
  project = local.project
  role    = each.value
  member  = "serviceAccount:${google_service_account.run.email}"
}

# The identity Cloud Build uses to turn webapp/ into an image (see README).
resource "google_service_account" "build" {
  account_id   = "build-${local.name}"
  display_name = "Cloud Build for webapp (${local.name})"

  depends_on = [google_project_service.apis]
}

resource "google_project_iam_member" "build_logs" {
  project = local.project
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.build.email}"
}

resource "google_artifact_registry_repository_iam_member" "build_push" {
  location   = google_artifact_registry_repository.ar.location
  repository = google_artifact_registry_repository.ar.name
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${google_service_account.build.email}"
}

resource "google_storage_bucket_iam_member" "build_staging" {
  bucket = google_storage_bucket.st.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.build.email}"
}

# ---------------------------------------------------------------------------
# Cloud Run service (run) = the web app
# ---------------------------------------------------------------------------

locals {
  postgres_conn_string = var.enable_postgres ? "Host=/cloudsql/${google_sql_database_instance.psql[0].connection_name};Database=${google_sql_database.psqldb[0].name};Username=${google_sql_user.psql[0].name};Password=${random_password.psql[0].result}" : null

  # SQL Server has no Unix socket on Cloud Run, so a Cloud SQL Auth Proxy sidecar
  # listens on localhost:1433 and tunnels to the instance.
  sql_conn_string = var.enable_sql ? "Server=tcp:127.0.0.1,1433;Database=${google_sql_database.sqldb[0].name};User ID=sqlserver;Password=${random_password.sql[0].result};Encrypt=false;" : null
}

# Terraform creates the service with Google's public "hello" image. The real
# webapp image is built and deployed with gcloud (see README), the same way
# Azure's code goes out with `az webapp deploy`. ignore_changes stops Terraform
# from rolling the image back to "hello" on the next apply.
resource "google_cloud_run_v2_service" "app" {
  name                = "run-${local.name}"
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false # lets `terraform destroy` remove it

  template {
    service_account = google_service_account.run.email

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    containers {
      name  = "app"
      image = "us-docker.pkg.dev/cloudrun/container/hello"

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        cpu_idle = true # only billed while handling requests
      }

      # Shown on the page so dev and prod (and each cloud) are easy to tell apart.
      env {
        name  = "ENVIRONMENT"
        value = var.environment
      }
      env {
        name  = "CLOUD"
        value = "Google Cloud Run"
      }

      # Same variable names App Service gives Azure connection strings, so app
      # code that reads them works on every cloud unchanged.
      dynamic "env" {
        for_each = var.enable_postgres ? [1] : []
        content {
          name  = "POSTGRESQLCONNSTR_PostgresDb"
          value = local.postgres_conn_string
        }
      }

      dynamic "env" {
        for_each = var.enable_sql ? [1] : []
        content {
          name  = "SQLAZURECONNSTR_SqlDb"
          value = local.sql_conn_string
        }
      }

      dynamic "volume_mounts" {
        for_each = var.enable_postgres ? [1] : []
        content {
          name       = "cloudsql"
          mount_path = "/cloudsql"
        }
      }
    }

    dynamic "containers" {
      for_each = var.enable_sql ? [1] : []
      content {
        name  = "cloud-sql-proxy"
        image = "gcr.io/cloud-sql-connectors/cloud-sql-proxy:2.14.1"
        args  = ["--port=1433", google_sql_database_instance.sql[0].connection_name]

        resources {
          limits = {
            cpu    = "1"
            memory = "256Mi"
          }
        }
      }
    }

    dynamic "volumes" {
      for_each = var.enable_postgres ? [1] : []
      content {
        name = "cloudsql"
        cloud_sql_instance {
          instances = [google_sql_database_instance.psql[0].connection_name]
        }
      }
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
      client,
      client_version,
    ]
  }

  depends_on = [google_project_iam_member.run_roles]
}

# Public page, like the Azure web app. Some school or company organizations
# block "allUsers" with an org policy; if apply fails here, that is why.
resource "google_cloud_run_v2_service_iam_member" "public" {
  name     = google_cloud_run_v2_service.app.name
  location = google_cloud_run_v2_service.app.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ---------------------------------------------------------------------------
# OPTIONAL: Cloud SQL for SQL Server Express (sql + sqldb). enable_sql = true.
# Express has no license fee, but the instance itself is billed while it exists.
# ---------------------------------------------------------------------------

resource "random_password" "sql" {
  count            = var.enable_sql ? 1 : 0
  length           = 24
  special          = true
  override_special = "!#%^*()-_=+"
}

resource "google_sql_database_instance" "sql" {
  count               = var.enable_sql ? 1 : 0
  name                = "sql-${local.name}-${local.suffix}"
  region              = var.region
  database_version    = "SQLSERVER_2022_EXPRESS"
  root_password       = random_password.sql[0].result
  deletion_protection = false

  settings {
    edition         = "ENTERPRISE"
    tier            = "db-custom-1-3840"
    disk_size       = 10
    disk_autoresize = false
    user_labels     = local.labels

    # Public IP, but no authorized networks: the only way in is through the
    # Cloud SQL Auth Proxy, which checks IAM. Replaces Azure's "allow Azure services" rule.
    ip_configuration {
      ipv4_enabled = true
      ssl_mode     = "ENCRYPTED_ONLY"
    }
  }

  depends_on = [google_project_service.apis]
}

resource "google_sql_database" "sqldb" {
  count    = var.enable_sql ? 1 : 0
  name     = "sqldb-${local.name}"
  instance = google_sql_database_instance.sql[0].name
}

# ---------------------------------------------------------------------------
# OPTIONAL: Cloud SQL for PostgreSQL (psql + psqldb). enable_postgres = true.
# db-f1-micro is the smallest shared-core tier; billed while it exists.
# ---------------------------------------------------------------------------

resource "random_password" "psql" {
  count   = var.enable_postgres ? 1 : 0
  length  = 24
  special = false
}

resource "google_sql_database_instance" "psql" {
  count               = var.enable_postgres ? 1 : 0
  name                = "psql-${local.name}-${local.suffix}"
  region              = var.region
  database_version    = "POSTGRES_16"
  deletion_protection = false

  settings {
    edition         = "ENTERPRISE" # db-f1-micro is not offered on Enterprise Plus
    tier            = "db-f1-micro"
    disk_size       = 10
    disk_autoresize = false
    user_labels     = local.labels

    ip_configuration {
      ipv4_enabled = true
      ssl_mode     = "ENCRYPTED_ONLY"
    }
  }

  depends_on = [google_project_service.apis]
}

resource "google_sql_database" "psqldb" {
  count     = var.enable_postgres ? 1 : 0
  name      = "appdb"
  instance  = google_sql_database_instance.psql[0].name
  charset   = "UTF8"
  collation = "en_US.UTF8"
}

resource "google_sql_user" "psql" {
  count    = var.enable_postgres ? 1 : 0
  name     = "psqladmin"
  instance = google_sql_database_instance.psql[0].name
  password = random_password.psql[0].result
}
