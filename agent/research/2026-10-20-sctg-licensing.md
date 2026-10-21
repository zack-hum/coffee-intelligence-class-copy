# SCTG licensing — can Offer check (#9) use the Specialty Coffee Transaction Guide? (2026-10-20)

Topic rotation: specialty-coffee domain knowledge / data sources. Why now: #9 is approved, but Z made
it conditional: "Proper licensing is critical — if it cannot be attained, redo feature or archive it."
SCTG was the planned benchmark, and its license was the open gating step.

## Findings

**1. SCTG publishes no open data license.**
- The download page asks for "some basic information" before access (a registration gate), then shows
  an **antitrust disclaimer** that doubles as "principles of use": data is anonymised, aged and
  aggregated; each firm must make competitive decisions independently; recipients must not use it to
  facilitate improper discussions or agreements; using the site means accepting these principles.
  Questions go to Prof. Peter W. Roberts (Emory) or your own counsel.
  ([SCTG download page](https://www.transactionguide.coffee/data))
- There is **no Creative Commons or other license, and no statement on redistribution,
  republishing or use inside software**. The footer is a plain "© 2024 Goizueta Business School".
  The home page frames the guide as a tool for buyers and sellers in price negotiations
  ([SCTG home](https://www.transactionguide.coffee/en/home)).
- Coverage confirms it is free to download, but says nothing about reuse terms. The 2024 edition
  covers 100k+ contracts from 123 companies; the overall median FOB over the last three harvests is
  about $3.48/lb, split into "regular" (80–83.9) and "fancy" (84+) tiers
  ([Daily Coffee News, Feb 2025](https://dailycoffeenews.com/2025/02/18/the-2024-specialty-coffee-transaction-guide-is-here)).
  CRS describes the dataset only as "anonymized and aggregated"
  ([Coffeelands/CRS](https://coffeelands.crs.org/2021/12/industry-initiative-the-specialty-coffee-transaction-guide/)).
- The **2025 edition is announced as "Soon"** on the download page, so any table we built today would
  be from the 2024 edition anyway.

**2. What that means legally (not legal advice).** Without a license, copyright default applies:
facts aren't copyrightable, but a compilation and its selection can be, and the download is gated by
terms we'd accept on use. Using SCTG numbers for **Z's own decisions** clearly fits the stated purpose.
**Shipping a table of SCTG percentiles inside a public GitHub repo and app** is redistribution, and
nothing grants it. A single cited figure in a research note (as above) is ordinary quotation; a bundled
dataset is not.

**3. Licensed alternatives for the benchmark side of #9** (still to verify one by one before building):
- **Z's own data (first-party, no license issue):** offers and contract prices logged as CRM deals in
  #8 (PR #17). This becomes the best benchmark over time, and it's the thing that makes the product hard to copy.
- **Cup of Excellence auction results (ACE):** already used for the #8 seed; ACE allows its farm info
  to be used to promote the winning coffees, with a link back. These are top-of-market only.
- **ICAFE farmgate liquidación (₡/fanega):** public figures from press statements, stored as dated
  facts with a source link (see `2026-10-17-free-fx-and-icafe-price-sources.md`).
- **C price + FX:** already live in the app.
- **ICO composite / group indicator prices:** free to view; reuse terms are **not yet checked**.

## Recommendation

**Redo #9 without bundled SCTG data, and ask Emory for permission in parallel.**
- **v1 benchmark ladder:** C front month → ICAFE farmgate (CR) → **your own logged offers/contracts
  by origin and score** (from the CRM) → CoE auction as an off-scale marker. The price-ladder UX from
  `2026-10-19-price-ladder-ux.md` stays the same, with the band built from your own deals once there
  are ≥5 for an origin/tier, and hidden until then.
- **SCTG as a user-supplied reference:** an optional field where Z types the SCTG p25/median/p75 he
  reads in his own copy for an origin/tier (stored in his private database, never in the repo). That
  is Z's personal use of a guide he downloaded. Rejected: shipping SCTG numbers in `app/` without
  written permission.
- **Ask for permission:** a short email from Z to Prof. Roberts asking whether a free, non-commercial,
  open-source tool may store and display SCTG aggregate percentiles with attribution. If yes, we add
  the bundled table back as a small follow-up.

## Implications for us

1. Update proposal #9 with the revised scope and wait for Z's re-approval, per the approval rule.
2. #9 now depends on #8 (CRM deals) for its best data, which fits the agreed build order (#13 → #8 → #10 → #9).
3. Record any data source's license in README's data-source table before it ships; SCTG stays out of it
   unless permission arrives in writing.

Paid source that would improve quality (not proposed): commercial green-coffee price assessments
(e.g. trade-press differential reports) that come with a redistribution license.
