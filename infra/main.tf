locals {
  name = "${var.project}-${var.environment}"

  tags = merge({
    project     = var.project
    environment = var.environment
    managed-by  = "terraform"
  }, var.tags)
}

resource "azurerm_resource_group" "main" {
  name     = "rg-${local.name}"
  location = var.location
  tags     = local.tags
}

# Linux App Service plan. F1 is free (60 CPU minutes a day, no always-on).
resource "azurerm_service_plan" "main" {
  name                = "asp-${local.name}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  os_type             = "Linux"
  sku_name            = var.sku_name
  tags                = local.tags
}

# The web app. Code is deployed separately with `az webapp deploy` (see README).
resource "azurerm_linux_web_app" "main" {
  name                = "app-${local.name}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  service_plan_id     = azurerm_service_plan.main.id
  https_only          = true
  tags                = local.tags

  site_config {
    always_on = false # not available on F1

    application_stack {
      node_version = var.node_version
    }
  }

  app_settings = {
    # Shown on the page so dev and prod are easy to tell apart.
    ENVIRONMENT = var.environment
  }
}
