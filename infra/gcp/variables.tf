variable "project" {
  description = "Short project name used in every resource name. Lowercase letters and numbers only."
  type        = string
  default     = "coffeeint"

  validation {
    condition     = can(regex("^[a-z0-9]{3,10}$", var.project))
    error_message = "project must be 3-10 lowercase letters or numbers."
  }
}

variable "environment" {
  description = "Environment name. Must match the current workspace (dev or prod)."
  type        = string

  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "environment must be \"dev\" or \"prod\"."
  }
}

variable "region" {
  description = "GCP region, e.g. us-central1. Cloud Run's free tier is counted per billing account, not per region."
  type        = string
}

variable "min_instances" {
  description = "Cloud Run minimum instances. 0 scales to zero (free tier, cold starts, like Azure F1). 1 keeps one warm instance (billed, like Azure B1 with Always On)."
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Cloud Run maximum instances. Caps cost if the page gets traffic."
  type        = number
  default     = 2
}

variable "log_retention_days" {
  description = "How long the app's log bucket keeps data."
  type        = number
  default     = 30
}

variable "enable_sql" {
  description = "Create a Cloud SQL for SQL Server (Express) instance and database."
  type        = bool
  default     = false
}

variable "enable_postgres" {
  description = "Create a Cloud SQL for PostgreSQL instance and database."
  type        = bool
  default     = false
}
