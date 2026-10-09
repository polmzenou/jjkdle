# On-Page SEO — jjkdle-arcade.vercel.app (re-audit)

Re-audited 2026-10-08 (afternoon) after commit `0c5de81`, 69 URLs re-crawled. Baseline: 52/100 (`baseline-am/findings/onpage.md`).

**Score: 78/100** (+26)

## Fixed since baseline
| Metric | Baseline | Now |
|---|---|---|
| Pages without `<h1>` | 36 | **0** |
| Non-JJK pages whose meta description mentions JJK / Jujutsu Kaisen | 20 | **0** |
| Non-JJK pages with JJK body copy ("The Culling Tower", "sorcier") | 10 | **0** |
| URLs sharing a duplicate meta description | 38 | **0** |
| Pages without `og:image` | 13 | **1** (`/casino`, now noindex) |
| Landing pages with duplicate WebSite JSON-LD | 6 | **0** |
| `/login` canonical → `/jjk` | yes | **self (`/login`)** |
| Hub H1 "tonunivers" / casino "Lecasino" | broken | fixed |

## Still open

### MEDIUM — Meta descriptions now longer (65/69 > 160 chars, median 216, max 256)
The anime-name prefix (`CSM Pyramid (Chainsaw Man) : …`) fixed relevance and uniqueness but pushed most snippets past the ~155–160 char display limit (was 50/69). Google truncates rather than penalises, but the tail ("4 tentatives, jusqu'à 10 000 points") is lost. Longest: `/bleach/games` 256, `/aot/games/tower` 247.
Fix: give each game a dedicated short `seoDescription` (≤ 155 chars) per universe, front-loading *game type + anime* — e.g. "CSM Pyramid : classe 8 personnages Chainsaw Man du plus fort au plus faible. 4 essais, jusqu'à 10 000 points." Shorten the `/{u}/games` template (it lists all 9 titles).
Falsifiable: `max(len(desc)) ≤ 160` on re-crawl.

### MEDIUM — JJK slugs on every universe (unchanged)
`/csm/games/jjkdle`, `/bleach/games/jujutsu-draft`. Rename with 308s, ideally bundled with a custom-domain move.

### LOW — "Qui est-ce ?" title/H1 identical on all 6 universes
Visible H1 is "Qui est-ce ?" everywhere; `<title>` differs only by suffix ("· CSM Arcade"). Make the game title per-universe ("Qui est-ce ? Chainsaw Man") in each `gameCopy.guesswho.title`.

### LOW — Titles don't signal French
No title mentions "en français"/"FR" — the differentiator vs. English-only competitors (see `sxo.md`). Consider on dle pages: "CSMdle — le jeu Chainsaw Man du jour en français".

## What works
Unique titles ≤ 60 chars on all 69 URLs · one H1 per page · self-canonicals · OG/Twitter on every indexable page · per-universe default OG image (`/og?u=<slug>`) · clean hub → universe → games → game linking.
