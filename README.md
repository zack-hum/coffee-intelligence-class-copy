# coffee-intelligence-v1.1

[![CI](https://github.com/zack-hum/coffee-intelligence-v1.1/actions/workflows/ci.yml/badge.svg)](https://github.com/zack-hum/coffee-intelligence-v1.1/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Python 3.10+](https://img.shields.io/badge/python-3.10%2B-blue)

Global coffee supply chain intelligence platform for tracking specialty and commodity coffee markets, origin-level trends, news, and supply chain data. Ability to be customized for roasters, green buyers, importers/exporters, cafes, etc.

Data streams, APIs, newsletters, and sources are all free- paid subscriptions would quickly improve product quality.

Dedicated Costa Rica tab because of my upcoming personal trip ;)

## Features

- **Market:** delayed ICE arabica "C" futures, US dollar index, USD/BRL and 16 origin currencies, with intraday to 5-year charts.
- **News archive:** about 65 sources (publisher RSS, Google News and GDELT) in English, Spanish, Portuguese, Vietnamese, Indonesian and French. De-duplicated and tagged by origin, topic and likely price direction, with full-text search and filters.
- **Origins:** 18 origin pages with the implied local price from your own differential, exchange rate, current and forecast weather, a year of rainfall, US import volumes and prices, and origin news.
- **Costa Rica:** all 8 ICAFE regions with harvest calendars, weather, 16-day rain forecasts, regional news, a trip planner and a price calculator (USD/lb, ₡/kg, ₡ per quintal).
- **Data:** CFTC speculator positioning, IMF monthly arabica and robusta prices, ENSO (El Niño/La Niña), US Census imports by origin, and USDA supply and demand (optional key).
- **Sourcing CRM:** a Pipedrive-style workspace for green-coffee sourcing: organizations (farms, micro-mills, co-ops, exporters…), people, a deal pipeline from *Prospect* through samples and cupping to *Arrived*, activities with a due-soon list, notes and sample tracking. Costa Rica fields (exporter of record, dry mill, ICAFE registration, EUDR geolocation, liquidación). Optional seed list of ~40 public Costa Rican suppliers (Cup of Excellence 2024–26 winners, major co-ops and exporters), each source-linked and marked unverified. CSV export and import for every list. Also runs on its own (`./dev.sh crm`).
- **Source health:** a Sources page showing the last run, item count and error for every feed and dataset.

## Quick start

You need **Python 3.10 or newer** (`python --version`). On Windows, install it from [python.org](https://www.python.org/downloads/) and tick **Add python.exe to PATH**.

```bash
git clone https://github.com/<owner>/coffee-intelligence-v1.1.git
cd coffee-intelligence-v1.1
```

| | Windows | macOS / Linux |
|---|---|---|
| Demo mode: offline, synthetic data | `dev.bat` | `./dev.sh` |
| Live mode: real sources | `dev.bat live` | `./dev.sh live` |
| Run tests | `dev.bat test` | `./dev.sh test` |
| Sourcing CRM on its own (port 8081) | `dev.bat crm` | `./dev.sh crm` |
| Delete local archives | `dev.bat reset` | `./dev.sh reset` |
| Production container (needs Docker) | | `./dev.sh docker` |

Then open http://localhost:8080. In PowerShell, type `.\dev.bat`. If `./dev.sh` reports "permission denied", run `bash dev.sh` or `chmod +x dev.sh`.

The first run creates a `.venv`, installs dependencies (about a minute) and copies `.env.example` to `.env`. Stop the server with **Ctrl+C**. To use another port: `PORT=9000 ./dev.sh` or `set PORT=9000 && dev.bat`.

### Modes

| | demo | live | cloud |
|---|---|---|---|
| Prices | Synthetic, moving minute to minute | Yahoo (delayed) | Yahoo (delayed) |
| News | Fixture archive, plus a new demo headline every 45 s | All real sources, every 15 min | Same, triggered by Cloud Scheduler |
| Datasets | Fixtures | Real, every 6 h | Real, daily; prices and weather every 3 h |
| Archive | `data/demo.db` (SQLite) | `data/live.db` (SQLite) | Firestore |
| Internet needed | No | Yes | Yes |
| Dev page | Yes | Yes | Off |

Each mode keeps its own archive, so demo and real data never mix.

## Configuration

Settings come from environment variables, falling back to `.env`. Command-line and real environment variables always win.

| Variable | Default | Purpose |
|---|---|---|
| `APP_MODE` | `demo` locally, `cloud` on Cloud Run | `demo`, `live` or `cloud` |
| `CENSUS_API_KEY` | none | **Needed for US imports data.** Free: https://api.census.gov/data/key_signup.html |
| `FAS_API_KEY` | none | Enables USDA supply and demand data. Free: https://apps.fas.usda.gov/opendatawebv2/#/signup |
| `DASH_PASSWORD` | none | Requires HTTP basic auth (any username) for the whole app. Always set it on a public server. |
| `NEWS_EVERY` / `DATA_EVERY` | `900` / `21600` | Live-mode ingestion intervals, in seconds |
| `DEMO_DRIP_SECONDS` | `45` | Seconds between new demo headlines |
| `DEV_TOOLS` | on locally, off in cloud | Shows the Dev page (`#/dev`) |
| `ARABICA_SYMBOLS` | `KC=F` | Yahoo symbols to try for arabica, comma-separated |
| `QUOTE_TTL` / `WEATHER_TTL` | `60` / `1800` | Cache lifetimes, in seconds |
| `PORT` | `8080` | Local server port |

Without keys, everything except US imports and USDA data works.

## Project layout

```
app/
  main.py          FastAPI app: API endpoints, auth, in-process ingestion loop
  config.py        Origins, Costa Rica regions, feeds, queries, dataset settings
  tagging.py       Keyword tagging: coffee relevance, origins, topics, price signal
  sources.py       Live fetchers (Yahoo, FX fallback, Open-Meteo) with a TTL cache
  store.py         Archive storage: SQLite (local) and Firestore (cloud)
  settings.py      Run modes and .env loading
  dev.py           Dev page API (local only)
  crm/             Sourcing CRM module: schema.py (all fields), store.py (SQLite/Firestore),
                   service.py (validation, CSV, seed), router.py (/api/crm), standalone.py,
                   seed_cr.json (public Costa Rica suppliers), static/ (crm.js, crm.css)
  ingest/          News and dataset ingestion jobs
  demo/            Offline fixtures and the demo headline generator
  static/          Single-page frontend (vanilla JS, no build step)
tests/             Offline tests (pytest)
infra/             Terraform, one folder per cloud: azure/ (App Service), gcp/ (Cloud Run),
                   aws/ (Elastic Beanstalk + CloudFront); each has environments/ with dev and prod .tfvars
webapp/            Node.js page deployed to the web app on each cloud
```

The server reloads when you save a file under `app/`; refresh the browser to see the change. The Dev page has on-demand ingestion, a tagging playground that shows which keywords fired for any headline, and a feed tester for previewing an RSS feed before adding it to `app/config.py`.

## Data sources and terms of use

| Data | Source | Frequency | Key |
|---|---|---|---|
| Arabica futures, DXY, origin currencies | Yahoo Finance chart API (unofficial) | Live, delayed; daily closes archived | No |
| FX fallback | open.er-api.com | Daily | No |
| Weather and forecasts | Open-Meteo forecast and archive APIs | Every 3 h | No |
| Commitments of Traders, Coffee C | CFTC public reporting API | Weekly | No |
| IMF arabica (Other Milds) and robusta prices | FRED | Monthly | No |
| ENSO / Oceanic Niño Index | NOAA Climate Prediction Center | Monthly | No |
| US green coffee imports by origin (HS 090111) | US Census international trade API | Monthly | Yes |
| Production, exports, stocks by country | USDA FAS PSD API | Monthly | Yes |
| News | Publisher RSS, Google News RSS, GDELT DOC 2.0 | Every 15 min | No |
| CRM seed list: Costa Rica suppliers | Alliance for Coffee Excellence (Cup of Excellence 2024–26 results), PROCOMER *Buy from Costa Rica*, public co-op/exporter pages | Static file, curated by hand | No |

**Publisher RSS:** Daily Coffee News, Sprudge, Barista Magazine, Coffee Review, Tea & Coffee Trade Journal, Fresh Cup.

**Google News:** global market, crop, policy, logistics and industry topics; a local-language and an English query for each origin; and Costa Rica queries. Outlets that block automated feed access (Perfect Daily Grind, Comunicaffe, European Coffee Trip, The Tico Times, Global Coffee Report, World Coffee Portal, Barchart and others) are reached through Google News `site:` queries instead.

**CRM seed list:** ACE allows its farm information to be used to help sell the winning coffees; we store a curated list (farm, published producer name, region, score, price, process, variety) for personal sourcing research, never cupping-note text, and link every lot back to ACE. No personal contact details are included; contacts are only what you enter yourself.

**Please respect the sources.** Data belongs to its providers and their terms apply to your use of it, not this project's MIT license. Yahoo Finance and Google News RSS are unofficial endpoints with no service guarantee, so use them for personal research, not redistribution. Only headlines and short excerpts (up to 280 characters) are stored, and every item links back to the publisher. Keep request rates modest; the defaults follow GDELT's guidance of one request per 5 seconds.

### Tagging

Each story is checked for coffee relevance, then tagged with origins and Costa Rica regions (using local-language place names), one or more of 13 topics, and a **bullish/bearish signal** from supply and price keywords such as frost, drought, bumper crop and plunge. The signal is a heuristic for triage only. All keyword lists are in `app/tagging.py`.

## Deploy to the cloud (Terraform)

The same `webapp/` page can be hosted on Azure, Google Cloud or AWS. Each cloud has its own Terraform folder under `infra/` with its own state, so they can be deployed, used and destroyed independently. All three follow the same pattern: `dev` and `prod` workspaces matched to `environments/*.tfvars` (the plan stops if they don't match), a random 5-character suffix on globally unique names, a storage bucket, monitoring, and optional SQL Server and PostgreSQL databases that are off by default and cost money while they exist. Database connection strings use the same environment variable names on every cloud (`POSTGRESQLCONNSTR_PostgresDb`, `SQLAZURECONNSTR_SqlDb`), so app code reading them works unchanged.

| Azure | Google Cloud | AWS |
|---|---|---|
| Resource group | The project, plus labels | Tags |
| App Service plan + web app (F1 / B1) | Cloud Run service (min instances 0 / 1) | Elastic Beanstalk single-instance environment (t3.micro / t3.small) |
| `https_only` | Built in | CloudFront in front of Beanstalk |
| Application Insights + Log Analytics | Dedicated Cloud Logging bucket | CloudWatch Logs + Beanstalk enhanced health |
| Storage account | Cloud Storage bucket | S3 bucket |
| Azure SQL / PostgreSQL flexible server | Cloud SQL for SQL Server Express / PostgreSQL | RDS for SQL Server Express / PostgreSQL |
| `az webapp deploy` (zip) | Cloud Build makes an image, `gcloud run deploy` | Zip to S3, `aws elasticbeanstalk update-environment` |

### Azure (`infra/azure`)

Each environment gets its own resource group holding a Linux App Service plan (dev: free F1; prod: B1, billed hourly, so destroy it when done), a Node 22 web app whose `ENVIRONMENT` setting is the environment name, Application Insights backed by a Log Analytics workspace, and a storage account. An Azure SQL or PostgreSQL database can be added with `enable_sql = true` or `enable_postgres = true` in the `.tfvars` file; both are off by default and cost money while they exist. The web app, storage account and database names end in a random 5-character suffix, because those names must be unique across all of Azure. `webapp/` is a small Node.js page deployed to the web app that shows the `ENVIRONMENT` setting, so dev and prod are easy to tell apart.

Requirements: Terraform 1.6+, the Azure CLI signed in (`az login`), and your subscription ID in `ARM_SUBSCRIPTION_ID`.

```powershell
cd infra\azure
$env:ARM_SUBSCRIPTION_ID = az account show --query id -o tsv
terraform init
terraform workspace new dev        # or: terraform workspace select dev
terraform plan -var-file="environments/dev.tfvars" -out="dev.tfplan"
terraform apply "dev.tfplan"
```

Keep the workspace and the `.tfvars` file matched (`dev` with `dev.tfvars`, `prod` with `prod.tfvars`). The plan stops with an error if they don't match. Every resource name includes the environment name.

Deploy the code (zip the *contents* of `webapp/`, not the folder):

```powershell
Compress-Archive -Path webapp\* -DestinationPath webapp.zip -Force
cd infra\azure
terraform workspace show   # must say dev
az webapp deploy --resource-group "$(terraform output -raw resource_group_name)" --name "$(terraform output -raw web_app_name)" --src-path ..\..\webapp.zip --type zip
```

Then open `terraform output web_app_url`. F1 is free but limited to 60 CPU minutes a day and sleeps when idle, so the first request can take a few seconds.

**Tear down:** `terraform destroy -var-file="environments/dev.tfvars"`.

> **Moved from `infra/` to `infra/azure/`.** If you already deployed from the old folder, move your local state before running anything: `Move-Item infra\terraform.tfstate.d infra\azure\`, delete `infra\.terraform`, then `cd infra\azure` and `terraform init`. `terraform plan` should then show no changes.

### Google Cloud (`infra/gcp`)

Each environment gets a Cloud Run service (dev scales to zero, which stays in the free tier but makes the first request after idle slow; prod keeps one instance warm and is billed while it exists), an Artifact Registry repository for the webapp image (keeps the 3 newest), a Cloud Storage bucket, a log bucket with the chosen retention, and two service accounts: one the app runs as and one Cloud Build uses. Terraform switches on the APIs it needs, so the first apply in a new project is slow. The service starts with Google's sample "hello" image until you deploy the webapp.

Requirements: Terraform 1.6+, the gcloud CLI signed in (`gcloud auth login` and `gcloud auth application-default login`), a project with billing linked, and the project ID in `GOOGLE_PROJECT`.

```powershell
cd infra\gcp
$env:GOOGLE_PROJECT = "your-project-id"
terraform init
terraform workspace new dev        # or: terraform workspace select dev
terraform plan -var-file="environments/dev.tfvars" -out="dev.tfplan"
terraform apply "dev.tfplan"
```

Deploy the code. Cloud Build turns `webapp/` into an image with buildpacks (no Dockerfile needed), then Cloud Run switches to it:

```powershell
cd infra\gcp
terraform workspace show   # must say dev
$project = terraform output -raw project_id
$region  = terraform output -raw region
$image   = terraform output -raw image
$bucket  = terraform output -raw storage_bucket_name
$builder = terraform output -raw build_service_account
gcloud builds submit ..\..\webapp --project $project --region $region --pack "image=$image" --service-account "projects/$project/serviceAccounts/$builder" --gcs-source-staging-dir "gs://$bucket/source" --gcs-log-dir "gs://$bucket/build-logs"
gcloud run deploy (terraform output -raw service_name) --project $project --region $region --container app --image $image
```

Then open `terraform output web_app_url`.

**Tear down:** `terraform destroy -var-file="environments/dev.tfvars"`. The APIs stay switched on (they cost nothing). If the project's organization blocks public services, the `allUsers` invoker binding fails on apply; ask the org admin or use a personal project.

### AWS (`infra/aws`)

Each environment gets an Elastic Beanstalk application and a single-instance Node.js 22 environment (no load balancer; dev on free-tier-eligible t3.micro, prod on t3.small, billed hourly), a CloudFront distribution that adds HTTPS on a `*.cloudfront.net` address, app logs streamed to CloudWatch with the chosen retention, an S3 bucket, and the IAM roles Beanstalk needs. It uses the account's default VPC. The environment starts with Beanstalk's sample app until you deploy the webapp. AWS App Runner, the closer match to App Service, stopped accepting new customers in April 2026, so it isn't used.

Requirements: Terraform 1.6+, the AWS CLI signed in (`aws configure`, or `aws sso login` with `AWS_PROFILE` set).

```powershell
cd infra\aws
terraform init
terraform workspace new dev        # or: terraform workspace select dev
terraform plan -var-file="environments/dev.tfvars" -out="dev.tfplan"
terraform apply "dev.tfplan"
```

The first apply takes 10 to 15 minutes, mostly the Beanstalk environment and CloudFront.

Deploy the code (the same `webapp.zip` as Azure: zip the *contents* of `webapp/`):

```powershell
Compress-Archive -Path webapp\* -DestinationPath webapp.zip -Force
cd infra\aws
terraform workspace show   # must say dev
$label  = Get-Date -Format "yyyyMMdd-HHmmss"
$bucket = terraform output -raw storage_bucket_name
$region = terraform output -raw region
aws s3 cp ..\..\webapp.zip "s3://$bucket/deploy/webapp-$label.zip" --region $region
aws elasticbeanstalk create-application-version --region $region --application-name (terraform output -raw application_name) --version-label $label --source-bundle "S3Bucket=$bucket,S3Key=deploy/webapp-$label.zip"
aws elasticbeanstalk update-environment --region $region --environment-name (terraform output -raw environment_name) --version-label $label
```

Then open `terraform output web_app_url` (allow a minute or two for the update).

**Tear down:** `terraform destroy -var-file="environments/dev.tfvars"`. Removing the CloudFront distribution takes several minutes; that is normal. RDS for SQL Server can't create a database at launch, so with `enable_sql = true` the connection string points at `master`; create your own database there.

## Known limitations

- **No live robusta price.** Yahoo delisted ICE London robusta and there is no free alternative, so robusta appears only as the IMF monthly price, and Uganda and Vietnam show no implied price.
- **Unofficial endpoints can rate-limit or change.** Check the Sources page after a live run.
- **GDELT only searches the last 3 months.** The archive keeps everything from when ingestion starts.
- **Costa Rica harvest windows and region coordinates are approximate.** Timing shifts with altitude and year.
- **Not investment advice.** Prices are delayed and signals are keyword heuristics.

## Roadmap

Ideas under consideration: landed-cost calculator, producer and cupping log, origin crop-risk scores, a daily brief, and more origin price indicators (Colombia FNC, CEPEA, Cecafé, ICO). Suggestions are welcome; open an issue.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, tests and the rules for adding data sources, and the [Code of Conduct](CODE_OF_CONDUCT.md). Report security issues privately as described in [SECURITY.md](SECURITY.md). How changes are proposed, approved, versioned and rolled back is in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## License

[MIT](LICENSE). Bundled third-party components are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
