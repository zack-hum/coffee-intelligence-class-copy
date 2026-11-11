terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # State stays local, one file per workspace under terraform.tfstate.d/<workspace>/
  # (gitignored). Use `terraform workspace select dev|prod` to match the .tfvars file.
}

# No account ID or keys are written here. Terraform uses the AWS CLI's
# credentials: run `aws configure` (or `aws sso login`) first, or set AWS_PROFILE.
provider "aws" {
  region = var.region

  # Added to every resource that supports tags.
  default_tags {
    tags = local.tags
  }
}
