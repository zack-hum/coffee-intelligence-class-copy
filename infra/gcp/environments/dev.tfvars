environment        = "dev"
region             = "us-central1"
min_instances      = 0 # scales to zero: free tier, first request after idle is slow
max_instances      = 2
log_retention_days = 30
enable_sql         = false
enable_postgres    = false
