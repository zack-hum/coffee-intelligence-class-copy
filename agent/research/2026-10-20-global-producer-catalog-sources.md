# Free sources for a global producer catalogue (2026-10-20, run 2)

**Question (from Z on #8):** before the Sourcing CRM grows from a Costa Rica seed to a "global"
catalogue of coffee producers, what would the data source be? This note checks the four
candidates listed on #8 plus two open-data projects, focusing on coverage, access and terms.

## Findings

| Source | What it covers | Access | Terms / license | Verdict |
|---|---|---|---|---|
| **ACE Cup of Excellence results** | Winning lots by country-year: 17 programs on the public index (Brazil 1999–2026, Guatemala, Honduras, Nicaragua, El Salvador, Costa Rica, México, Perú, Indonesia, Thailand 2022–26, Colombia to 2023, Ethiopia 2020–24, Burundi/Rwanda/Bolivia historic, Taiwan 2023–25, Ecuador 2021–23) | Public results pages, one per country-year; no feed | Site is "© ACE, All Rights Reserved"; ACE's FAQ points buyers to winning-farm info to promote the coffees (see 2026-10-18 note) | **Use** — curated facts (farm, producer, region, rank, score, auction $/lb) with a link back, same as the CR seed |
| **ACE Farm Directory** | Richer farm profiles | **Members only** | All rights reserved | **Don't use** — gated; our CR seed must keep coming from the public results pages only |
| **Open Supply Hub (OS Hub)** | 1,770+ coffee supply-chain locations from public datasets — mostly co-ops, mills and warehouses (Brazil, India strongest; 800+ Indian exporters from the Coffee Board); few farms | Free web search + download up to 5,000 locations/year; **API is paid** ($225/mo and up) | **CC BY-SA 4.0** (all data incl. OS IDs) | **Use, manually** — download a coffee extract by hand, ship it as a separate attributed data file under CC BY-SA; never call the paid API |
| **Trase (SEI) coffee** | 2020 exporter → importer flows for 10 producing countries, subnational sourcing for 6 | Open-access download on Zenodo | Described as open access; exact license not yet verified (Zenodo record didn't load) | **Promising** for "who exports from origin X"; verify license before use |
| **Rainforest Alliance certificate search** | All certified farms, farmer groups and supply-chain certificates | Searchable database; no documented bulk download or API | No reuse terms stated on the page; a Wikirate metric mirrors RA status for ~500 companies under CC BY 4.0 (brands, not farms) | **Link-out only** — a "check certificate" link per organisation |
| **FLOCERT Fairtrade Customer Search** | Fairtrade-certified organisations, filterable by product, country, function | Search page; full list only via the customer-only Intact portal | Terms linked, not reviewed; no bulk/API | **Link-out only** |
| National export-promotion directories (e.g. PROCOMER) | Established exporters and co-ops per country | Contacts behind buyer logins; no feeds | Varies | Curate names/regions/links by hand per country, as for Costa Rica |

Paid sources that would improve quality (note only, never wire in): shipment-level customs data
(Panjiva, ImportGenius) for who-ships-what-to-whom; OS Hub's paid API for live updates.

## Implications for us

- **There is still no single free worldwide producer registry.** A global catalogue is a curated
  union: CoE results (top farms, ~17 origins) + OS Hub coffee locations (co-ops/mills/exporters,
  CC BY-SA) + Trase exporters (if licensed openly) + manual entries from Z's own visits.
- **Keep the CR-seed rules globally:** every record source-linked, `verified = no` until met, no
  personal contact details, and a `source_license` field so CC BY-SA rows stay attributable.
- **Licensing shape:** CC BY-SA data can't be relicensed under the repo's MIT licence. Keep it in
  its own file (e.g. `app/crm/seed_osh_coffee.json`) with an attribution header and a README
  data-source row saying that file is CC BY-SA 4.0.
- **Certification registries are better as verification links than as data**: a per-organisation
  "Check Fairtrade / Rainforest Alliance certificate" link answers the vetting question without
  copying anything.
- **Correction to the 2026-10-18 note:** ACE's *Farm Directory* is members-only; only the public
  competition results pages are suitable sources.
- Matches Z's direction on #8: finish and validate the Costa Rica seed on the trip first; propose the
  global catalogue as a follow-up (opened as a proposal, to build after the trip-critical items).

## Sources

- [ACE — Cup of Excellence competition & auction results index](https://allianceforcoffeeexcellence.org/competition-auction-results/)
- [ACE — Farm Directory (members only)](https://allianceforcoffeeexcellence.org/farm-directory)
- [ACE FAQ — finding out about winning farmers and farms](https://allianceforcoffeeexcellence.org/blog/faq-items/how-do-i-find-out-about-the-winning-farmers-and-the-farms)
- [Open Supply Hub — How open data can power coffee supply chains (2024-08-27)](https://blog.opensupplyhub.org/2024/08/27/how-open-data-can-power-the-transition-to-safe-and-sustainable-coffee-supply-chains/)
- [Open Supply Hub — FAQs (CC BY-SA 4.0, download limits)](https://info.opensupplyhub.org/faqs)
- [Open Supply Hub — API pricing](https://info.opensupplyhub.org/api)
- [SEI — Trase brings transparency to global coffee supply chains](https://www.sei.org/features/trase-brings-transparency-to-global-coffee-supply-chains/)
- [Rainforest Alliance — list of certificate holders](https://knowledge.rainforest-alliance.org/docs/list-of-certificate-holders)
- [Wikirate — Rainforest Alliance Certification metric (CC BY 4.0)](https://wikirate.org/~8040234)
- [FLOCERT — Fairtrade Customer Search](https://www.flocert.net/fairtrade-customer-search/)
