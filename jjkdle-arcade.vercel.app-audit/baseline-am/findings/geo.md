# GEO / AI Search Readiness: jjkdle-arcade.vercel.app

Audit date: 2026-10-08. Sources: live fetches (render_page.py `--mode never`, curl with bot user agents), the crawl in `../pages.json` (68 URLs), and the repo source.

## GEO Readiness Score: 41 / 100

| Dimension | Weight | Score | Weighted | Key driver |
|---|---|---|---|---|
| Citability | 25% | 28 | 7.0 | Game pages have 38-117 words of SSR text, no answer blocks, and 24 pages have wrong (JJK) descriptions |
| Structural Readability | 20% | 40 | 8.0 | About 30 game pages have no H1, there are no question headings or FAQ, and /games lists are well structured |
| Multi-Modal Content | 15% | 45 | 6.75 | Per-game OG screenshots, logos and alt text are present. There's no gameplay video or YouTube presence |
| Authority & Brand Signals | 20% | 20 | 4.0 | 7 disconnected Organization entities, 3 names, no sameAs, no creator, vercel.app subdomain |
| Technical Accessibility | 20% | 75 | 15.0 | Full SSR and every bot gets HTTP 200. Against that, llms.txt is broken, responses are uncached and sitemap lastmod is always today |
| **Total** | | | **40.75 → 41** | |

### Platform-specific estimates
| Platform | Score | Notes |
|---|---|---|
| Google AI Overviews | 35 | Needs Googlebot ranking first. Thin game pages and wrong descriptions hurt. VideoGame schema helps |
| ChatGPT Search | 30 | Depends on the Bing index and OAI-SearchBot (allowed). There's no third-party/Reddit corroboration of the brand |
| Perplexity | 35 | PerplexityBot is allowed. It favours fresh, direct-answer content (a daily "yesterday's answer" would fit) |
| Bing Copilot | 30 | Same Bing dependency. No Bing Webmaster/IndexNow signal was observed |

## 1. AI crawler access

robots.txt (`app/robots.ts`): `User-Agent: *` / `Allow: /` / Disallow `/api/`, `/*/api/`, `/admin`, `/login`, `/register`. It has no bot-specific groups, so every crawler inherits allow-all. `Host:` is a non-standard (Yandex) directive and harmless.

Live check: `/jjk/games/jjkdle` was requested with each UA. All returned 200 with full SSR text, and there was no Vercel challenge from this IP.

| Crawler | What it governs | robots.txt | Live fetch |
|---|---|---|---|
| OAI-SearchBot | ChatGPT Search citations | Allowed | 200 |
| ChatGPT-User | User-triggered ChatGPT fetches | Allowed | 200 |
| GPTBot | OpenAI **training** only (not ChatGPT Search) | Allowed | 200 |
| Claude-SearchBot | Claude search citations | Allowed | 200 |
| Claude-User | User-triggered Claude fetches | Allowed | 200 |
| ClaudeBot | Anthropic **training** only | Allowed | 200 |
| PerplexityBot | Perplexity search index | Allowed | 200 |
| Perplexity-User | User-triggered fetches | Allowed | 200 |
| Googlebot | Google Search **and** AI Overviews / AI Mode inclusion | Allowed | 200 |
| Google-Extended | Gemini/Vertex training and grounding, plus training of Search gen-AI models. Does NOT affect AIO inclusion | Allowed | 200 |
| bingbot | Bing index, which feeds Copilot and ChatGPT Search | Allowed | 200 |
| Applebot / Applebot-Extended | Siri/Spotlight discoverability / Apple Intelligence training only | Allowed | 200 |
| CCBot, cohere-ai, meta-externalagent | Training | Allowed | 200 |

Verdict: access is fully open, which is the right setting for a fan site that wants visibility. Blocking the training-only bots (GPTBot, ClaudeBot, CCBot, Google-Extended, Applebot-Extended, cohere-ai) is optional. It would not reduce search citations, but there's no reason to do so here.

## 2. llms.txt and RSL

- `/llms.txt` returns **307 → `/jjk/llms.txt` → 404 (HTML)**. The status is broken: a redirect to a 404 is worse than a clean 404.
- Root cause: `/llms.txt` is not in `UNIVERSE_FREE_PREFIXES` (`lib/universes/routing.ts:23-40`), so the middleware catch-all (`middleware.ts:154-167`) prefixes it with the last-visited universe. The same happens for `/.well-known/*`, `/manifest.json` and `/license.xml`.
- RSL 1.0: none (`/.well-known/rsl.xml` also redirects to 404). It isn't needed for a visibility-seeking fan site.
- Fix (low effort): add `"/llms.txt"` and `"/.well-known"` to `UNIVERSE_FREE_PREFIXES`, then add `app/llms.txt/route.ts` that returns `text/plain`. Content should be the platform definition, the 6 universes, the 9 game types with one-line descriptions and canonical URLs, and the fan-project disclaimer. Impact is modest because no major AI search engine has confirmed it reads llms.txt, but it's cheap.

## 3. Citability (passage level)

### Critical bug: Jujutsu Kaisen descriptions leak into the other 5 universes (24 pages)
`gameMetadata(id, seoDescription)` (`lib/seo/config.ts:150-164`) lets a hardcoded JJK string override the per-universe `game.description`. Four pages pass one:
- `app/[universe]/games/jjkdle/page.tsx:22-25`: "JJKdle : le jeu du jour Jujutsu Kaisen..." is served as meta, og and twitter description on **CSMdle, AOTdle, KNYdle, TGdle and Bleachdle**.
- `battle`, `guesswho` and `codenames` page.tsx do the same ("JJK Random Battle : ... sur Jujutsu Kaisen", "Qui est-ce ? version Jujutsu Kaisen", "JJK Codenames : ...").
- The JSON-LD on those pages is correct (e.g. CSMdle VideoGame `isBasedOn: "Chainsaw Man"`), so the meta tags contradict the structured data on the same page.
- Effect: for "Chainsaw Man dle", the page's snippet and description say Jujutsu Kaisen. LLMs and AIO snippet generators see conflicting entities and are unlikely to cite it.
- Also duplicated: `ranking` (6x identical, no anime named), `higher-lower` (4x identical), `jujutsu-draft` (TG and Bleach identical).

### Thin SSR text on game pages
| Page type | SSR words | What an AI crawler sees |
|---|---|---|
| dle (`/*/games/jjkdle`) | 55 | "Devine le personnage mystère du jour." + empty leaderboard + footer |
| ranking (Pyramid) | 38-63 | "Chargement…" + leaderboard |
| guesswho / codenames / battle | 71-84 | One sentence of rules + "Connecte-toi" |
| higher-lower / tower / builder / draft | 65-117 | Short intro + leaderboard |
| Universe landing (`/jjk`, etc.) | ~525 | Good: 9 game cards with concrete numbers (25-character grid, 4 attempts, 10 000 points, score out of 1000) |
| `/*/games` lists | ~455 | Good: same cards + ItemList |
| Hub `/` | 85 | Only a universe picker, with no definition of what Anime Arcade is |

No game page has a 130-170-word self-contained answer block. None has an answer in its first 40-60 words that explains what the game is, how it works, when it resets or how many characters it covers.

### Query coverage (terms present in SSR title/desc/text across 68 pages)
| Target query | Coverage | Problem |
|---|---|---|
| "jeu anime wordle" | "wordle" on **0 pages**, "dle" unexplained | Nothing tells an LLM this is a Wordle/Loldle-style game |
| "JJKdle" | Title + H2 on `/jjk/games/jjkdle`, but only 55 words, no H1, no explanation | The most competitive query, with the weakest page |
| "Chainsaw Man dle" | CSMdle URL is `/csm/games/jjkdle` and its meta description is JJK | "Chainsaw Man" appears in text on only 3 pages (`/`, `/csm`, `/csm/games`) |
| "quiz Jujutsu Kaisen" | "quiz" appears only inside descriptions on 8 pages, and no game is named or framed as a quiz | The claim isn't backed by any page, so an AI won't match it |
| Character names (Gojo, Itadori, Denji…) | **0 pages** | The roster lives in client JS only, so there are no entity anchors |

## 4. Structural readability

- **No `<h1>`** on dle, ranking, builder, jujutsu-draft, higher-lower and tower pages in all 6 universes (about 36 pages). The single H2 is a decorative label. Battle, guesswho and codenames have an H1.
- No question-based H2/H3 anywhere and no FAQ blocks ("Comment jouer ?", "Quand change le personnage du jour ?").
- `/*/games` pages are well structured (10 H2s, BreadcrumbList + ItemList).
- Hub H1 reads "Choisis tonunivers" (missing space from a line break or span).

## 5. Entity clarity and brand signals

### Naming is inconsistent: three or more names for one entity
| Surface | Name used |
|---|---|
| Domain | `jjkdle-arcade` (vercel.app subdomain) |
| Hub `/` title, WebSite, Organization | "Anime Arcade" |
| Universe pages / Organization | "JJK Arcade", "CSM Arcade", "AOT Arcade", "KNY Arcade", "TG Arcade", "Bleach Arcade" |
| `/manifest.webmanifest` (root, `start_url: "/"`) | **"JJK Arcade — Mini-jeux Jujutsu Kaisen"** for crawlers without a cookie. `app/manifest.ts` resolves the universe from the last-visited cookie, so the hub's PWA identity changes per visitor |
| `/login` title | "Connexion · JJK Arcade" |
| Game URL slugs | `/csm/games/jjkdle`, `/aot/games/jujutsu-draft`… (JJK slugs in every universe) |

### Schema entity graph is fragmented
- 7 separate `Organization` nodes (`/#organization`, `/jjk/#organization`, …) with **no `parentOrganization`/`subOrganization`, no `sameAs`, no `founder`/`creator`**. Nothing tells a knowledge graph that "CSM Arcade" belongs to "Anime Arcade".
- Game `VideoGame.author` is an inline `Organization` with only a name and no `@id`, so it doesn't link to either org node.
- `/jjk` (and the other landings) emits the WebSite+Organization JSON-LD **twice** (2 `<script type="application/ld+json">` tags confirmed by curl). `SiteJsonLd` is rendered in `app/[universe]/page.tsx:39`. Check whether a second render path also injects it.
- There's no About page, no named creator, and no social profiles (Discord, X, TikTok, YouTube, GitHub) to point `sameAs` at.

### Brand mention analysis
| Platform | Status | Note |
|---|---|---|
| Wikipedia / Wikidata | Absent (expected) | A fan project won't qualify. Not a realistic target |
| Reddit | Not verified (live search was blocked from this environment). Likely none | Highest-leverage channel: r/JuJutsuKaisen, r/ChainsawMan, r/manga, r/animefr. Mentions there correlate strongly with ChatGPT and Perplexity citations |
| YouTube | None found | Strongest correlation with AI citations (~0.74). Short gameplay clips or TikTok/Shorts of JJKdle would build it |
| LinkedIn | Not relevant for this audience | |
| Domain | `*.vercel.app` subdomain | Weak as a standalone entity. A custom domain (e.g. animearcade.fr) would consolidate brand signals; plan it with 301s |

No DataForSEO MCP tools were available, so live ChatGPT visibility and LLM mention tracking were not measured.

## 6. Technical accessibility

- SSR: yes. `is_spa: false` on all fetched pages, and full text is in the initial HTML. Good.
- All AI and search UAs get 200 with identical content. Good.
- Canonicals and og:url are correct and universe-prefixed. Good.
- `Cache-Control: private, no-cache, no-store` + `X-Vercel-Cache: MISS` on game pages (`force-dynamic`). Every crawler hit runs the server render, which can slow fetches for time-budgeted AI fetchers. Consider ISR or a static shell for crawlable content, with the daily state loaded client-side.
- Sitemap: all `<lastmod>` values equal today (2026-10-08). A dynamic lastmod is a noisy freshness signal that Google learns to ignore. Use the real content change date.
- `publication_date` detected as 2026-01-01 (from "© 2026"). There's no `dateModified` in the VideoGame schema.
- llms.txt and `/.well-known/*` redirect into a universe and 404 (see section 2).

## 7. Top 5 highest-impact changes

| # | Change | Impact | Effort |
|---|---|---|---|
| 1 | **Fix the JJK description leak.** Drop the hardcoded `seoDescription` in `jjkdle`, `battle`, `guesswho`, `codenames` page.tsx (or make it per-universe via `universeGame(id).description`). Also make `ranking`, `higher-lower` and `jujutsu-draft` descriptions name the anime. | High: 24 pages currently describe the wrong anime | 30 min |
| 2 | **Add an SSR "how to play" answer block plus a 3-4 question FAQ to every game page** (130-170 words, with an H1 such as "CSMdle — le Wordle de Chainsaw Man"). Lead with the definition in the first 50 words. Name the attributes (the schema columns are already loaded server-side), roster size (`eligibleCount`), the daily reset time, "gratuit, sans compte", and "inspiré de Wordle/Loldle". Use question H2s: "Comment jouer à CSMdle ?", "Quand change le personnage du jour ?". Optionally add FAQPage JSON-LD. Templated per universe from existing config. | High: turns 55-word pages into citable answers for "X dle" and "jeu anime wordle" | 3-5 h |
| 3 | **Unify the entity graph.** Make "Anime Arcade" the parent brand everywhere: a root manifest that always says Anime Arcade, `parentOrganization: {"@id": "/#organization"}` on each universe org, `VideoGame.author`/`publisher` → `@id` reference, dedupe the double JSON-LD on landings, and `sameAs` once social accounts exist. Fix the "Connexion · JJK Arcade" title. Optionally rename the slugs to `/csm/games/csmdle` (or `/dle`) with 301s. | Medium-High | 2-3 h (+1 h for slugs) |
| 4 | **Build off-site brand signals.** Post on Reddit (game subreddits, r/animefr) and short YouTube/TikTok gameplay clips of the daily dle, plus listings on "dle games" directory pages. Consider a custom domain. | High for ChatGPT and Perplexity, slow burn | Ongoing |
| 5 | **Fix llms.txt routing and add an SSR "Personnage d'hier" line on dle pages.** Add `/llms.txt` and `/.well-known` to `UNIVERSE_FREE_PREFIXES` and add a `route.ts`. The yesterday's-answer line is daily fresh, factual and citable, and matches common "jjkdle answer" queries without spoiling today. Also replace the always-today sitemap lastmod with real dates. | Medium | 1-2 h |

Also: back up the "quiz" claim by framing Higher/Lower and Pyramid as quizzes in their copy (or drop the word from descriptions), and fix the hub H1 spacing.

## Structured findings (audit-data.json, category "AI Search Readiness")

```json
{
  "category": "AI Search Readiness",
  "score": 41,
  "dimensions": {"citability": 28, "structural_readability": 40, "multimodal": 45, "authority_brand": 20, "technical_accessibility": 75},
  "platform_scores": {"google_aio": 35, "chatgpt": 30, "perplexity": 35, "bing_copilot": 30},
  "findings": [
    {"id": "geo-desc-leak", "severity": "critical", "title": "Jujutsu Kaisen meta/og descriptions served on 24 non-JJK game pages", "evidence": "app/[universe]/games/{jjkdle,battle,guesswho,codenames}/page.tsx pass hardcoded JJK seoDescription to gameMetadata(); e.g. /csm/games/jjkdle og:description = 'JJKdle : le jeu du jour Jujutsu Kaisen...' while JSON-LD says isBasedOn Chainsaw Man", "fix": "Use per-universe game.description", "effort": "low"},
    {"id": "geo-thin-game-pages", "severity": "high", "title": "Game pages have 38-117 SSR words and no self-contained answer block", "evidence": "pages.json word counts; /jjk/games/jjkdle = 55 words", "fix": "Add 130-170 word SSR how-to-play + FAQ with question H2s", "effort": "medium"},
    {"id": "geo-missing-h1", "severity": "high", "title": "No H1 on ~36 game pages (dle, ranking, builder, draft, higher-lower, tower)", "fix": "Add descriptive H1 per game and universe", "effort": "low"},
    {"id": "geo-entity-fragmented", "severity": "high", "title": "Brand split across Anime Arcade / XX Arcade / jjkdle-arcade; 7 unlinked Organization nodes; no sameAs", "evidence": "manifest.webmanifest name='JJK Arcade — Mini-jeux Jujutsu Kaisen' with start_url '/'; /login title 'Connexion · JJK Arcade'", "fix": "Anime Arcade parent org, parentOrganization links, @id-referenced authors, platform-level manifest", "effort": "medium"},
    {"id": "geo-jsonld-duplicate", "severity": "low", "title": "WebSite+Organization JSON-LD emitted twice on universe landings", "evidence": "2 ld+json script tags on /jjk", "effort": "low"},
    {"id": "geo-slug-confusion", "severity": "medium", "title": "JJK slugs reused in other universes (/csm/games/jjkdle, /aot/games/jujutsu-draft)", "fix": "Universe-specific or generic slugs with 301", "effort": "medium"},
    {"id": "geo-query-gaps", "severity": "medium", "title": "'wordle' on 0 pages; 'quiz' claimed but no quiz game; 0 character names in SSR text", "effort": "low"},
    {"id": "geo-llms-txt", "severity": "low", "title": "/llms.txt 307 -> /jjk/llms.txt 404", "evidence": "missing from UNIVERSE_FREE_PREFIXES in lib/universes/routing.ts", "fix": "Whitelist path and add app/llms.txt/route.ts", "effort": "low"},
    {"id": "geo-offsite-brand", "severity": "high", "title": "No detectable Reddit/YouTube/Wikipedia brand presence; vercel.app subdomain", "fix": "Reddit/YouTube/TikTok seeding, custom domain", "effort": "high"},
    {"id": "geo-freshness-signals", "severity": "low", "title": "Sitemap lastmod always today; game pages no-store/uncached; no dateModified", "effort": "low"},
    {"id": "geo-crawler-access", "severity": "pass", "title": "All AI search and training crawlers allowed and served 200 with full SSR content"}
  ]
}
```
