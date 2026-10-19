# Run log (newest first)

## 2026-10-19 — price ladder UX (for #9)
- Orient: PR #7 still unmerged → followed its CLAUDE.md/DEVELOPMENT.md. No `approved` labels, no answers (#14 open) or review comments from Z on #7–#14; CI green on #12. Nothing built (nothing approved). ruff + pytest green on main.
- Research: how to show farmgate → C → SCTG FOB → offer in one view → `agent/research/2026-10-19-price-ladder-ux.md`. Trade reporters headline FOB and keep one basis per axis; SCTG publishes p25/median/p75 → use an IQR band; bullet-graph-style single-row SVG ladder with a text verdict, off-scale CoE as an arrow. SCTG license still unverified (gating step for #9). Commented on #9.
- Proposals: none new (5 open, at cap). Questions: none new (#14 still covers build order).
- Next research: new free news/data sources (origin-level harvest and weather alerts) or competitor refresh.

## 2026-10-18 (2) — Costa Rica supplier directories
- Orient: PR #7 still unmerged → followed its CLAUDE.md/DEVELOPMENT.md. No `approved` labels, no answers (#14 open) or review comments from Z on #7–#14; CI green on #7 and #12. Nothing built (nothing approved). ruff + pytest green on main.
- Research: public CR exporter/micro-mill directories → `agent/research/2026-10-18-costa-rica-supplier-directories.md`. No free machine-readable registry (ICAFE's isn't published and blocks bots); best seeds are CoE results (ACE, structured, 2026 avg $45.53/lb, Los Santos swept) and PROCOMER's Buy from Costa Rica (contacts gated). Recommended a curated, source-linked seed list inside #8 instead of a separate directory; commented on #8.
- Proposals: none new (5 open, at cap). Questions: none new (#14 still covers build order).
- Next research: UX patterns from great data dashboards (price ladder: farmgate → FOB → CoE) for #9.

## 2026-10-18 — offline-first field entry UX
- Orient: PR #7 still unmerged → followed its CLAUDE.md/DEVELOPMENT.md. No `approved` labels, no answers (#14 open) or review comments from Z on #7–#14; CI green on #12. Nothing built (nothing approved). ruff + pytest green on main.
- Research: offline-first mobile data entry → `agent/research/2026-10-18-offline-first-field-entry-ux.md`. iOS has no Background Sync → sync on open/online/visible; installed PWA is exempt from Safari's 7-day eviction and gets `persist()`; Kobo-style JSON export as backup; CVA affective 1–9 scale + score formula for the cupping form. Commented deltas on #10.
- Proposals: none new (5 open, at cap). Questions: none new (#14 still covers build order).
- Next research: Costa Rica exporter/micro-mill public directories (backs #8 and the roadmap CR directory item).

## 2026-10-17 (2) — free FX + ICAFE price sources
- Orient: PR #7 still unmerged → followed its CLAUDE.md/DEVELOPMENT.md. No `approved` labels, no answers or review comments from Z on #7–#13; CI green on #7 and #12. Nothing built (nothing approved). ruff + pytest green.
- Research: free CRC/USD and ICAFE farmgate sources → `agent/research/2026-10-17-free-fx-and-icafe-price-sources.md`. Frankfurter v2 (keyless, official) for FX history; BCCR optional (free token); ICAFE has no feed → curated dated table. Commented on #9.
- Proposals: none new (5 open, at cap). Questions: #14 build order before the Jan 4 trip (default: #13 → #8 → #10 → #9 → #11).
- Next research: UX patterns for offline-first mobile data entry (backs #10 Field mode).

## 2026-10-17 — Costa Rica sourcing specifics
- Orient: PR #7 still unmerged → followed its CLAUDE.md/DEVELOPMENT.md. No `approved` labels, no answers or review comments from Z on #7–#13; CI green on #12. Nothing built (nothing approved). ruff + pytest green on main.
- Research: how CR coffee is bought, priced and moved (ICAFE rules, liquidación, micro-mills, exporters, colón, 2026/27 outlook, EUDR) → `agent/research/2026-10-17-costa-rica-sourcing-specifics.md`, incl. a visit question list for the trip.
- Key finding: 2026/27 farmgate projected ₡83–99k/fanega, below cost; colón strength matters as much as C price. Suggested farmgate-vs-FOB view on #9 and CR-specific fields on #8 (comments, no new proposals — 5 open, at cap). Questions: none.
- Next research: free FX + ICAFE data sources (BCCR exchange-rate API, ICAFE published prices) to back #9.

## 2026-10-16 (2) — segment sourcing workflows
- Orient: PR #7 still unmerged → followed its CLAUDE.md/DEVELOPMENT.md. No `approved` labels, no new answers or review comments on #7–#13. Nothing built (nothing approved). ruff + pytest green.
- Research: how roasters (small/large), importers/exporters and cafes source → `agent/research/2026-10-16-segment-sourcing-workflows.md`. Shared core = supplier records + sample/cupping log with feedback + price context + follow-ups — matches #8/#9/#10. Recommends small-to-mid roasters as first segment (commented on #11).
- Proposals: none new (5 open, at cap). Queued ideas: substitute-origin view, contract/release tracker, EUDR fields on #8. Questions: none.
- Next research: Costa Rica sourcing specifics (micro-mills, exporter licensing/ICAFE, harvest by region).

## 2026-10-16 — free hosting research
- Orient: PR #7 (workflow) still unmerged → followed its CLAUDE.md/DEVELOPMENT.md. No approvals, answers or review comments on #7–#12; CI green on #7 and #12. Nothing built (nothing approved).
- Research: free hosting before Jan 4 → `agent/research/2026-10-16-free-hosting.md`. Finding: current Cloud Run path needs a card and news */15 uses ~96% of free vCPU; card-free alternative is Render Free + Firestore on Firebase Spark + GitHub Actions cron, with near-zero app code.
- Proposals: #13 card-free hosting (now 5 open — at the cap). Questions: none.
- Next research: segment sourcing workflows (roaster vs importer vs cafe) for STRATEGY.md.

## 2026-10-15 — competitor landscape + first proposals
- Orient: no open proposals/approvals/questions; no agent PRs with review. Nothing built (nothing approved).
- Research: competitor & adjacent-software first pass → `agent/research/2026-10-15-competitor-landscape.md`, `agent/COMPETITORS.md` (12 products).
- Proposals: #8 Sourcing CRM v1 · #9 Offer check (SCTG benchmarks) · #10 Field mode (offline visit/cupping) · #11 STRATEGY.md draft.
- Baseline: ruff + pytest green on main. Next research: free hosting before Jan 4, then segment workflows.

## 2026-10-15 — setup
- Agent operating files created: CLAUDE.md, ROADMAP.md, agent/ (questions, research, competitors, run log).
- Baseline: ruff + 3 pytest test files passing on main.
- Questions added: Q1–Q3 (trip, trip goals, audience).
