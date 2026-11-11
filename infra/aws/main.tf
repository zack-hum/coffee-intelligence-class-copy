# AWS version of infra/azure. Each Azure piece maps to:
#   resource group         -> tags on every resource (default_tags in providers.tf)
#   App Service plan + app -> Elastic Beanstalk application + single-instance environment
#                             (Node.js 22, zip deploy: the closest AWS match to App Service)
#   https_only             -> CloudFront in front of the environment (free HTTPS on *.cloudfront.net)
#   Log Analytics + AppIns -> CloudWatch Logs streaming + Beanstalk enhanced health
#   storage account        -> S3 bucket (also holds the uploaded webapp.zip versions)
#   Azure SQL / Postgres   -> RDS for SQL Server Express / RDS for PostgreSQL
# App Runner would have been simpler, but AWS closed it to new customers in April 2026.

# ---------------------------------------------------------------------------
# Naming
# ---------------------------------------------------------------------------

# A random suffix keeps globally unique names (bucket, Beanstalk URL, databases)
# from colliding with anyone else's. Each workspace has its own state, so dev
# and prod get different suffixes.
resource "random_string" "suffix" {
  length  = 5
  upper   = false
  special = false
}

locals {
  name   = "${var.project}-${var.environment}"
  suffix = random_string.suffix.result

  tags = {
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }

  any_db = var.enable_sql || var.enable_postgres
}

# Stops the plan if the workspace and the .tfvars file don't match.
resource "terraform_data" "workspace_guard" {
  input = var.environment

  lifecycle {
    precondition {
      condition     = terraform.workspace == var.environment
      error_message = "Workspace and environment do not match. Run 'terraform workspace select ${var.environment}' or use the matching .tfvars file."
    }
  }
}

# ---------------------------------------------------------------------------
# Network: the account's default VPC (every region has one unless deleted).
# Only subnets in zones that offer the chosen instance type are used.
# ---------------------------------------------------------------------------

data "aws_vpc" "default" {
  default = true
}

data "aws_ec2_instance_type_offerings" "zones" {
  location_type = "availability-zone"

  filter {
    name   = "instance-type"
    values = [var.instance_type]
  }
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }

  filter {
    name   = "default-for-az"
    values = ["true"]
  }

  filter {
    name   = "availability-zone"
    values = data.aws_ec2_instance_type_offerings.zones.locations
  }
}

# The app instance wears this security group so the databases can allow it by
# name. Beanstalk adds its own group that opens port 80 for web traffic.
resource "aws_security_group" "app" {
  name        = "sg-app-${local.name}"
  description = "Identifies the ${local.name} web app instance"
  vpc_id      = data.aws_vpc.default.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  depends_on = [terraform_data.workspace_guard]
}

# ---------------------------------------------------------------------------
# Storage bucket (st). Uploaded webapp.zip versions go under deploy/.
# ---------------------------------------------------------------------------

resource "aws_s3_bucket" "st" {
  bucket        = "st-${local.name}-${local.suffix}"
  force_destroy = true # destroy deletes the bucket even if it has files, like Azure

  depends_on = [terraform_data.workspace_guard]
}

resource "aws_s3_bucket_public_access_block" "st" {
  bucket                  = aws_s3_bucket.st.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ---------------------------------------------------------------------------
# IAM roles Elastic Beanstalk needs
# ---------------------------------------------------------------------------

# Role the Beanstalk service uses to manage the environment and report health.
resource "aws_iam_role" "eb_service" {
  name = "eb-service-${local.name}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "elasticbeanstalk.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eb_service" {
  for_each = toset([
    "arn:aws:iam::aws:policy/service-role/AWSElasticBeanstalkEnhancedHealth",
    "arn:aws:iam::aws:policy/AWSElasticBeanstalkManagedUpdatesCustomerRolePolicy",
  ])
  role       = aws_iam_role.eb_service.name
  policy_arn = each.value
}

# Role the EC2 instance runs as (log streaming, health reporting, reading the zip).
resource "aws_iam_role" "eb_instance" {
  name = "eb-instance-${local.name}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eb_instance" {
  role       = aws_iam_role.eb_instance.name
  policy_arn = "arn:aws:iam::aws:policy/AWSElasticBeanstalkWebTier"
}

resource "aws_iam_role_policy" "eb_instance_read_deploys" {
  name = "read-deploy-bundles"
  role = aws_iam_role.eb_instance.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:GetObject"]
      Resource = "${aws_s3_bucket.st.arn}/deploy/*"
    }]
  })
}

resource "aws_iam_instance_profile" "eb_instance" {
  name = "eb-instance-${local.name}"
  role = aws_iam_role.eb_instance.name
}

# ---------------------------------------------------------------------------
# Elastic Beanstalk application + environment = the web app
# ---------------------------------------------------------------------------

# Newest Amazon Linux 2023 platform running Node.js 22 (matches Azure's 22-lts).
data "aws_elastic_beanstalk_solution_stack" "node22" {
  most_recent = true
  name_regex  = "^64bit Amazon Linux 2023 (.*) running Node.js 22$"
}

resource "aws_elastic_beanstalk_application" "app" {
  name        = "app-${local.name}"
  description = "Coffee intelligence web app (${var.environment})"

  # Keep only the 5 newest uploaded versions and delete older zips from S3.
  appversion_lifecycle {
    service_role          = aws_iam_role.eb_service.arn
    max_count             = 5
    delete_source_from_s3 = true
  }

  depends_on = [terraform_data.workspace_guard]
}

locals {
  postgres_conn_string = var.enable_postgres ? "Host=${aws_db_instance.psql[0].address};Database=${aws_db_instance.psql[0].db_name};Username=${aws_db_instance.psql[0].username};Password=${random_password.psql[0].result};SslMode=Require" : null

  # RDS for SQL Server cannot create a database at launch; connect to master
  # and create your own database there.
  sql_conn_string = var.enable_sql ? "Server=tcp:${aws_db_instance.sql[0].address},1433;Database=master;User ID=${aws_db_instance.sql[0].username};Password=${random_password.sql[0].result};Encrypt=true;" : null

  eb_settings = concat(
    [
      # One instance, no load balancer (like a single App Service plan instance).
      { namespace = "aws:elasticbeanstalk:environment", name = "EnvironmentType", value = "SingleInstance" },
      { namespace = "aws:elasticbeanstalk:environment", name = "ServiceRole", value = aws_iam_role.eb_service.arn },
      { namespace = "aws:ec2:instances", name = "InstanceTypes", value = var.instance_type },
      { namespace = "aws:autoscaling:launchconfiguration", name = "IamInstanceProfile", value = aws_iam_instance_profile.eb_instance.name },
      { namespace = "aws:autoscaling:launchconfiguration", name = "SecurityGroups", value = aws_security_group.app.id },
      # Requires IMDSv2. This also makes Beanstalk use launch templates, which new
      # AWS accounts must use (they can no longer create launch configurations).
      { namespace = "aws:autoscaling:launchconfiguration", name = "DisableIMDSv1", value = "true" },
      { namespace = "aws:ec2:vpc", name = "VPCId", value = data.aws_vpc.default.id },
      { namespace = "aws:ec2:vpc", name = "Subnets", value = join(",", data.aws_subnets.default.ids) },
      { namespace = "aws:ec2:vpc", name = "AssociatePublicIpAddress", value = "true" },
      # Monitoring: enhanced health + app logs streamed to CloudWatch, deleted with the environment.
      { namespace = "aws:elasticbeanstalk:healthreporting:system", name = "SystemType", value = "enhanced" },
      { namespace = "aws:elasticbeanstalk:cloudwatch:logs", name = "StreamLogs", value = "true" },
      { namespace = "aws:elasticbeanstalk:cloudwatch:logs", name = "RetentionInDays", value = tostring(var.log_retention_days) },
      { namespace = "aws:elasticbeanstalk:cloudwatch:logs", name = "DeleteOnTerminate", value = "true" },
      # Shown on the page so dev and prod (and each cloud) are easy to tell apart.
      { namespace = "aws:elasticbeanstalk:application:environment", name = "ENVIRONMENT", value = var.environment },
      { namespace = "aws:elasticbeanstalk:application:environment", name = "CLOUD", value = "AWS Elastic Beanstalk" },
    ],
    # Same variable names App Service gives Azure connection strings, so app
    # code that reads them works on every cloud unchanged.
    var.enable_postgres ? [{ namespace = "aws:elasticbeanstalk:application:environment", name = "POSTGRESQLCONNSTR_PostgresDb", value = local.postgres_conn_string }] : [],
    var.enable_sql ? [{ namespace = "aws:elasticbeanstalk:application:environment", name = "SQLAZURECONNSTR_SqlDb", value = local.sql_conn_string }] : [],
  )
}

# Starts with Beanstalk's sample app. The real code is uploaded with the AWS
# CLI (see README), the same way Azure's goes out with `az webapp deploy`.
resource "aws_elastic_beanstalk_environment" "app" {
  name                = "env-${local.name}-${local.suffix}"
  cname_prefix        = "${local.name}-${local.suffix}"
  application         = aws_elastic_beanstalk_application.app.name
  solution_stack_name = data.aws_elastic_beanstalk_solution_stack.node22.name
  tier                = "WebServer"

  dynamic "setting" {
    for_each = local.eb_settings
    content {
      namespace = setting.value.namespace
      name      = setting.value.name
      value     = setting.value.value
    }
  }

  # A newer Node 22 platform version appears every few weeks. Upgrade on purpose
  # (remove this, plan, apply) instead of on whatever apply happens next.
  lifecycle {
    ignore_changes = [solution_stack_name]
  }

  depends_on = [
    aws_iam_role_policy_attachment.eb_service,
    aws_iam_role_policy_attachment.eb_instance,
  ]
}

# ---------------------------------------------------------------------------
# CloudFront (cdn): HTTPS in front of the environment (Azure's https_only).
# Caching is off, so every request reaches the app, like App Service.
# ---------------------------------------------------------------------------

data "aws_cloudfront_cache_policy" "disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_origin_request_policy" "all_viewer" {
  name = "Managed-AllViewerExceptHostHeader"
}

resource "aws_cloudfront_distribution" "cdn" {
  enabled         = true
  comment         = "HTTPS front door for ${local.name}"
  price_class     = "PriceClass_100" # North America and Europe edges only: cheapest
  is_ipv6_enabled = true

  origin {
    origin_id   = "beanstalk"
    domain_name = aws_elastic_beanstalk_environment.app.cname

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only" # the single instance has no certificate
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id         = "beanstalk"
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods           = ["GET", "HEAD"]
    cache_policy_id          = data.aws_cloudfront_cache_policy.disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer.id
    compress                 = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

# ---------------------------------------------------------------------------
# Databases share a subnet group and a security group that only lets the app in.
# This replaces Azure's "allow Azure services" firewall rule, which is broader.
# ---------------------------------------------------------------------------

resource "aws_db_subnet_group" "db" {
  count      = local.any_db ? 1 : 0
  name       = "dbsubnets-${local.name}"
  subnet_ids = data.aws_subnets.default.ids
}

resource "aws_security_group" "db" {
  count       = local.any_db ? 1 : 0
  name        = "sg-db-${local.name}"
  description = "Database access for the ${local.name} web app only"
  vpc_id      = data.aws_vpc.default.id

  dynamic "ingress" {
    for_each = concat(var.enable_sql ? [1433] : [], var.enable_postgres ? [5432] : [])
    content {
      from_port       = ingress.value
      to_port         = ingress.value
      protocol        = "tcp"
      security_groups = [aws_security_group.app.id]
    }
  }
}

# ---------------------------------------------------------------------------
# OPTIONAL: RDS for SQL Server Express (sql). enable_sql = true.
# ---------------------------------------------------------------------------

resource "random_password" "sql" {
  count            = var.enable_sql ? 1 : 0
  length           = 24
  special          = true
  override_special = "!#%^*()-_=+" # RDS rejects / @ " and spaces
}

resource "aws_db_instance" "sql" {
  count                  = var.enable_sql ? 1 : 0
  identifier             = "sql-${local.name}-${local.suffix}"
  engine                 = "sqlserver-ex"
  license_model          = "license-included"
  instance_class         = "db.t3.micro"
  allocated_storage      = 20
  username               = "sqladmin${var.environment}"
  password               = random_password.sql[0].result
  db_subnet_group_name   = aws_db_subnet_group.db[0].name
  vpc_security_group_ids = [aws_security_group.db[0].id]
  publicly_accessible    = false
  skip_final_snapshot    = true # destroy without leaving a billed snapshot
  deletion_protection    = false
}

# ---------------------------------------------------------------------------
# OPTIONAL: RDS for PostgreSQL (psql). enable_postgres = true.
# ---------------------------------------------------------------------------

resource "random_password" "psql" {
  count   = var.enable_postgres ? 1 : 0
  length  = 24
  special = false
}

resource "aws_db_instance" "psql" {
  count                  = var.enable_postgres ? 1 : 0
  identifier             = "psql-${local.name}-${local.suffix}"
  engine                 = "postgres"
  engine_version         = "16"
  instance_class         = "db.t4g.micro"
  allocated_storage      = 20
  db_name                = "appdb"
  username               = "psqladmin"
  password               = random_password.psql[0].result
  db_subnet_group_name   = aws_db_subnet_group.db[0].name
  vpc_security_group_ids = [aws_security_group.db[0].id]
  publicly_accessible    = false
  skip_final_snapshot    = true
  deletion_protection    = false
}
