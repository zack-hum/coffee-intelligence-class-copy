environment        = "prod"
region             = "us-central1"
min_instances      = 1 # one warm instance (like Always On): billed while it exists; destroy when done
max_instances      = 3
log_retention_days = 30
enable_sql         = false
enable_postgres    = false
