# Thedocrot Phase 2 migration — 15 November 2026

## Scope and starting state

Only the local Thedocrot website was migrated. No commit, push, publication or deployment occurred. Other creator websites were not modified. One strictly necessary Hub configuration correction is described separately in HUB-COMPATIBILITY.md.

The checkout already contained uncommitted migration work at the beginning of this turn: index.html, js/app.js, js/youtube-config.js, a shared client, an adapter, and a preview server. That work was inspected and completed rather than overwritten. The committed HEAD supplied the original website for comparison. CSS, CNAME and all five artwork/milestone images remain unchanged. An existing tests/.browser-profile directory was left intact and excluded with tests/.gitignore.

## Before and after

Before: browser-visible API key; per-browser channels/playlistItems/videos/search requests; cached live state could remain visible after it became old. Original filters used up to 60 uploads from a three-page scan.

After: only https://api.creatorpromote.com/data/thedocrot.json supplies API data. The vendored shared client matches the Hub source byte-for-byte. The adapter accepts the currently published version-1 schema and the improved Hub catalog. It preserves video categories, six visible cards per category, completed replays, subscriber/view/video statistics, and milestone progress. Fresh observations say OBSERVED LIVE with a timestamp; stale, future, failed or inconclusive observations show unknown. A timer expires live status without waiting for another download. Saved results remain available during temporary failures. Missing/hidden/invalid counters are not presented as fabricated zero counts.

The design, responsive CSS, 3D card, tilt/flip interactions, hover transitions, navigation, playbook links, social links and historical milestone images are retained. HTML edits concern corrected Thedocrot naming and loading/feed-status text; all original IDs, href values and src values remain. Profile artwork and branding graphics were not redesigned.

## Exact website files changed or added relative to HEAD

- index.html: naming and loading/status explanatory text.
- js/app.js: replaces direct YouTube requests with shared-client subscription/manual refresh; existing UI handlers/renderers retained; graceful unavailable states and valid-stat checks; spotlight restored even when a recovered feed has the same content.
- js/youtube-config.js: public Hub URL, creator slug and verified existing feed ID; removes browser key.
- js/creatorpromote-hub.js: unchanged copy of the improved Hub client, not a separate fork.
- js/hub-adapter.mjs: legacy/proposed schema mapping; category rules; up to 60 uploads; completed/public replay checks; creator validation; null/invalid catalog entry handling.
- tests/preview-server.cjs: loopback-only local preview, committed-original comparison route, simulated scenarios and fetch-destination instrumentation. It substitutes a fake key and fixture cache when showing the original; it does not use the old real key.
- tests/migration.test.mjs: 14 regression tests.
- tests/fixtures/published.json: public response captured on 15 November; updatedAt 2026-11-15T14:19:31.878Z.
- tests/fixtures/proposed.json: synthetic 70-item catalog produced by the actual improved Hub fetchChannelData with a mocked YouTube provider; three-page scan configured. This is not a production response.
- tests/.gitignore: excludes the pre-existing browser profile.
- tests/HUB-COMPATIBILITY.md: explains the sole Hub scan-depth correction.
- tests/MIGRATION-REPORT.md: this report.

Outside this repository, the only source/configuration change was CreatorPromote-API-Hub/config/channels.json: thedocrot.scanPages changed from 2 to 3. Test screenshots are chat output artifacts, not website assets.

## Automated validation

Run: node --test tests/migration.test.mjs. Result: 14 passed, 0 failed.

Coverage: real published schema capture; actual proposed Hub output; 60-item category pool; category matching; fresh/stale/future live states; partial video failure; ended/upcoming broadcasts; creator mismatch; empty/missing stats; malformed/private catalog entries; normalized lists; cached HTTP fallback; preservation of all original HTML IDs/assets/link destinations and identical CSS; absence of API keys/direct YouTube Data API requests in production scripts.

The malformed-catalog test initially found a null-entry exception in replay filtering; that was fixed and the test passes. All six website/test JavaScript files passed node --check. Git diff --check passed. The Hub's 33 tests also passed after granting its existing disk-backed tests temporary-fixture write access; five initially failed only with EPERM before any test assertions ran. No Hub test source was changed.

## Browser validation

Used the connected in-app Chromium browser against a loopback server. No production page was modified. Desktop viewport 1440x1000; mobile 390x844 and 375x812; tablet 768x1024. This is browser viewport testing, not a physical-phone test.

- Real cross-origin Hub request succeeded in the browser; public feed showed 733 subscribers, six upload cards and six replay cards. The old observation correctly displayed unknown live status and a delayed-feed message.
- Fetch instrumentation reported only https://api.creatorpromote.com/data/thedocrot.json. Source regression checks also prohibit direct YouTube Data API calls and key literals.
- Proposed-schema fixture: all four filter buttons, six cards/category, six replays, fresh live spotlight, 450 subscribers, 800K views, 1,600 videos, goal 500 and 50% progress passed.
- Manual Refresh and feedback toast passed. Active category remains selected after refresh.
- Fresh legacy schema, stale feed, partial video failure, empty results, missing stats, hidden subscribers, wrong creator, malformed JSON, HTTP 503 cold start and cached fallback were checked. Expected links/fallbacks remained usable. Feed failure did not disable card flipping or filters.
- An eight-second live-expiry fixture transitioned from OBSERVED LIVE to LIVE STATUS UNKNOWN without a manual refresh; live styling was removed.
- Card flip toggled aria-pressed and rotateY(180deg), then returned to the front. Pointer drag produced rotateY(16deg)/rotateX(-5.71429deg), confirming tilt.
- All five desktop navigation links changed to their expected section anchors. All five mobile menu links closed the menu after navigation. Mobile menu toggle, card flip, filters and Refresh passed.
- All three milestone images loaded; historical captions remain. External destinations were compared to the original, not exhaustively visited. No subscription/social action was submitted.
- Browser console error inspection returned no application errors in the inspected normal/proposed flows. Fixture thumbnails intentionally use synthetic IDs and may display YouTube placeholder artwork.

## Original comparison

Original page served from Git HEAD with mocked cached data and a fake key. Migrated page used equivalent fixture data. At desktop, original and migrated measurements matched exactly: hero 1220x748.28125, card scene 500x423.71875, scoreboard 1220x166.609375, video grid 1220x673.9375, milestones 1220x353.796875 (CSS pixels).

At 375px viewport, both versions matched: document scroll width 360px, hero height 1004.3125px, card width 328px, single video column 328px. At 768px, both original and migrated versions reported scroll width 779px; this pre-existing decorative-layout overflow measurement was not changed. Tablet uses two video columns and the menu toggle. Desktop/mobile screenshots were inspected and saved as chat output artifacts.

## Deployment readiness and remaining limitations

The local website migration is tested and ready for review/staged deployment. For full feature parity, deploy and verify the improved Hub first under separate approval. Production currently serves only six uploads: category buttons work, but cannot discover older category matches absent from that feed. The site explicitly states this limitation. The proposed Hub fixture verifies the expanded catalog path, not a real deployed expanded endpoint.

Before a later approved deployment: run these tests; publish the improved Hub with Thedocrot scanPages=3; verify its catalog, timestamps and existing endpoints; then publish the website files using the existing Pages setup. Confirm .mjs is served as JavaScript and run the live browser smoke test. The local preview served .mjs as JavaScript successfully; final deployed headers are not yet verified.

Not tested: physical touch hardware, Safari/Firefox, the real YouTube API updater with a secret, new Hub deployment, account-level Pages settings, or external video playback/social services. Real-time live status cannot be guaranteed by a scheduled feed; the site presents time-stamped observations. No other creator migration should begin without the user's next approval.
