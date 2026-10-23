terraform {
  required_version = ">= 1.6"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }

  # State stays local, one file per workspace under terraform.tfstate.d/<workspace>/
  # (gitignored). Use `terraform workspace select dev|prod` to match the .tfvars file.
}

provider "azurerm" {
  features {}

  # null falls back to ARM_SUBSCRIPTION_ID, then the Azure CLI's default subscription.
  subscription_id = var.subscription_id

  # Register only what this stack uses. The first apply in a new subscription waits
  # for these registrations, which is why it is slow.
  resource_provider_registrations = "none"
  resource_providers_to_register  = ["Microsoft.Web"]
}
