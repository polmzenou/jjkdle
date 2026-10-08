# Sitemap — jjkdle-arcade.vercel.app

**Score: 85/100** (folded into Technical)

## What works
- `/sitemap.xml` generated from the game registry (`app/sitemap.ts`), referenced in robots.txt, 67 URLs, all 200, all self-canonical, no noindex URLs, no redirects.
- Excludes lobbies, accounts, admin, auth. Honest `lastmod` only on the daily game (comment in code explicitly avoids fake `now`). Good practice.
- Quality gate: 6 universes × 11 URLs — templated, but below the 30-page location-style warning threshold per template; each universe has a distinct roster.

## Findings
- **LOW** — `changefreq`/`priority` are ignored by Google; harmless, can be dropped to shrink the file.
- **LOW** — No `lastmod` on hubs/game lists. Add a real `lastmod` when a universe's roster or game list changes (e.g. max(updatedAt) of characters in the DB) — that is the one signal Google does use.
- **INFO** — If game slugs are renamed (`jjkdle` → `dle`) the sitemap auto-follows the registry; keep old URLs out of it and 308 them.
