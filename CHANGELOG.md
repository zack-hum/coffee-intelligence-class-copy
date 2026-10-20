# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Sourcing CRM (#8): a Sourcing tab with organizations, people, a green-coffee deal pipeline (drag and drop between stages, won/lost), activities with a due-soon/overdue list, notes and samples, CSV export/import for every list, and an optional seed list of ~40 public Costa Rican suppliers. Also runs standalone with `./dev.sh crm` / `dev.bat crm`.
- Field mode, first slice (#10): an installable phone app at `/field/` that works with no signal. Log farm visits (GPS, altitude, harvest status, price discussed, the six-question Costa Rica visit checklist), add farms and people on the spot, and cup flights of samples on three layouts (SCA CVA 2024 affective, SCA classic 2004, quick score) with bean details and descriptors. Everything saves on the phone and syncs once when signal returns; a JSON backup download works offline.
- Field mode, second slice (#10): search and edit any farm, organization or person from the phone (seeded or added in the field), with its visits and cupped lots underneath; a flight comparison view that ranks samples by score and lines up every attribute and bean measurement side by side, marking the best in each row. The Sourcing CRM's organization and person pages now show Field visits and cuppings in their history, plus a cupping summary (best and average score) per organization.

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
