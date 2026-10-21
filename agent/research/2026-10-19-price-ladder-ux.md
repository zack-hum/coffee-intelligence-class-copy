# Price ladder UX — showing farmgate → C → FOB benchmark → offer in one view (2026-10-19)

Question: Offer check (#9) will put several prices side by side — ICAFE farmgate (green-equivalent),
the live C price, the SCTG FOB benchmark for the tier, and the offer Z typed in. How do good
dashboards and the specialty trade's own transparency reports present a comparison like this
without misleading, and what's the simplest version that works on a phone on a farm?

## Findings

**1. The trade itself headlines FOB and treats every other layer as context with caveats.**
- Counter Culture prints **FOB per lb on every product page**, because FOB is the contract basis
  and directly comparable to the C price and Fair Trade minimums. It explains landed cost (roughly
  +$0.30–1.00/lb for freight, import, warehousing, financing) but warns it **must not be compared
  with C or Fair Trade prices**, which are FOB-based. It considered publishing farmgate in local
  units (e.g. pesos per carga) and decided it was too ambiguous for a general audience: farmgate
  depends on installment timing, FX, yield conversion and whether cherry or parchment was sold.
  ([Counter Culture](https://counterculturecoffee.com/blogs/counter-culture-coffee/price-transparency-and-the-value-of-coffee))
- Tim Wendelboe's annual transparency report is a per-lot table — origin, farm, variety, lot, SCA
  score, **FOB $/lb**, volume — with the C-market range (≈$1.43–2.01 in 2023) and the SCTG range
  (≈$2.47–4.50, avg $3.40) quoted as the benchmarks. Farmgate appears only in the glossary.
  ([Wendelboe 2023](https://timwendelboe.no/blogs/transparency/2023-transparency-report))
- Sample Coffee deliberately publishes **aggregate charts, not a per-producer price table**, and
  points to the SCTG (quality × volume × origin) as a better benchmark than the C price. It warns
  that cross-origin comparisons (Kenya vs Peru) mislead without tax/trade-rule context.
  ([Sample](https://samplecoffee.com.au/journal/transparency))
- → Every serious reporter: **one basis per axis, labelled; benchmarks are ranges, not points;
  farmgate is shown with its assumptions or not at all.**

**2. SCTG gives us a range, not just a median.**
- The guide (Emory Goizueta; 2024 edition: 123 companies, >100k contracts, ~2bn lb) reports FOB
  $/lb **medians plus 25th and 75th percentiles**, broken down by cup-score band (six bands ≥80),
  lot size and origin. 2024 headline: overall median $3.48; 80–83.9 → $2.93; 84+ → $4.18 (latest
  3 harvests). ([Daily Coffee News](https://dailycoffeenews.com/2025/02/18/the-2024-specialty-coffee-transaction-guide-is-here),
  [Sprudge](https://sprudge.com/tracking-coffee-prices-with-the-specialty-coffee-transaction-guide-283787.html))
- It's a free download behind a contact form; I found **no published license** in any coverage.
  #9's "verify terms first" step is still open and must be answered from the guide itself (or by
  asking Emory) before we bundle any numbers.
- → Store **p25 / median / p75** per origin × tier (where the guide has enough contracts), and show
  an **interquartile band** with a median tick. "Below / near / above" then means *below p25 /
  inside the band / above p75* — honest, and not a false-precision ±x% rule we invent.

**3. Chart pattern: a bullet-graph-style horizontal "price ladder".**
- Stephen Few's bullet graph = one bold featured measure, a perpendicular comparative marker, and
  muted qualitative bands behind it, on a zero-based linear axis; built for compact side-by-side
  KPI comparison against thresholds, and it needs a one-line legend if the audience hasn't seen
  one. ([Tableau reference](https://www.tableau.com/es-es/data-insights/reference-library/visual-analytics/charts/bullet-graphs))
- Mapped to us, one row, $/lb FOB-equivalent, axis from 0:
  - muted band = SCTG p25–p75 for the chosen origin × tier, thin tick = median;
  - thin grey markers = C front-month (commodity floor) and, for Costa Rica, ICAFE farmgate
    green-equivalent (dashed, labelled "farmgate est. · season · FX date");
  - **bold marker = the offer**, with the verdict as text ("inside SCTG mid-range for 84+ Costa
    Rica, 2024 edition") — never colour alone.
- **Off-scale values:** CoE auction averages ($45.53/lb in CR 2026) would flatten everything else.
  Show them as a labelled right-edge arrow ("CoE 2026 avg $45.53 →"), not on the scale.
- Below the chart, a three-line text ladder doubles as the accessible / no-JS version:
  `Farmgate est. $2.48 · C $X.XX · SCTG 84+ $p25–$p75 (median $m) · Your offer $Y.YY`.

**4. Mobile and offline constraints.**
- One row ≈ 320 px wide works at phone width; tap a marker for its source + date (no hover on touch).
- Inline SVG (we already hand-draw sparklines in `app.js`) — no chart library, renders offline from
  the bundled table and cached C/FX values, and prints cleanly on an offer sheet screenshot.
- Every number carries an **as-of date**; if the C price is stale (offline), grey the marker and
  say "C as of <time>" rather than hiding it.

## Implications for us

1. **#9 should render a single-row price ladder** (inline SVG, ~40 lines of JS, no new dependency),
   with the verdict in words. This replaces the plain "below / near / above" text in the proposal —
   same size (S/M), better at answering "is this offer fair?" at a glance.
2. **Benchmarks table schema:** `origin, tier, p25, median, p75, n_contracts?, edition, years,
   source_url, retrieved` — not just median. Fall back to the all-origin tier row when the origin
   cell is thin, and say so.
3. **Never mix bases on one axis.** Everything on the ladder is FOB-equivalent $/lb; farmgate is
   converted and labelled as an estimate with its FX date; landed prices (importer offer lists) get
   a separate "landed" toggle that subtracts a user-set freight/import allowance (default $0.60/lb,
   inside Counter Culture's $0.30–1.00 range) rather than being plotted raw.
4. **Optional "producer share" readout** (farmgate ÷ offer FOB) for Costa Rica only, behind the
   same caveats — useful context for Z as a broker, but it's an estimate, not a fact.
5. SCTG terms remain the gating unknown for #9 — still the first build step.

Would improve quality (paid, not wired): StoneX/Volcafe weekly differentials by origin and grade
would give a live "street" band next to SCTG's annual one.
