# Roadmap

Maintained by the agent (see `CLAUDE.md`). Z can edit freely — reorder, delete, or add items.
Each item: one line, small enough to ship in one run; link research notes where relevant.

## Now (top = next) — build order Z approved on #14 (2026-10-19)

- [ ] #13 Card-free hosting (Render + Firestore Spark + Actions cron) — PR #18, awaiting review.
- [ ] #8 Sourcing CRM v1 — draft PR #17, awaiting review.
- [ ] #10 Field mode — slice 1 in draft PR #19 (stacked on #17); slice 2 next: visits/cuppings on the org page,
      edit farms/people in Field, flight comparison, real-iPhone check.
- [ ] #9 Offer check — re-scoped: SCTG has no reuse license (`agent/research/2026-10-20-sctg-licensing.md`);
      waiting on Z's re-approval of the revised scope.
- [ ] #11 STRATEGY.md first draft (docs only).

## Next

- [ ] #20 Global supplier catalogue (CoE results + Open Supply Hub CC BY-SA + Trase if licensed) — proposed,
      build after the trip (`agent/research/2026-10-20-global-producer-catalog-sources.md`).
- [ ] Costa Rica trip mode: turn the trip planner into a practical field guide — per-region
      farm/mill/cooperative visit list, harvest status during trip dates, what to ask producers,
      price-check calculator presets (USD/lb FOB ↔ ₡/fanega ↔ ₡/kg). Trip: Jan 4–17, 2027.
- [ ] Competitor & adjacent-software landscape: first full pass into `agent/COMPETITORS.md`.
- [ ] Source health: audit every feed in `app/config.py`, replace dead ones with working free alternatives.
- [ ] Differentials: add a reference table of typical specialty differentials by origin/grade
      (sourced, dated), and use it as defaults in the implied-local-price tool.

- [ ] Weekly market brief page: auto-generated summary of price moves, CFTC positioning,
      weather anomalies and top-tagged news per origin (rule-based, no LLM).
- [ ] Alerts: user-defined thresholds (C price, BRL, rainfall anomaly) shown as a banner.
- [ ] Exporter / importer directory for Costa Rica (public sources only), linked to regions.
- [ ] Harvest & shipment calendar across all 18 origins in one view.

## Later

- [ ] Cloud deployment hardening for GCP (only when Z asks to go live).
- [ ] Personas: views tailored for roasters, green buyers, importers, cafes.

## Done

- v1.1.0 (2026-10-12) — see CHANGELOG.
