# Run log (newest first)

## 2026-10-21 — build #10 Field mode slice 2 + CR harvest during the trip
- Orient: PR #7 still unmerged → followed its CLAUDE.md/DEVELOPMENT.md. No new comments or reviews from Z since 2026-10-19; CI green on #7/#12/#17/#18/#19; #9 still waits on Z's "go" for the re-scope.
- Built: #10 slice 2 → pushed to PR #19 (now ready for review, stacked on #17): Field "Farms & people" search + offline edit of any org/person (seed source/CoE kept), per-org/person visit + cupped-lot history, flight comparison view (ranking, attribute and bean tables, best per row), CRM org/person history shows visits + cuppings, org cupping panel, storage-persistence hint. ruff + 28 pytest green; Playwright offline run at 375 px synced once, CRM page checked at 1280 px.
- Research: CR harvest phase by region for Jan 4–17 + 2026/27 outlook → `agent/research/2026-10-21-costa-rica-harvest-during-trip.md`. Los Santos at peak, Brunca in its tail; dry Aug–Oct → uneven ripening; our calendar is month-binary and unsourced.
- Proposals: #21 harvest phase by region + Field observations (S). Questions: none new.
- Next build: #21 or #9 once approved/confirmed; #11 STRATEGY.md draft otherwise.

## 2026-10-20 (2) — build #10 Field mode slice 1 + global catalogue sources
- Orient: PR #7 still unmerged → followed its CLAUDE.md/DEVELOPMENT.md. No reviews or comments from Z on #12/#17/#18/#7 (all CI green); #9 still waits on Z's "go" for the re-scope.
- Built: #10 Field mode slice 1 → draft PR #19 (stacked on #17): installable `/field/` PWA, IndexedDB outbox + idempotent `POST /api/crm/sync`, `visits`/`cuppings` CRM kinds, CVA 2024 / classic 2004 / quick cupping forms (`app/crm/cupping.py`), offline add of farms and people, JSON backup. ruff + 25 pytest green; Playwright offline run at 375 px synced exactly once.
- Research: free sources for a global producer catalogue → `agent/research/2026-10-20-global-producer-catalog-sources.md`. CoE public results (~17 origins) + Open Supply Hub (CC BY-SA, manual download) usable; RA/Fairtrade link-out only; ACE Farm Directory is members-only.
- Proposals: #20 global supplier catalogue (after the trip). Commented on #8 and #10. Questions: none new.
- Next build: #10 slice 2; then #9 once Z confirms the re-scope.

## 2026-10-20 — build #13 hosting + SCTG licensing
- Orient: PR #7 still unmerged → followed its CLAUDE.md/DEVELOPMENT.md. Z approved #8–#11, #13 and answered #14 ("build all in that order": #13 → #8 → #10 → #9 → #11); #8 is in draft PR #17 (CI green). No review comments on open PRs.
- Built: #13 card-free hosting → PR #18 (`render.yaml`, Firestore indexes, `ingest.yml` cron + script, `GOOGLE_CREDENTIALS_JSON` loading, `docs/DEPLOY_FREE.md`). ruff + 18 pytest green, actionlint clean, demo-mode smoke test of every ingest path.
- Research: SCTG licensing → `agent/research/2026-10-20-sctg-licensing.md`. No open license and no redistribution grant (registration gate + antitrust "principles of use", © Goizueta); 2025 edition "soon". Recommended re-scoping #9 (own CRM deals + ICAFE + CoE + C; SCTG only as Z's private input) and asking Emory for permission; commented on #9.
- Roadmap: "Now" = Z's approved build order. Closed question #14.
- Proposals: none new (all open ones approved). Questions: none new.
- Next build: #10 Field mode once #18/#17 are reviewed (it builds on #8's supplier records).

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

## 2026-10-15 — Z's answers
- Role: scout for future importing + broker/connector. Devices: phone + laptop equally.
- Core jobs: find & vet suppliers, visits & cuppings, price & negotiate, market research, data tracking, CRM.
- Mission anchored on green-coffee sourcing; strategy doc is co-written, Z has final say.

## 2026-10-15 — switched to human-in-the-loop
- All work now goes proposal issue → Z approves → PR → Z merges. See docs/DEVELOPMENT.md.
- Questions moved to GitHub issues: #5 (trip goals), #6 (audience). Trip dates: Jan 4–17, 2027.

## 2026-10-15 — setup
- Agent operating files created: CLAUDE.md, ROADMAP.md, agent/.
- Baseline: ruff + pytest passing on main.
