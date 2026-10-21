# Costa Rica harvest during the trip window (Jan 4–17, 2027) — 2026-10-21

**Question:** Which Costa Rican regions will be picking, at what phase, while Z is there, and
what does the 2026/27 crop look like going in? Is our harvest calendar (`config.CR_REGIONS`) good
enough to plan visits with?

## Findings

**Regional timing (labour-demand view).** La Nación's report on seasonal labour gives the most
concrete regional sequence I found ([La Nación](https://www.nacion.com/economia/agro/cosechas-estacionales-trasladan-la-presion-por/Y6HW6GTM7VBVDNIQD463E5543Q/story/)):
- The south starts first: Coto Brus needs pickers from **August**, and Pérez Zeledón and Turrialba start around then too.
  Ripening in the south peaks in **September–October**.
- The **Central Valley** starts around September–October, with labour need building from late October or November.
- **Los Santos (Tarrazú/Dota/León Cortés)**, the largest-volume region, joins in **December**.
- **January is the most critical month nationally.** ICAFE estimates about 73,000 coffee pickers are needed then,
  around 60% of them foreign workers. The peak runs from late November to February and tapers in March–April.

**General calendars** from importers and roasters say only "October–March" for harvest and "November–June" for export,
with no split by region ([Royal Coffee origin profile](https://www.royalny.com/origin-profile-costa-rica); Starbucks
Coffee Academy map). The Wikipedia regional table is garbled, so it can't be cited. ICAFE's own FAQ page blocks automated
fetching. I found no free, machine-readable regional harvest calendar.

**Last season ran short and finished early.** In 2025/26, some high-altitude regions reported crops 50–70% below the
strong year before. There were fewer washed microlots and more honeys and naturals. Cash-strapped young micro-mills
sold fast, and buyers were already asking for samples from February ([Algrano, Central America & Mexico harvest 2026](https://algrano.com/learn/central-america-mexico-harvest-2026)).

**2026/27 going in:**
- **Volume.** USDA FAS forecasts 1.2 M bags, up 3.5%, helped by an "on" year in the biennial cycle. Exports are forecast
  at 1.06 M bags. Grower numbers keep falling (24,653 in 2024/25, 48% fewer than a decade ago)
  ([Daily Coffee News on the USDA GAIN annual](https://dailycoffeenews.com/2026/06/03/costa-rica-coffee-report-production-up-but-growers-struggle-to-find-profit/);
  [USDA FAS](https://www.fas.usda.gov/data/gain/2026/05/costa-rica-coffee-annual)).
- **Weather risk.**
  - IMN warned in July of El Niño rainfall cuts of up to 30% in the second half of 2026 ([StoneX, Jul 2026](https://www.stonex.com/en-us/insights/central-america-s-coffee-belt-enters-a-critical-season-as-weather-risks-labor-shortages-and-regulatory-pressures-mount/)).
  - By mid-August, IMN forecast August–October rain up to 40% below normal in the Central Valley, Central and South
    Pacific and western Northern Zone, and up to 60% below in the North Pacific (Guanacaste).
  - Patchy rain means uneven flowering, so cherries ripen at different speeds and the harvest is more stretched and uneven
    ([Planting Costa Rica, Aug 17 2026](https://www.plantingcostarica.com/single-post/when-the-rains-don-t-come-drought-puts-costa-rica-s-coffee-crop-under-pressure)).
- **Economics, not weather, is the main squeeze.** The colón is about 35% stronger since mid-2022. The average rate went from
  ₡504.76 to ₡459.65 per USD in 2025/26, and grower revenue is about 30% below 2021/22. ICAFE export prices fell from $574
  per bag in October 2025 to $378 in April 2026 (sources above; consistent with the 2026-10-17 note).

## What this means for the trip (Jan 4–17)

| Region | Our config window | Expected phase Jan 4–17 | Confidence |
|---|---|---|---|
| Tarrazú / Los Santos | Nov–Mar | **Peak.** Started in December, the biggest volume, most mills running | High (La Nación) |
| West Valley | Nov–Feb | **Peak to late.** Central Valley-type timing | Medium |
| Central Valley | Nov–Feb | **Peak to late** | Medium (La Nación) |
| Tres Ríos | Nov–Feb | **Peak to late** | Low (no regional source) |
| Orosi | Sep–Feb | **Late** | Low |
| Turrialba | Aug–Feb | **Late / tail** | Medium (La Nación) |
| Brunca (Pérez Zeledón, Coto Brus) | Aug–Jan | **Tail / mostly finished.** Started in August, peaked Sep–Oct | Medium (La Nación) |
| Guanacaste | Oct–Feb | **Late.** Drought risk could pull it earlier | Low |

Uneven flowering after the dry Aug–Oct means **cherries at mixed ripeness on the same farm**. Expect selective
picking passes, and ask about pass number and float/density sorting. If 2025/26 is a guide, the best washed lots may be
spoken for early. Ask for pre-shipment samples on the spot rather than waiting for February.

## Implications for us

1. **Our harvest calendar is month-binary and unsourced.** It says only whether a month is "in" or "out". The planning
   question is **phase** (early / peak / late / tail) per region during the trip dates. That's a small data change:
   start month, peak months and end month per region, each with a source link and a confidence level. The existing
   trip planner then shows "peak in Los Santos, tail in Brunca" instead of "harvest during your trip" for all eight regions.
2. **Z's Field visits are the best ground truth.** Each visit already records `harvest_status` (pre/early/peak/late/done).
   Showing the latest observed status per region next to the published phase ("you saw *late* in Naranjo on Jan 8") is a
   unique join that no competitor has, and it costs nothing to collect.
3. **Route suggestion (for Z, not code):** spend the peak-week days in Los Santos, with West and Central Valley after.
   Leave Brunca for exporter and dry-mill conversations rather than picking.
4. **No new data source needed.** Open-Meteo is already wired for the regional 16-day forecast. A
   rainfall-anomaly-since-flowering view would help with the uneven-ripening story, but it's a separate, later item.
5. **Paid sources that would improve quality:** none that matter here. ICAFE's regional *informes* are free PDFs and are
   the right citation once someone can fetch them by hand. The site blocks bots.

→ Proposal: **"Harvest phase by region, with your Field observations"** (size S).
