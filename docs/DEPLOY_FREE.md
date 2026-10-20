# Free hosting: Render + Firebase (Spark) + GitHub Actions

Put the platform on a private URL you can open from your phone, at **$0 with no card on file**.
About 20 minutes, once. Background and the options we rejected:
[`agent/research/2026-10-16-free-hosting.md`](../agent/research/2026-10-16-free-hosting.md).

| Piece | Does | Why it can't bill |
|---|---|---|
| **Render** free web service | Runs the app (Docker) | No payment method → over-limit services are suspended, not charged |
| **Firestore** on Firebase **Spark** | Stores the news archive and data series | Spark has no payment info; a quota hit switches Firestore off until the next day/month |
| **GitHub Actions** (`.github/workflows/ingest.yml`) | Calls the ingestion endpoints on a schedule and keeps the app awake | Free on public repos |

> **Never add a payment method** on Render, and **never upgrade Firebase to Blaze**. Either would
> remove the "can't bill" guarantee. If any step asks for a card, stop and comment on issue #13.

## 1. Firebase: database + key (≈8 min)

1. Go to <https://console.firebase.google.com> → **Create a project** (e.g. `coffee-monitor`).
   Google Analytics isn't needed. New projects are on the free **Spark** plan.
2. **Build → Firestore Database → Create database.** Location: `nam5 (United States)`.
   Choose **production mode** (locks out browser access; the app uses a server key).
3. **Indexes** (search and filters need them). Firestore → **Indexes → Composite → Create index**,
   three times, all on collection `articles`, query scope *Collection*:

   | Field 1 | Field 2 |
   |---|---|
   | `origins` — Array contains | `published` — Descending |
   | `topics` — Array contains | `published` — Descending |
   | `tokens` — Array contains | `published` — Descending |

   Or, from a checkout of this repo with Node installed:
   `npx firebase-tools deploy --only firestore:indexes --project <your-project-id>`
   (uses `firebase.json` + `firestore.indexes.json`). Indexes take a few minutes to build.
4. **Project settings (gear) → Service accounts → Generate new private key.** A `.json` file
   downloads. Treat it like a password: don't commit it, email it, or put it in the repo folder.

## 2. Render: the app (≈7 min)

1. Sign up at <https://render.com> with your GitHub account.
2. **New → Blueprint** → choose `zack-hum/coffee-intelligence-v1.1` → it reads `render.yaml`.
3. Fill in the values it asks for:
   - `DASH_PASSWORD` — the password you'll log in with (any username).
   - `GOOGLE_CREDENTIALS_JSON` — open the key file from step 1.4 and paste **its whole contents**.
   - `CENSUS_API_KEY`, `FAS_API_KEY` — optional free keys (see README → Configuration); leave blank if you don't have them.
4. **Apply.** The first build takes ~5 minutes. Copy the service URL
   (e.g. `https://coffee-monitor.onrender.com`).
5. Open the service → **Environment** → copy the generated `INGEST_TOKEN` value.

## 3. GitHub: the scheduler (≈3 min)

1. Repo **Settings → Secrets and variables → Actions → New repository secret**, twice:
   - `APP_URL` = the Render URL from 2.4
   - `INGEST_TOKEN` = the value from 2.5
2. **Actions → Ingest → Run workflow** → choose `data`, then run it again with `news`.
   Both should finish green within a few minutes.

## 4. Check it

- Open the URL on your phone, log in, and check the Overview and News pages show live data.
  In Safari/Chrome use **Add to Home Screen** for an app-like icon.
- After that, the schedule runs by itself: news every 30 min, prices + weather every 3 h,
  all datasets daily, and a wake-up ping every 10 min so pages open fast.

## Good to know

- **Slow first load (~1 min):** Render's free plan sleeps after 15 idle minutes. The 10-minute ping
  prevents this most of the day, but GitHub can delay scheduled runs.
- **Deploys:** Render redeploys automatically when `main` changes and CI is green.
- **Limits:** one always-on free service uses ~744 of Render's 750 free hours a month. Firestore's
  free quota is 50k reads / 20k writes a day; the app is written to stay well inside it. If a quota
  is hit, the app shows errors until the quota resets rather than charging you.
- **GitHub pauses schedules after 60 days without repo activity.** Any commit or a manual run
  re-enables them (Actions → Ingest → Enable workflow).
- **Before the secrets are set**, the Ingest workflow skips with a notice instead of failing.
- **Offline on farms** isn't covered by hosting; that's the PWA work in issue #10 (Field mode).
- Going live on Google Cloud Run instead (needs a billing account) is still `./deploy.sh`.
