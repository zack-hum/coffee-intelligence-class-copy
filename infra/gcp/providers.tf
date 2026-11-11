terraform {
  required_version = ">= 1.6"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 6.10, < 8.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # State stays local, one file per workspace under terraform.tfstate.d/<workspace>/
  # (gitignored). Use `terraform workspace select dev|prod` to match the .tfvars file.
}

# The project ID is NOT written here. Terraform reads it from the
# GOOGLE_PROJECT environment variable, so no IDs end up in Git.
# Credentials come from `gcloud auth application-default login`.
provider "google" {
  region = var.region

  # Added to every resource that supports labels (the GCP version of Azure tags).
  default_labels = local.labels
}
