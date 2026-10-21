# Offline-first mobile data entry: UX and platform constraints (2026-10-18)

Backs proposal #10 (Field mode: offline visit and cupping log). The question for this note: what does
a phone web app need to do so Z can log farm visits and cuppings with no signal in January, without
losing anything, on an iPhone or an Android phone?

## 1. Platform constraints (the part that can silently lose data)

**iOS / Safari has no Background Sync.** The Background Sync, Periodic Background Sync and Background
Fetch APIs aren't available on iOS, so a queued entry can't upload while the app is closed. The usual
workaround is to retry when the page fires `online` and when `visibilitychange` turns visible.
([MagicBell iOS PWA guide](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide))
Android Chrome does support Background Sync, but we shouldn't need it.

**Storage quotas are no longer the problem; eviction is.** Since Safari 17 (iOS 17), an origin can
use up to roughly 60% of disk in a browser and the same in a Home Screen web app. Data is evicted
per origin, least-recently-used first, under storage pressure or after ITP inactivity. Origins in
persistent mode may be excluded. `navigator.storage.persist()` requests that mode, and WebKit decides
with heuristics such as whether the site is opened as a Home Screen web app.
([WebKit: Updates to Storage Policy](https://webkit.org/?p=14403); MDN
[storage quotas and eviction](https://developer.mozilla.org/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria))
(Older guides quoting a 50 MB Safari cap predate this change.)

**The 7-day ITP rule doesn't apply to installed apps.** In Safari, after seven days of browser use
without a visit to the site, cookies and script-writable storage (IndexedDB, localStorage, service
worker caches) are deleted. A Home Screen app has its own counter that resets every time it's used.
WebKit has called deleting first-party web app data a bug, though it's stated as an intention, not a
guarantee.
([Search Engine Land summary](https://searchengineland.com/what-safaris-7-day-cap-on-script-writeable-storage-means-for-pwa-developers-332519))

**iOS install is manual only.** There is no install prompt: the user has to tap Share and then Add to
Home Screen. ([MagicBell](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide))

**Takeaway:** an installed PWA plus `persist()` plus an IndexedDB outbox is safe enough for a
two-week trip, as long as sync runs whenever the app is opened and there's a manual backup.

## 2. How proven field-data tools handle offline use

**KoboToolbox / Enketo web forms.** These are the closest analogue: browser forms used offline in
remote areas.
([Kobo docs: data through web forms](https://kobotoolbox-documentation.readthedocs.io/en/latest/data_through_webforms.html))
- The form must be opened once *with signal* to cache it. An icon then shows it's ready offline.
- *Save as draft* (stays editable, never uploads) is kept separate from *Submit* (queued, locked, uploads).
- A queued-records counter, and auto-upload every few minutes, but only while the page is open and online.
- The queue can be **exported as a zip** as a manual escape hatch.

**Cropster Cup**, the industry cupping app, works online and offline. Its mobile redesign focused on
one-handed use and removing horizontal scrolling. **Sliders** with custom scales and steps are its
main input; it says they make phone entry faster and more accurate. Descriptors are predefined per
category so cuppers tap rather than type.
([Cropster blog](https://www.cropster.com/blog-post/connected-cupping-gets-even-better-on-your-mobile-phone))

**Kobo community advice** for remote collection: test the full offline round-trip on the real device
before going, keep forms short, and sync whenever you're back in coverage.
([Kobo community: offline best practices](https://community.kobotoolbox.org/t/best-practices-for-offline-data-collection-in-remote-areas/76424))

## 3. The CVA affective form is easy to support

The SCA Coffee Value Assessment's affective form rates eight attributes (fragrance, aroma, flavor,
aftertaste, acidity, sweetness, mouthfeel, overall) on a **1–9 scale**, where 5 means neither high
nor low. It also marks non-uniform and defective cups. The score is
**0.65625 × (sum of the 8 ratings) + 52.75 − 2 × non-uniform − 4 × defective**, rounded to 0.25.
All 9s give 100 and all 5s give 79.
([open-exam-prep CVA affective summary](https://open-exam-prep.com/study-guides/sca-q-grader/cva-descriptive-affective/cva-affective-form-scoring);
[Royal Coffee: using the new SCA form](https://www.royalny.com/how-to-use-the-new-sca-cupping-form);
official forms: [SCA CVA forms, May 2025 PDF](https://library.sweetmarias.com/wp-content/uploads/2025/06/SCA-CVA-Forms-English-May-2025.pdf))

The descriptive form adds intensity scales, check-all-that-apply flavor categories, and notes per
attribute. That's more than a field tool needs in v1.

## Implications for us (#10 Field mode, and #13 hosting)

1. **Sync on open, not in the background.** Flush the IndexedDB outbox on load, on `online` and on
   `visibilitychange` → visible. Don't depend on the Background Sync API. This is cheaper than what
   #10 implied and works on both platforms.
2. **Make installing part of the feature.** Add a one-time "Install for offline use" card with iOS
   Share → Add to Home Screen steps. Call `navigator.storage.persist()` after install and show the
   result ("storage: protected / best-effort").
3. **Ready-offline indicator plus a pre-trip checklist.** Show "available offline ✓" once the shell
   and reference data (suppliers, regions) are cached. This matters more with #13's Render free
   tier, which sleeps when idle: the first load needs signal and a cold start.
4. **Draft vs saved vs synced.** Use three visible states per entry and an "N waiting to sync"
   badge, which #10 already plans. Keep entries editable after sync; Z is the only user, so
   last-write-wins on a client-generated ID is fine.
5. **Export backup.** Add a "Download my field data (JSON)" button that works offline: the Kobo-style
   escape hatch if a phone dies or storage is cleared. Small to build, big safety margin.
6. **Cupping form = the CVA affective scale.** Use 8 sliders on 1–9 (default 5), cup counts for
   non-uniform and defective, a live score from the formula above, and tap-to-add descriptor chips.
   This keeps us close to the current SCA standard without copying the sheet's layout. The
   descriptive form is out of scope for v1.
7. **Acceptance test on a real phone.** Add to #10's criteria: airplane mode on an installed iPhone
   PWA → log a visit and 4 cups → force-quit → reopen → entries still there → back online → synced
   once.

None of this changes #10's size (M) or adds dependencies. I'll post the deltas as a comment on #10
rather than opening a new proposal (5 are open, at the cap).

## Would improve quality (paid, not wired in)
- Cropster Cup / Origin: mature cupping and lot management. Worth benchmarking UX against if Z ever
  trials it.
