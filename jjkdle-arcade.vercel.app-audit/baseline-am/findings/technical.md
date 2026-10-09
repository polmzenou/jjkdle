# Technical SEO — jjkdle-arcade.vercel.app

Audited 2026-10-08 · 69 URLs fetched (67 sitemap + /casino + /login) · source code at repo root cross-checked.

**Score: 72/100**

## What works
- All 67 sitemap URLs return 200 with self-referencing canonicals (only exception `/login`, see below).
- HTTPS, HSTS preload (2y), HTTP→HTTPS 308, trailing-slash → 308 to slashless. Clean URL normalisation.
- Strong security headers: CSP, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy.
- Pages are server-rendered (Next.js App Router, RSC) — `is_spa: false`; titles/meta/canonicals/JSON-LD present in raw HTML.
- Preview deployments get `Disallow: /` (`isIndexableDeployment` in `lib/seo/config.ts`) — no duplicate-host leakage.
- Private routes (`/jjk/account`, `/jjk/shop`, lobbies `/…/[code]`, `/u/…`) carry `noindex` and are not robots-blocked, so Google can read the noindex. Correct pattern.
- Unknown paths under a universe (`/jjk/nope`) return a real 404.
- Google Search Console verified (meta tag + HTML file).

## Findings

### HIGH — Soft-200 for any root path ending in a static extension (incl. /favicon.ico)
- Evidence: `/favicon.ico` → `200 text/html` (91 KB JJK landing page); `/nothing.png` → `200 text/html`, `robots: index, follow`, canonical `/jjk`.
- Cause: `middleware.ts` matcher excludes `favicon.ico` and `*.png|jpg|…` so these requests skip universe resolution and fall into `app/[universe]/page.tsx` with `universe="favicon.ico"`; neither `app/[universe]/layout.tsx` nor `page.tsx` validates `params.universe`, so the JJK landing renders with 200. There is no `favicon.ico` in `app/` or `public/`.
- Impact: unlimited duplicate URLs of `/jjk` (mitigated by canonical), every browser/crawler `/favicon.ico` hit renders a full dynamic page (cost + log noise), Google's favicon fetcher gets HTML.
- Fix: in `app/[universe]/layout.tsx` (or page) read `params.universe` and `notFound()` when `!getUniverseBySlug(slug)`; add `app/favicon.ico` (48×48 multiple of 48 for Google).
- Falsifiability: `curl -I /favicon.ico` → `image/x-icon`; `curl -I /nothing.png` → 404.

### MEDIUM — Discovery files at root redirect into /jjk and 404
- `/llms.txt` → 307 `/jjk/llms.txt` → 404; `/.well-known/ai-catalog.json` same; any un-prefixed path 307s to the cookie/default universe.
- 307 (temporary) is used for the catch-all; for un-prefixed legacy links prefer 308 only when the target is deterministic. Here it depends on a cookie, so 307 is defensible — but root-level files that must live at `/` (llms.txt, .well-known/*, ads.txt, security.txt) need to be added to `UNIVERSE_FREE_PREFIXES` in `lib/universes/routing.ts` and served from `app/` or `public/`.

### MEDIUM — HTML is never cached at the edge
- All pages: `Cache-Control: private, no-cache, no-store` + `X-Vercel-Cache: MISS`; every game page is `dynamic = "force-dynamic"` (cookie state, leaderboards). Function region `iad1` (US-East) while audience is French (edge `cdg1`). Measured TTFB 0.34–0.42 s from this client; real FR users pay a transatlantic origin round trip on every navigation.
- Fix: move functions to `cdg1`/`fra1` (`vercel.json` `"regions": ["cdg1"]`, co-located with the DB); make landing/hub/`/games` pages static/ISR (they only need universe from the path, which is a real segment now — `generateStaticParams` over universes) and stream per-user bits client-side.

### MEDIUM — /casino is indexable thin content
- `/casino`: title "Casino", 54 words, `index, follow`, no description specific to it, linked from every page footer. Gambling-themed page on an anime fan site — low value for search, and a "casino" signal is unhelpful for a site whose audience includes minors.
- Fix: `robots: { index: false }` on `app/casino/layout.tsx` and remove from sitemap (it already is absent).

### LOW — /login canonical points to /jjk and is robots-blocked
- `/login` has `noindex, nofollow` **and** canonical `/jjk` and is `Disallow`ed in robots.txt → Google cannot see the noindex; conflicting canonical. Linked from every page header.
- Fix: drop `/login` and `/register` from robots `disallow` (keep noindex), remove canonical override.

### LOW — Manifest is JJK-branded on the multi-anime hub
- `/manifest.webmanifest` (universe-free path) resolves the universe from the cookie → first-time visitors/crawlers get "JJK Arcade — Mini-jeux Jujutsu Kaisen" for the whole Anime Arcade site. Use `hubSeo()` for the manifest name/description.

### LOW — robots.txt `Host:` directive
- Yandex-only, deprecated; harmless. Can be dropped.

### INFO — Domain
- Site lives on `*.vercel.app`. No custom domain = no brand-owned authority, shared public-suffix host, and the subdomain "jjkdle-arcade" is JJK-specific while the platform is "Anime Arcade" for 6 anime. A custom domain (e.g. `animearcade.fr`) with 308s from the vercel.app host is the single biggest long-term lever; do it **before** link-building.

### INFO — CSP allows `*.rule34.xxx`
- Site-wide `img-src`/`media-src` whitelist an adult image host (used only by `lib/admin/booru.ts`). No public page loads from it in this crawl. Scope the CSP to `/admin` only so no public page can ever render adult media (SafeSearch classification risk).
