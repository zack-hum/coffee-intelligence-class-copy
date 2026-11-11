output "region" {
  value = var.region
}

output "application_name" {
  description = "Beanstalk application name, for `aws elasticbeanstalk create-application-version`."
  value       = aws_elastic_beanstalk_application.app.name
}

output "environment_name" {
  description = "Beanstalk environment name, for `aws elasticbeanstalk update-environment`."
  value       = aws_elastic_beanstalk_environment.app.name
}

output "web_app_url" {
  description = "Public HTTPS URL of the web app (through CloudFront)."
  value       = "https://${aws_cloudfront_distribution.cdn.domain_name}"
}

output "beanstalk_url" {
  description = "Direct HTTP address of the instance, useful for debugging."
  value       = "http://${aws_elastic_beanstalk_environment.app.cname}"
}

output "storage_bucket_name" {
  value = aws_s3_bucket.st.bucket
}

output "sql_server_address" {
  value = var.enable_sql ? aws_db_instance.sql[0].address : null
}

output "postgres_server_address" {
  value = var.enable_postgres ? aws_db_instance.psql[0].address : null
}
