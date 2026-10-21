# Free FX and ICAFE farmgate price sources (2026-10-17)

Topic rotation: **new free data sources**. Goal: confirm a free, citable CRC/USD source with
history and a source for ICAFE's farmgate liquidación, so the Offer check (#9) can show
farmgate ↔ FOB ↔ implied price for Costa Rica. Paraphrased; figures as reported by the sources.

## What we use today

- Origin FX comes from the **Yahoo chart API** (`CRC=X` etc.), unofficial, archived daily by
  `job_closes`; **open.er-api.com** is the latest-rate fallback. Neither is an official
  reference rate, and open.er-api's free tier has no history.

## Findings

### FX

| Source | Coverage | Key? | History | Provenance | Fit |
|---|---|---|---|---|---|
| **Frankfurter v2** (`api.frankfurter.dev/v2/providers/{p}/rates`) | Aggregates official rates from many central banks (e.g. ECB, US Treasury with 181 currencies back to 2001, Central Bank of Kenya, State Bank of Pakistan); has a CRC currency page | No | Yes (`from=`, `group=month`) | Official central-bank / Treasury rates | **Best default for dated history** |
| **BCCR web service** (indicators 317 buy / 318 sell CRC/USD) | Costa Rica's official reference rate, daily | Free registration: email + token | Yes (date ranges) | Official (BCCR) | Best for CR, but **needs Z to register**; server-side only (CORS) |
| **fawazahmed0 exchange-api** (jsDelivr / Cloudflare Pages) | 200+ currencies, daily snapshots by date | No | Yes (`@YYYY-MM-DD`) | Underlying source not stated | Good keyless fallback; weak provenance |
| Yahoo `XXX=X` (current) | All our origins | No | Yes (daily closes) | Unofficial market quotes | Keep for intraday/live |

- Frankfurter's site returned server errors for several pages this run, so the exact provider
  for CRC (BCCR directly vs US Treasury quarterly) and the licence page were **not verified** —
  check with a fixture-backed fetch when #9 is built.
- Costa Rica's coffee sector also has a **preferential exchange scheme**: Banco Nacional, under an
  agreement with ICAFE, lets mills/exporters sell dollars at better than the teller rate
  (Delfino, Jan 2025). So the rate a micro-mill actually gets can differ from the BCCR reference —
  a good trip question.

### ICAFE farmgate (liquidación)

- **No machine-readable ICAFE feed was found.** The liquidación figures that matter reach the
  public through ICAFE statements quoted in the press (CRHoy, Teletica, Daily Coffee News).
- Figures to use as dated reference rows (₡ per fanega, ~46 kg green-equivalent):
  - 2025/26: **₡118,627** estimate (Teletica, Feb 2026) → **₡115,754** later figure (CRHoy, May 2026). Use the later one.
  - 2026/27 projection: **₡91,340** (assumes record Brazil crop, NY at $2.40–2.75/lb, ₡450/USD) — the midpoint of the ₡83–99k range in the earlier note.
  - ICAFE cost of production example: **₡107,630/fanega** (20 fanegas/ha farm) → the 2026/27 projection is below cost.
  - Sensitivity: at ₡650/USD the same 2025/26 harvest would have paid ~₡162,014/fanega (Teletica) —
    i.e. FX alone swings farmgate by ~37%.
  - Historic: the colón's fall from ₡685 (Jun 2022) to ₡515 (Jan 2024) cost producers ~₡19,306/fanega (CRHoy, Feb 2024).

## Implications for us

1. **#9 Offer check — FX:** use **Frankfurter v2** as the dated history source (keyless, official),
   keep Yahoo for live quotes and open.er-api as last-resort latest. Make **BCCR optional**: if
   `BCCR_EMAIL`/`BCCR_TOKEN` are set in `.env`, prefer BCCR's 317/318 for CRC. Rejected: fawazahmed0
   as primary — no stated provenance, so not citable in a price conversation.
2. **#9 — ICAFE farmgate:** a small curated table in `app/config.py` (season, ₡/fanega, status
   estimate/final/projection, date, source URL), converted with the season-average CRC/USD.
   Show the cost-of-production line next to it. Manual curation is fine: ICAFE updates a few times
   per season. Stays inside #9's S/M size.
3. **Costa Rica page:** chart CRC/USD against KC — the press consistently says FX moves producer
   income as much as the C price. Candidate follow-up once #9 lands (not a new proposal: 5 open).
4. **Trip questions to add to the visit checklist:** "Do you sell dollars at the BN/ICAFE
   preferential rate?" and "Which liquidación do you pay against — interim or final?"
5. Would improve quality (paid/not free, don't wire in): Bloomberg/Refinitiv official fixings;
   ICAFE's full per-mill liquidación tables if they're only available on request.

## Sources

- [Ante posibles pérdidas millonarias, ICAFE insta a productores a prepararse — Teletica, 2026-02-26](https://www.teletica.com/nacional/ante-posibles-perdidas-millonarias-icafe-insta-a-productores-a-prepararse_402982)
- [Productores de café reciben ¢19.306 menos por fanega debido a caída del tipo de cambio — CRHoy, 2024-02-08](https://crhoy.com/economia/productores-de-cafe-reciben-19-306-menos-por-fanega-debido-a-caida-del-tipo-de-cambio/)
- [Sector cafetalero se beneficiará con tipo de cambio preferencial — Delfino, 2025-01](https://delfino.cr/2025/01/sector-cafetalero-se-beneficiara-con-tipo-de-cambio-preferencial-impulsado-por-icafe-y-bn)
- [bccr-indicadores-economicos (wrapper README: indicators 317/318, email+token)](https://unpkg.com/bccr-indicadores-economicos@2.1.3/README.md)
- [BCCR web service registration](https://www.bccr.fi.cr/indicadores-economicos/servicio-web)
- [Frankfurter — U.S. Treasury provider page (v2 endpoints)](https://frankfurter.dev/providers/ust/)
- [Frankfurter — Costa Rican Colón](https://frankfurter.dev/currencies/crc/) (not reachable this run)
- [AllRatesToday vs Frankfurter 2026 (competitor's comparison; "80+ central banks", keyless)](https://allratestoday.com/blog/allratestoday-vs-frankfurter-2026.md)
- [fawazahmed0/exchange-api docs](https://docsearch.algolia.com/mcp/docs/repo/fawazahmed0/exchange-api)
