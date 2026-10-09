# Technical SEO — jjkdle-arcade.vercel.app (re-audit)

Audited 2026-10-08 after commit 0c5de81 · 67/67 sitemap URLs fetched live + ~30 edge-case probes · source cross-checked (read-only).

**Technical score: 85/100** (baseline this morning: 72)

| Category | Status |
|---|---|
| Crawlability | PASS (robots clean, sitemap valid 67 URLs, llms.txt served) |
| Indexability | PASS (67/67 = 200, self-canonical, unique titles, 1 H1, description on all) |
| Security | PASS (HSTS preload, CSP, XFO DENY, nosniff, Referrer-Policy, Permissions-Policy); CSP rule34 wildcard open |
| URL structure | PASS with notes (308 slash/http normalisation; case variants and root files 307) |
| Mobile | PASS (viewport, lang=fr, responsive) |
| Core Web Vitals (source) | NEEDS WORK (no edge cache, iad1 origin, lazy-loaded header logo) |
| Structured data | PASS (Organization, WebSite, VideoGame/Offer present; see schema findings) |
| JS rendering | PASS (SSR, is_spa false, full content in raw HTML) |
| IndexNow | NOT IMPLEMENTED (no key file, no submission code) |

## Fixed since baseline (all verified live)
- Unknown slug soft-200: `/nothing.png` now 404 with `noindex`; `/jjk/nope` 404. (HIGH, fixed)
- `/favicon.ico` now 200 `image/x-icon`, 5 KB, ICO with 16/32(+) px entries; `<link rel=icon>` present; `/icon.png` 256x256, `/apple-icon` 180x180. (fixed)
- `/llms.txt` 200 `text/markdown` at root, lists all 6 universes and 9 games each, absolute URLs. (fixed)
- `/login`, `/register`: no longer robots-blocked; `noindex, nofollow` + self-canonical (`/login`, `/register`). Google can now read the noindex. (fixed)
- `/casino`: `noindex, follow`; still not in sitemap. (fixed)
- Manifest: name "Anime Arcade — Mini-jeux anime gratuits", short_name "Anime Arcade", hub description. (fixed)
- robots.txt: `Host:` removed; now `Allow: /`, `Disallow: /api/ /*/api/ /admin`, Sitemap line. (fixed)
- Sitemap helper validates `/sitemap.xml` (urlset, valid, HTTP 200).

## Crawl results
- 67/67 sitemap URLs 200; avg TTFB 0.32 s, max 0.63 s (client-side, MISS every time).
- 67/67 `robots: index, follow`; 67/67 canonical == own URL (no mismatches); 67/67 unique titles; 1 meta description and 1 H1 per page.
- http -> https 308; trailing slash 308 to slashless; `/jjk/account` and `/jjk/shop` 307 to `/login` when anonymous (acceptable; `/login` is noindex).

## Remaining issues (ranked)

### MEDIUM 1 — HTML never edge-cached, origin in iad1, cookie set on every response
- Every page: `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`, `X-Vercel-Cache: MISS`, `X-Vercel-Id: cdg1::iad1::…` (edge Paris, function US-East). `vercel.json` has no `regions`.
- New observation: every HTML response also carries `Set-Cookie: universe=<slug>; Max-Age=1y` (middleware), which on its own prevents shared caching even if Cache-Control were relaxed.
- Fix: `"regions": ["cdg1"]` (co-locate with DB); make landing/hub/`/games` static or ISR (`generateStaticParams` over the 6 slugs; universe is a path segment); set the cookie client-side or only on non-cacheable routes.
- Test: `curl -sI /jjk/games` shows `X-Vercel-Cache: HIT` and no Set-Cookie.

### MEDIUM 2 — Root discovery files and unknown root paths 307 into /jjk
- `/.well-known/ai-catalog.json`, `/.well-known/security.txt`, `/ads.txt`, `/security.txt`, `/humans.txt` -> 307 `/jjk/<path>` -> 404. `/xyz` -> `/jjk/xyz` 404. Only `llms.txt` was added to `UNIVERSE_FREE_PREFIXES` (`lib/universes/routing.ts`).
- Fix: add `/.well-known/` and any files you actually serve (security.txt, ai-catalog.json, IndexNow key) to `UNIVERSE_FREE_PREFIXES`; unknown junk paths ideally 404 directly rather than 307 then 404 (redirect hop on every bot probe).

### LOW 3 — Case variants return 200 (duplicate URLs, canonicalised)
- `/jjk/GAMES` 200, canonical lowercase `/jjk/games` (mitigated). `/JJK` 307 -> `/jjk/JJK` 404 (should normalise to `/jjk`). Add a lowercase 308 in middleware.

### LOW 4 — 404 page markup
- Not-found page emits two robots metas (`noindex` and `noindex, nofollow`) and a canonical to `/jjk`, JJK-branded title "Page introuvable · JJK Arcade" even for root-level 404s. Harmless for indexing (404 + noindex) but drop the canonical.

### LOW 5 — Brand inconsistency on universe-free pages
- `/login`, `/register`: titles "Connexion · JJK Arcade" / "Créer un compte · JJK Arcade"; `/casino` title just "Casino". Use "Anime Arcade" on shared pages.

### LOW 6 — Header logo lazy-loaded above the fold
- `<img alt="JJK Arcade" loading="lazy" … sizes="96px">` in the header; use `priority`/eager. Also logo is JJK-labelled on all universes (check per-universe branding).

### LOW 7 — Sitemap lastmod on only 6 of 67 URLs
- Others have only changefreq/priority (ignored by Google). Add real `lastmod` per URL (or drop uniformly); do not stamp all with the deploy date.

### LOW 8 — IndexNow not implemented
- No key file (`/<key>.txt` -> 307 -> 404), no code. Bing/Yandex/Naver would benefit for daily-changing pages. Add key file at root (in `UNIVERSE_FREE_PREFIXES`) and ping `https://api.indexnow.org/indexnow` on deploy.

### INFO — CSP allows `https://*.rule34.xxx` in img-src/media-src sitewide
- Confirmed in headers of every page, still open. Scope to `/admin` only (adult image host, SafeSearch risk if ever rendered).

### INFO — Custom domain
- Still on `*.vercel.app`; JJK-specific subdomain for a 6-anime brand. Move to a custom domain with 308s before link-building.

### INFO — Slug reuse
- `/csm/games/jjkdle` and `/csm/games/jujutsu-draft` (Chainsaw Man pages with JJK-named slugs, visible in llms.txt). Renaming needs 308s; low priority, but is a keyword mismatch.
