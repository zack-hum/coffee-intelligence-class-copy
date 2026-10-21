# Strategy

**Status: first draft (2026-10-21), written by the agent for #11. Z edits and has final say.**
Nothing here is settled until Z merges it. After that, every change starts as a `proposal` issue and
reaches this file only through a PR Z merges (see [DEVELOPMENT.md](DEVELOPMENT.md)).

Evidence lives in `agent/research/`; each section links the notes behind it.

## 1. Vision

**The independent sourcing workspace for specialty green coffee, with market intelligence built in.**

One place where a buyer or broker keeps their suppliers, visits, samples, cuppings and deals, and sees
each of them next to the market context that matters: C price, FX, differentials, harvest timing, news
and origin risk. It has to work on a farm with no signal and still hold up for a team that buys
containers.

## 2. Positioning

- **Neutral.** We don't sell coffee, list lots or take a commission. Marketplaces (Algrano, Cropster
  Hub, Beanstock, greensquare) show only their own network; seller back-offices (CropConex, Cropster
  Origin) serve the other side of the trade. Nobody gives the *buyer* a workspace across all their
  suppliers with market data alongside.
  ([competitor landscape](../agent/research/2026-10-15-competitor-landscape.md),
  [market map](market-map/specialty-coffee-software.md), [COMPETITORS.md](../agent/COMPETITORS.md))
- **Complement, don't compete on liquidity.** A neutral tool sits beside whichever marketplace or
  importer a buyer already uses.
- **Vendor-neutral by design.** Cropster is consolidating roastery software, so independents have a
  reason to want a tool that isn't tied to one vendor
  ([roaster & ops map](market-map/roaster-and-ops-software.md)).
- **Rejected alternative:** a marketplace. It needs liquidity and capital, and incumbents already own it.

## 3. Who it's for

| Order | Segment | Why now |
|---|---|---|
| 0 | **Z** — scout for a future import business and broker for other buyers (Costa Rica, Jan 4–17, 2027) | User zero: every early feature is tested on a real sourcing trip. |
| 1 | **Small-to-mid specialty roasters** | They do the whole sourcing core, have the least tooling (spreadsheets and importer offer lists) and feel price shocks first. |
| 2 | **Independent importers / exporters** | Same core plus contracts, release schedules and pre-ship/landed sample approval. |
| 3 | **Larger roasters and enterprise teams** | Same core plus forecasting, many users and permissions. Build when a real team asks. |
| — | Cafes | Most buy roasted coffee, so green sourcing is a weak fit. A cafe that roasts is a small roaster. |

Rejected alternative: cafes first, because sourcing for most cafes means choosing roasters, not buying green.
([segment workflows](../agent/research/2026-10-16-segment-sourcing-workflows.md))

## 4. The sourcing jobs-to-be-done

Z's words: find & vet suppliers · log visits & cuppings · price & negotiate · market research ·
data tracking · CRM (suppliers, contacts, buyers, follow-ups).

| Step | Small roaster | Large roaster | Importer / exporter | Z | What we have |
|---|---|---|---|---|---|
| **Find & vet** suppliers | ✔ | ✔ | ✔ | ✔ | Sourcing CRM + CR seed list (#8, shipped) |
| **Visit** farms and mills | some | ✔ | ✔ | ✔ | Field mode visits, GPS, CR checklist (#10, in review) |
| **Sample & cup**, send feedback | ✔ | ✔ | ✔ (pre-ship + landed) | ✔ | Field cupping flights (#10) |
| **Price & negotiate** | ✔ | ✔ | ✔ | ✔ | Implied-price tool; Offer check (#9, re-scope pending) |
| **Contract & ship** | light | ✔ | ✔ | later | CRM pipeline stages; contract/release tracker later |
| **Track & re-buy** | ✔ | ✔ | ✔ | ✔ | CRM history; market, origin and news pages |

**The shared core** is supplier records, a sample/cupping log with feedback, price context
(C + differential + FX + quality) and follow-ups, with market and origin monitoring around it.
Segment layers come after: contract & release tracking and forecasting for larger buyers.

## 5. What "best" means — quality bars

Each bar is testable. A feature that touches one of them should say how it moves it.

| # | Bar | Target | How we check |
|---|---|---|---|
| Q1 | **Works on a farm** | Log a visit and a 4-cup flight in airplane mode on an installed phone; it survives a force-quit and syncs exactly once. | Playwright offline test in CI + Z's real-iPhone check (#10) |
| Q2 | **Fast offer check** | Any offer can be compared with a sourced benchmark in under 30 s on a phone. | Timed walk-through when #9 lands |
| Q3 | **Every number has a source and an age** | No price, rate or benchmark shown without its source and timestamp. | Test that every API price field carries `source` + `as_of`; UI review |
| Q4 | **Never mixes price bases** | Farmgate, FOB and landed are never plotted on one axis unconverted. | Unit tests on conversions (#9) |
| Q5 | **Licensed data only** | Every source in the README table has terms that allow our use. | Checked in each PR that adds a source |
| Q6 | **Runs at $0** | Prototype costs nothing and can't start billing. | Free tiers that hard-stop instead of billing (#13) |
| Q7 | **Your data is yours** | Everything exports to CSV/JSON in one tap, offline included. | Export tests (#8, #10) |

([offline field UX](../agent/research/2026-10-18-offline-first-field-entry-ux.md),
[price ladder UX](../agent/research/2026-10-19-price-ladder-ux.md),
[SCTG licensing](../agent/research/2026-10-20-sctg-licensing.md),
[free hosting](../agent/research/2026-10-16-free-hosting.md))

## 6. Moat — what's hard to copy

1. **Joins nobody else makes.** Relationships × visits × cuppings × live C/FX × harvest timing, in one
   record. Marketplaces have lots; cupping apps have scores; data vendors have prices. We have them together.
2. **Your own deals become the benchmark.** SCTG can't be redistributed, so the offer check's band will
   come from logged offers and contracts once an origin and tier has enough of them
   ([SCTG licensing](../agent/research/2026-10-20-sctg-licensing.md)). That data grows with use and
   belongs to the user.
3. **Costa Rica ground truth.** Z's visits, verified suppliers and observed harvest status per region
   ([CR sourcing](../agent/research/2026-10-17-costa-rica-sourcing-specifics.md),
   [CR harvest during the trip](../agent/research/2026-10-21-costa-rica-harvest-during-trip.md)).
   The farmgate → FOB → CoE ladder (ICAFE + FX + C + auction results) is a join specific to that origin.
4. **Offline-first field work.** Few tools are built for farms with no signal.

## 7. Current bets (until the trip ends, Jan 17, 2027)

In Z's approved build order (#14):

1. **Card-free hosting** (#13) — PR #18. Reachable from a phone before Jan 4.
2. **Sourcing CRM** (#8) — merged.
3. **Field mode** (#10) — PR #19. Offline visits and cuppings.
4. **Harvest phase by region + your observations** (#21) — proposed, size S.
5. **Offer check** (#9) — re-scoped to licensed benchmarks; waiting on Z's "go".
6. **This strategy** (#11).

After the trip: global supplier catalogue (#20), contract & release tracking, a "path to public beta"
proposal (see below).

## 8. Constraints that shape the strategy

- **The prototype is free** (CLAUDE.md). Paid options only by proposal with a strong reason.
- **Data licensing decides how public we can go.** Yahoo Finance's chart API and Google News RSS are
  fine for a personal tool but not for republishing to the public. SCTG has no redistribution grant.
  A public product needs open or licensed sources for prices and news, and that is the main blocker to
  launch, not the tech stack.
- **Monitoring only:** no order execution or trading.

## 9. How we'll know it's working

- **During the trip:** Z logs every visit and cupping in Field mode (target: all of them, zero lost
  entries), and the CR seed list gets verified or corrected in person.
- **After the trip:** Z uses the CRM to follow up with suppliers and buyers instead of a spreadsheet
  or notes app, and at least one offer check is used in a real price conversation.
- **Before any segment beyond Z:** 3–5 small roasters try the shared core and say which step it
  replaced. (How we recruit them is a later proposal.)

## 10. Out of scope for now

Monetization and pricing (own proposal later), a marketplace, AI/LLM features in the app (default
today, open to a proposal), enterprise permissions before a team asks.

## Open questions for Z

- Is the segment order in section 3 right, given your broker work? (Default: yes.)
- Are the quality bars in section 5 the ones you'd judge us by? Add or cut freely.
