# On-Page SEO — jjkdle-arcade.vercel.app

**Score: 55/100**

## What works
- Unique `<title>` on all 69 URLs, all ≤ 60 chars, universe-branded (`CSMdle · CSM Arcade`).
- Self-canonical on every indexable page; OG + Twitter cards everywhere; per-game screenshots as og:image on most game pages.
- Universe hubs (/jjk, /csm…) have one clear H1 ("JJK Arcade — mini-jeux Jujutsu Kaisen gratuits") and ~520 words.
- Clean internal linking: hub → 6 universes → /games → 9 games; header/footer links on every page.

## Findings

### HIGH — Wrong-anime meta descriptions on 20 pages (JJK text on CSM/AOT/KNY/TG/Bleach; also in og/twitter descriptions)
Hard-coded JJK strings passed to `gameMetadata(id, seoDescription)` override the per-universe registry text:

| File | Description shown on all 6 universes |
|---|---|
| `app/[universe]/games/jjkdle/page.tsx:24` | "JJKdle : le jeu du jour Jujutsu Kaisen. Devine le personnage JJK mystère…" — shown on **CSMdle, AOTdle, KNYdle, TGdle, Bleachdle** |
| `app/[universe]/games/battle/page.tsx:21` | "JJK Random Battle : affronte un ami en 1v1 sur Jujutsu Kaisen…" |
| `app/[universe]/games/guesswho/page.tsx:20` | "Qui est-ce ? version Jujutsu Kaisen…" |
| `app/[universe]/games/codenames/page.tsx:21` | "JJK Codenames : jeu d'équipe…" |

Effect: the SERP snippet for "chainsaw man dle" says *Jujutsu Kaisen* → Google likely rewrites it, CTR drops, and the 6 pages look like templated duplicates. The `dle` page is the highest-intent page on the site.
Fix: build these from the universe config (`universe.sourceWork`, `universeGame(id).title`) — e.g. `` `${game.title} : le jeu du jour ${universe.sourceWork}. Devine le personnage mystère…` ``.

### MEDIUM — Identical descriptions across universes (template duplication)
- `ranking` description identical on all 6 universes (registry + each `lib/universes/*.ts`); `higher-lower` identical on 4; `jujutsu-draft` identical on TG/Bleach.
- Add the anime name + 1 distinctive detail (roster size, signature character) per universe.

### MEDIUM — 36 game pages have no H1
- builder, ranking, jujutsu-draft, jjkdle, higher-lower, tower × 6 universes render no `<h1>` in server HTML. battle/guesswho/codenames do.
- Add a server-rendered H1 per game page (can be visually compact or `sr-only`-free but small): e.g. "CSMdle — devine le personnage Chainsaw Man du jour".

### MEDIUM — Game URL slugs are JJK-specific on every universe
- `/csm/games/jjkdle` (titled CSMdle), `/bleach/games/jujutsu-draft` (Zanpakutō Draft). The URL is a (weak) relevance signal and is what users see in SERPs/shares.
- Fix (later, with 308 redirects): neutral slugs `/{u}/games/dle`, `/{u}/games/draft`, or per-universe aliases. Do this together with any domain migration to pay the redirect cost once.

### LOW — 50/69 meta descriptions > 160 chars
- Truncated in SERPs. Front-load the anime name + game type in the first 120 chars.

### LOW — Homepage H1 is mostly sr-only
- H1 = sr-only "Anime Arcade — mini-jeux anime gratuits —" + visible "Choisis ton univers". Acceptable, but visible-text H1 with the keyword is stronger; 85 words of body text total, no H2.

### LOW — 13 pages without og:image
- `/{u}/games` and `/{u}/games/tower` (×6) and `/casino` emit no `og:image` (the layout default is lost because page-level `openGraph` replaces it). Add `images` to those `openGraph` objects.
