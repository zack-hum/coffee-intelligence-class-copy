variable "environment" {
  description = "Environment name, appended to every resource name (dev, prod)."
  type        = string

  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "environment must be dev or prod."
  }
}

variable "project" {
  description = "Short project name used in resource names."
  type        = string
  default     = "coffee-intel"
}

variable "location" {
  description = "Azure region. Azure for Students only allows a few regions (see `az policy assignment list`)."
  type        = string
  default     = "francecentral"
}

variable "subscription_id" {
  description = "Azure subscription ID. Leave null to use ARM_SUBSCRIPTION_ID or the Azure CLI default."
  type        = string
  default     = null
}

variable "sku_name" {
  description = "App Service plan size. F1 is free; B1 and up are paid."
  type        = string
  default     = "F1"
}

variable "node_version" {
  description = "Node.js runtime for the web app."
  type        = string
  default     = "20-lts"
}

variable "tags" {
  description = "Extra tags for every resource."
  type        = map(string)
  default     = {}
}
