# Costa Rica supplier directories — where to find exporters and micro-mills (2026-10-18)

Question: which **public, free** sources list Costa Rican exporters, mills and producers well enough
to seed a supplier directory (ROADMAP: "Exporter / importer directory for Costa Rica") and pre-fill
Sourcing CRM (#8) before Z's trip (Jan 4–17, 2027)?

## Findings

**1. ICAFE has the authoritative registry but doesn't publish it as data.**
- By law (Ley 2762 and its regulation) every beneficio (mill, incl. micro-mills) and exporter must
  register with ICAFE each harvest; ICAFE's definition of a *microbeneficio* is ≤3,000 fanegas/year.
  In 2015/16 there were 172 registered micro-mills processing ~5% of the crop (El Financiero, 2017);
  the 2025 *Informe sobre la Actividad Cafetalera* has current counts but couldn't be read here
  (icafe.cr disallows automated fetching via robots.txt — so we should not scrape it either).
- ICAFE does publish **circulars** naming economic agents it suspends or reinstates
  ("Suspensión / Levantamiento de Suspensión de Agentes Económicos", e.g. Circular 3512 in 2024 and
  3608 in Aug 2025) and a Dec 2025 circular (3634) on quality/traceability safeguards. These are the
  closest public "is this firm in good standing?" signal — a manual check link, not a feed.
- Implication: "ICAFE-registered (y/n)" in #8 stays a **manual, user-verified field** with a link to
  ICAFE; ask the exporter for their ICAFE registration number on the visit.

**2. Cup of Excellence (ACE) — best free list of top specialty producers, with structured fields.**
- The Costa Rica 2026 results page lists all 30 auction lots in two tables: *results* (rank, score,
  farm, farmer, process, variety, region, weight) and *auction* (final bid $/lb, total value,
  buying company). The ACE Farm Directory has a page per winning lot back to ~2008 (farm, farmer,
  altitude, score, process, variety, cupping notes).
- 2026 auction (Jul 9): 30 lots, total ≈ $798k (+14% y/y), average **$45.53/lb** (vs $30.77 in
  2025), top lot $200.10/lb (Finca Río Blanco, Copey de Dota, washed Java, 91.36). **Los Santos won
  all three categories**; 10 lots scored ≥90 (4 in 2025). (Tico Times, ACE)
- In Costa Rica, ACE's exporting partner is **SCACR (Asociación de Cafés Finos de Costa Rica)**,
  which runs the national competition and ships the lots.
- Terms: ACE says farm information is "for educational purposes only but can be used to help sell
  the winning coffees"; © ACE. → OK to store a *curated, linked* list of farm/farmer/region/score for
  Z's own sourcing use; don't bulk-copy the cupping-note text, and link back to every lot page.

**3. PROCOMER "Buy from Costa Rica" (buyfromcostarica.com) — official exporter directory.**
- Run by PROCOMER (the national export-promotion agency). Exporter profiles show description,
  location (e.g. Tarrazú, Dota), years exporting, number of export countries, main markets,
  certifications (FDA, Esencial Costa Rica licence) and products (e.g. Coopedota "Green export
  coffee": SHB Tarrazú/Dota and microlot profiles, capacity, maritime shipping).
- **Contacts and quotes are gated behind free buyer registration**, and there's no API or bulk
  export. Terms page exists but wasn't readable here.
- Implication: good for *finding* established exporters/co-ops (CoopeTarrazú, Coopedota, etc.) and
  for Z to register as a buyer himself (free, his call) — not a source to ingest.

**4. Esencial Costa Rica (country brand) licensees** — 600+ licensed companies, some coffee
exporters/roasters with microsite pages. Useful as a "vetted/established" badge, not a supplier list.

**5. Trade-data aggregators (Panjiva, Tridge)** list shipments by Costa Rican exporters (e.g.
Exclusive Coffees S.A.) — **paid**; note as "would improve quality" (who ships how much to whom),
never wire in.

## Implications for us

- **There is no free, machine-readable CR supplier registry.** A directory has to be *curated*:
  a small, dated, source-linked seed file plus whatever Z adds on the trip. That suits #8 better
  than a separate "directory" feature.
- **Recommendation:** when #8 (Sourcing CRM) is approved, ship it with an optional **seed list of
  ~40 public CR suppliers**: the last 3 years of CoE winners (farm, producer, region, score, $/lb,
  link) + the main co-ops/exporters visible on Buy from Costa Rica, each marked
  `source=ACE|PROCOMER`, `verified=false` until Z meets them. Z can then filter by region before
  planning visits (Los Santos dominates 2026). Rejected alternative: a separate directory page
  with its own scraper — no source permits it and it duplicates the CRM.
- **CoE prices as a price anchor for #9:** CoE auction $/lb is the ceiling of the CR market
  (avg $45.53/lb 2026) vs farmgate ≈ $2.48/lb and export avg ≈ $3.35/lb (10-17 note) — showing
  all three gives Z the full ladder when a micro-mill quotes him a microlot price.
- **News:** we already track `"Cup of Excellence" Costa Rica` via Google News (`gn-cr-coe`) — no
  new feed needed.
- **Trip checklist addition:** ask each exporter/mill for their ICAFE registration number and
  whether they're listed on Buy from Costa Rica; record both in the CRM.
- Would improve quality (paid, not wiring in): Panjiva/ImportGenius shipment data per exporter.

## Sources

- [ACE — Costa Rica 2026 results & auction](https://allianceforcoffeeexcellence.org/costa-rica-2026/)
- [ACE Farm Directory — e.g. #9 Emanuel, Costa Rica 2025](https://farmdirectory.cupofexcellence.org/listing/9-emanuel-costa-rica-2025-wet/)
- [ACE — CoE exporting partners](https://allianceforcoffeeexcellence.org/coe-exporters/)
- [Tico Times — $200/lb at Costa Rica CoE 2026 (2026-07-11)](https://ticotimes.net/2026/07/11/costa-rica-coffee-200-pound-cup-of-excellence-2026)
- [Buy from Costa Rica (PROCOMER) — CoopeTarrazú profile](https://buyfromcostarica.com/en/exporter/coopetarrazu-r-l/)
- [Buy from Costa Rica — Coopedota green export coffee](https://buyfromcostarica.com/en/product/green-export-coffee/)
- [El Financiero — small mills launching own brands (2017)](https://www.elfinancierocr.com/negocios/pequenos-beneficios-de-costa-rica-prueban-y-lanzan-sus-propias-marcas-de-cafe-al-mercado/GP45KYZZ4JDIJHH24KMCTXBPW4/story/)
- [ICAFE — Informe sobre la Actividad Cafetalera 2025 (PDF)](https://www.icafe.cr/wp-content/uploads/informes_gestion/actividad_cafetalera/Informe%20de%20la%20Actividad%20Cafetalera%20en%20Costa%20Rica%202025.pdf)
- [ICAFE — Circular 3608, reinstatement of economic agents (2025-08-27)](https://www.icafe.cr/wp-content/uploads/circulares_sector/circulares_2025/2025-08-27%20%5BCircular%203608%20-%20Levantamiento%20de%20Suspensi%C3%B3n%20de%20Agentes%20Econ%C3%B3micos%5D.pdf)
- [Ley 2762 — exportadores de café (eRegulations CR)](https://costarica.eregulations.org/media/Ley%202762%20Exportadores%20de%20caf%C3%A9.pdf)
- [Delfino — Procomer/ICAFE "Café de Costa Rica para el Mundo" (2026-05)](https://delfino.cr/2026/05/programa-cafe-de-costa-rica-para-el-mundo-impulsa-la-preparacion-exportadora-del-sector-cafetalero)
- [La República — 600+ firms licensed by Esencial Costa Rica](https://www.larepublica.net/noticia/mas-de-600-empresas-destacan-con-la-licencia-de-esencial-costa-rica)
