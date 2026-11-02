terraform {
  required_version = ">= 1.6"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # State stays local, one file per workspace under terraform.tfstate.d/<workspace>/
  # (gitignored). Use `terraform workspace select dev|prod` to match the .tfvars file.
}

# The subscription ID is NOT written here. Terraform reads it from the
# ARM_SUBSCRIPTION_ID environment variable, so no IDs end up in Git.
provider "azurerm" {
  features {
    # Application Insights auto-creates a "Smart Detection" action group that
    # Terraform doesn't manage. Without this, `terraform destroy` fails because
    # the resource group still contains it.
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
  }

  # Register only what this stack uses. The first apply in a new subscription waits
  # for these registrations, which is why it is slow.
  resource_provider_registrations = "none"
  resource_providers_to_register = [
    "Microsoft.Web",
    "Microsoft.OperationalInsights",
    "Microsoft.Insights",
    "Microsoft.Storage",
    "Microsoft.Sql",
    "Microsoft.DBforPostgreSQL",
  ]
}
