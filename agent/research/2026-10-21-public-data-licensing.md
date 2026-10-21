# Which of our price and news sources could a public product use? — 2026-10-21

**Question:** Z asked on #18 whether this prototype could go public (web or app store). The real
blocker is data licensing, not hosting. Which of today's sources may we show to the public, and what
free, openly licensed sources could replace the ones we can't? This backs the "path to public beta"
proposal I promised on #18 once #8 and #10 are merged.

Not legal advice. Each finding is what the provider's own page says, paraphrased.

## Findings

### Today's sources, sorted by what a public deployment could do with them

| Source (today) | What its terms say | Public product? |
|---|---|---|
| **Yahoo Finance chart API** (KC=F, DXY, FX) | The unofficial API is for personal use only. The best-known client library says so in its README and points to Yahoo's terms ([yfinance README](https://cdn.jsdelivr.net/gh/ranaroussi/yfinance@main/README.md)). | **No.** Fine for Z's own instance. |
| **ICE futures (the underlying KC data)** | Showing even *delayed* ICE prices publicly on a website needs approval from ICE Data ([ICE quote data distribution](https://ice.com/market-data/quote-data-distribution)). | **Only with an ICE licence**, through Yahoo or anyone else. |
| **Google News RSS** (most of our news) | Google has long said its News feeds aren't for commercial republishing ([FullPress, 2010](https://www.fullpress.it/en/rss-feed-google-news-illegal-commercial-republication/); old, so re-check the current Google page). | **No** for a commercial product. Grey area for a free, non-commercial one. |
| **CFTC Commitments of Traders** | US federal data, published under the CFTC's open-data plan ([CFTC open data plan](https://www.cftc.gov/media/14706/CFTCOpendDataPlan0926/download)). | **Yes**, with attribution as good practice. |
| **IMF primary commodity prices** (via FRED) | Downloading, publishing and redistributing are allowed with a citation ("Source: International Monetary Fund, <database>, <link>"). **Commercial reuse needs an email to copyright@imf.org first.** Bulk automated downloading needs permission ([IMF copyright and usage](https://www.imf.org/en/about/copyright-and-terms/index.md)). | **Yes, non-commercial** with citation. Ask before charging. |
| **Open-Meteo, NOAA, US Census, USDA** | US government data, plus Open-Meteo's free non-commercial API (not re-checked this run). | **Yes** for a free product. Re-check Open-Meteo's commercial terms before charging. |
| **ICO daily I-CIP** (not wired in) | Daily figures are posted free as PDFs. The data is free for ICO members, governments and academics; "other users" are asked to request a quote. No open licence is stated ([ICO public market information](https://ico.org/resources/public-market-information/)). The new data.ico.org platform shows the latest year free; history and extraction are for members and subscribers ([Daily Coffee News, 2026-09-30](https://dailycoffeenews.com/2026/09/30/ico-puts-global-coffee-market-data-in-one-interactive-place/)). | **Link out only**, unless the ICO agrees. |
| **World Bank Pink Sheet** (monthly arabica/robusta, not wired in) | The World Bank uses CC BY 4.0 "as much as possible", but each dataset carries its own terms ([World Bank data catalog FAQ](https://datacatalog.worldbank.org/faq)). I couldn't confirm the commodity-price dataset's own tag this run. Its coffee series are compiled partly from Bloomberg and ICO data ([stevedata docs](https://rdrr.io/cran/stevedata/man/commodity_prices.html)). | **Probably yes, but unverified.** Check the dataset's terms tag before using it. |

### The best open replacement for Google News: GDELT

- The GDELT Project says all its datasets are free for **academic, commercial or government use of any
  kind**. You may redistribute, rehost and republish them. The one condition is a citation and a link to
  GDELT ([GDELT about](https://www.gdeltproject.org/about.html)).
- It monitors news in 100+ languages, which suits origin-language coverage (Spanish for Costa Rica,
  Portuguese for Brazil).
- Showing a **headline plus a link** to the publisher is the normal pattern. Full article text stays
  with the publisher.
- Don't confuse it with **GDELT Cloud**, a separate paid service. Its free accounts are for evaluation only
  and may not show output to anyone else ([GDELT Cloud terms](https://www.gdeltcloud.com/terms)).
- Not checked this run: the free DOC 2.0 API's rate limits, and how well it covers coffee trade press
  compared with our current Google News queries. That needs a side-by-side test.

### What a live C price costs, honestly

There is no free, licensed, public-display source for the live or delayed **ICE arabica** price. Every
route ends at an ICE licence. Free open alternatives are **monthly** (IMF, World Bank), **weekly** (CFTC
positioning) or daily PDFs with no reuse grant (ICO).

## Implications for us

1. **Add a per-source licence flag now; decide what to drop later.** Each feed and dataset in
   `app/config.py` would get a `public_ok` field plus a source-terms link, and a `PUBLIC_MODE` setting would
   turn off everything not marked `public_ok`. Z's own instance keeps every source. This is the core of the
   "path to public beta" proposal and costs about a day. It also makes quality bar Q5 in the STRATEGY draft
   testable.
2. **News for a public product: GDELT first, publisher RSS second, Google News only on personal instances.**
   Next step is a side-by-side test of GDELT DOC results against our Google News queries for 2–3 origins
   (a later research run, no code).
3. **Price for a public product:** show IMF/World Bank monthly series and CFTC weekly data with
   citations, plus the user's **own** logged offers (the #9 re-scope). A live KC tile is either dropped in
   public mode or becomes a paid ICE-licensed option. That's Z's decision and would need a cost quote.
4. **Commercial is a separate step from public.** IMF, and possibly Open-Meteo, need permission or a paid
   tier once we charge money. Keep monetisation out of the public-beta proposal, as STRATEGY.md says.
5. **Nothing changes before the trip.** Z's own deployment is personal use, so every current source stays
   on.

Paid options that would improve quality (not proposed): an ICE delayed-data display licence; a licensed
news API.
