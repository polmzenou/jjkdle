# Sitemap - jjkdle-arcade.vercel.app

**Score: 84/100** (baseline this morning: 85; -1 because a new indexable-but-unlisted page with a broken canonical was found)
Audit date: 2026-10-08. Generator: `app/sitemap.ts` (Next.js MetadataRoute, auto-follows the GAMES registry and universe list).

## Validation report

| Check | Result |
|---|---|
| Discovery (`sitemap_discovery.py`) | PASS - only `/sitemap.xml` found (declared in robots.txt, 200, valid urlset). No index file; not needed. |
| XML validity / namespace | PASS - well-formed, `sitemaps.org/0.9` urlset, `application/xml`, 9 KB, TTFB ~0.2 s |
| Size limits | PASS - 67 URLs / 9 KB (limits 50,000 / 50 MB) |
| Duplicate `<loc>` | PASS - 0 duplicates |
| Status codes (all 67 fetched, redirects followed) | PASS - 67x 200, 0 redirects, 0 non-200 |
| Canonical agreement | PASS - 67/67 self-canonical, absolute URLs, same host, no trailing-slash drift |
| Noindex conflicts | PASS - 67/67 `index, follow`, no `X-Robots-Tag` header on any URL |
| robots.txt interplay | PASS - no listed URL blocked; `Sitemap:` line present; `/api/`, `/admin` disallowed and absent from the sitemap |
| Deprecated tags | INFO - 67 `<changefreq>` + 67 `<priority>` (134 tags), ignored by Google |
| `lastmod` honesty | PASS with note - see below |
| Coverage vs crawl | PASS with 1 gap - see below |
| llms.txt consistency | PASS - `/llms.txt` returns 200 (`text/markdown`) and lists 66 of the 67 sitemap URLs; the only one missing is the hub root. 0 llms.txt URLs missing from the sitemap. |

## Findings

### MEDIUM - `/{universe}/games/multiplayer` is indexable, unlisted, and its canonical points to a redirecting URL
- All six `/{u}/games/multiplayer` pages return 200 with `index, follow`, but `alternates.canonical = "/games/multiplayer"` (see `app/[universe]/games/multiplayer/page.tsx` line 11). That URL 308s/redirects to `/jjk/games/multiplayer`.
- Result: 6 pages whose canonical is a redirect that lands on one of them. Google will treat the signal as unreliable. Not in the sitemap (so no sitemap/canonical conflict), but the page is discoverable via internal links.
- Fix: either (a) make it a per-universe self-canonical and add it to the sitemap if you want it indexed (registry marks builder multiplayer "live"), or (b) set `robots: { index: false }` since it is a lobby-entry form with no unique content. (b) is the better fit, matching `/account`, `/casino`.

### LOW - Templated universe pages: SSR text is highly shared (quality gate)
- 6 universes x 11 URLs = 66 templated pages (+ hub). Not location pages and well under the 30-page doorway threshold per template (each template is 6 instances, each game type is a real, functional game with a distinct roster). **No hard stop, no warning triggered.**
- Measured on server-rendered visible text (jjk vs csm): `/games/guesswho` 90% of text nodes identical, `/codenames` 85%, `/battle` 85%, `/tower` 87%, `/jjkdle` 83%, `/higher-lower` 80%, `/games` 68%, `/ranking` 65%, `/builder` 66%, `/jujutsu-draft` 65%. Titles are distinct per universe (brand suffix) but `Qui est-ce ?` has the same H1 and description in all 6 universes and the H1 does not name the anime.
- Risk is soft duplicate clustering (Google may pick one universe as canonical-ish and fold the rest), not a penalty. Mitigation: add 1-2 universe-specific sentences (roster size, sample characters, lore hook) to guesswho/codenames/battle intro blocks and put the anime name in the H1.

### LOW - Hub-level `lastmod` missing (61 of 67 URLs have none)
- Only the 6 `jjkdle` daily pages carry `lastmod` (`2026-10-08`, valid W3C date, Paris time). Hub, 6 landings, 6 catalogues and 48 other game pages have none. Honest, but wastes the one signal Google uses. Add real dates (max `updatedAt` of the universe's characters / last deploy touching that game) when available.
- Note: the daily `lastmod` reflects a changed answer, not changed page HTML. Google may discount it over time if rendered content does not change. Keep, but do not extend this pattern to other pages.

### INFO - `changefreq`/`priority` are dead weight
- 134 tags, ignored by Google. Drop them from `app/sitemap.ts` (omit the two fields); file shrinks ~55%.

### INFO - Hub root missing from `/llms.txt`
- Sitemap lists `https://jjkdle-arcade.vercel.app` (hub); `llms.txt` has the hub as its title/intro but no link entry. Cosmetic.

### INFO - Other indexable pages not in the sitemap (intentional or fine)
- `/universes` : 200, indexable, canonical -> `/` (correct consolidation).
- `/casino` : `noindex, follow`; `/casino/*`, `/{u}/shop`, `/{u}/account*`: redirect to `/login` (noindex, nofollow). Correctly excluded.
- `/{u}/u/{username}`, `/{u}/foo`: 404 with `noindex`. Correct.
- `/googlec1ea46e90143ea1c.html`: Search Console verification file, correctly absent.
- All 9 live registry games x 6 universes + 6 landings + 6 catalogues + hub = 67: matches registry exactly. No coming-soon leakage.

## What works
- Single source of truth (registry + universe list); new games/universes appear automatically, `coming-soon` games excluded.
- Zero status/canonical/noindex conflicts across all 67 URLs.
- No fake `lastmod = now` on every URL.

## Score breakdown
100 - 4 (multiplayer canonical/indexability gap) - 4 (templated near-duplicate SSR text) - 4 (no lastmod on 61 URLs) - 3 (deprecated tags) - 1 (daily lastmod caveat) = **84**
