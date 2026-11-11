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
  description = "AWS region, e.g. us-east-1."
  type        = string
}

variable "instance_type" {
  description = "EC2 size for the Elastic Beanstalk instance. t3.micro is free-tier eligible; anything bigger is billed hourly."
  type        = string
  default     = "t3.micro"
}

variable "log_retention_days" {
  description = "How long CloudWatch keeps the app's logs. Must be a value CloudWatch accepts."
  type        = number
  default     = 30

  validation {
    condition     = contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365], var.log_retention_days)
    error_message = "log_retention_days must be one of 1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365."
  }
}

variable "enable_sql" {
  description = "Create an RDS for SQL Server Express instance."
  type        = bool
  default     = false
}

variable "enable_postgres" {
  description = "Create an RDS for PostgreSQL instance."
  type        = bool
  default     = false
}
