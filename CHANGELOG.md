# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Development process (`docs/DEVELOPMENT.md`): proposal → approval → pull request flow, versioning and rollback guide.
- Agent operating files: `CLAUDE.md`, `ROADMAP.md`, `agent/` (research notes, competitor tracker, run log).
- Sourcing CRM (#8): a Sourcing tab with organizations, people, a green-coffee deal pipeline (drag and drop between stages, won/lost), activities with a due-soon/overdue list, notes and samples, CSV export/import for every list, and an optional seed list of ~40 public Costa Rican suppliers. Also runs standalone with `./dev.sh crm` / `dev.bat crm`.
- Terraform deployment to Azure App Service (`infra/`, `dev` on the free F1 plan, `prod` on paid B1) and a Node.js page (`webapp/`) deployed to it with `az webapp deploy`. Each environment also gets Application Insights backed by a Log Analytics workspace and a storage account. Azure SQL and PostgreSQL databases are optional and off by default. Names that must be unique across Azure get a random suffix, and the plan stops if the workspace doesn't match the `.tfvars` file. The web app runs Node 22.
- Terraform for Google Cloud (`infra/gcp`) and AWS (`infra/aws`) that hosts the same `webapp/` page the way Azure does. GCP: Cloud Run (scales to zero in dev, one warm instance in prod), Artifact Registry, a Cloud Storage bucket, a dedicated log bucket and optional Cloud SQL for SQL Server Express or PostgreSQL. AWS: a single-instance Elastic Beanstalk environment on Node.js 22 behind CloudFront for HTTPS, CloudWatch log streaming, an S3 bucket and optional RDS for SQL Server Express or PostgreSQL. Both keep Azure's dev/prod workspaces, random name suffix and workspace check, and use the same connection-string variable names. README has deploy and teardown steps for each cloud.

### Changed
- Azure Terraform moved from `infra/` to `infra/azure/` (no resource changes; move local state as described in the README).
- `webapp/` shows which cloud it's running on.
- The Docker image creates `data/` owned by the app user, so demo and live modes can write their SQLite archive in a container.

### Removed
- `deploy.sh` (Google Cloud Run + Firestore + Cloud Scheduler); replaced by `infra/`.

## [1.1.0] - 2026-10-12

First public release.

### Added
- Open-source project files: contributing guide, code of conduct, security policy, issue and pull request templates, CI (lint, tests, Docker build), Dependabot, `pyproject.toml` tool config, `.editorconfig`, `.gitattributes`, `.dockerignore`.
- Google News `site:` queries for Perfect Daily Grind, Comunicaffe, European Coffee Trip and The Tico Times, whose own feeds block automated access.

### Changed
- US imports by origin now request country-level rows and use shipping weight for kilograms; previously only the all-countries total was returned.
- The Census job requires `CENSUS_API_KEY` (the Census API no longer serves requests without one) and is skipped cleanly when it is missing.
- The Docker image runs as a non-root user.

### Removed
- Live robusta futures (tile, chart, market hours, daily closes). Yahoo delisted `RC=F`/`RM=F` and there is no free alternative. IMF monthly robusta prices remain on the Data page.
- RSS feeds that no longer exist or can't be reached: Royal Coffee, STiR, World Coffee Research, ICAFE, CRHoy, El Financiero (CR).

### Fixed
- Overview, Origins and Costa Rica pages failing to load on Windows: added the `tzdata` dependency so time zones resolve.

## [1.0.0] - 2026-10-09

Initial private version.

[Unreleased]: https://github.com/<owner>/coffee-intelligence-v1.1/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/<owner>/coffee-intelligence-v1.1/releases/tag/v1.1.0
