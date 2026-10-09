# GEO / AI Search Readiness: jjkdle-arcade.vercel.app (re-audit, PM)

Audit date: 2026-10-08, afternoon. Baseline (morning): 41/100 in `../baseline-am/findings/geo.md`.
Sources: live curl requests sent with each crawler user agent, `render_page.py` (`extracted_text` from trafilatura), the fresh crawl in `../pages.json` (68 URLs), and the repo source.

## GEO Readiness Score: 49 / 100 (baseline 41, +8)

| Dimension | Weight | AM | PM | Weighted | Key driver |
|---|---|---|---|---|---|
| Citability | 25% | 28 | 34 | 8.5 | The wrong-anime descriptions are gone and llms.txt adds clean definitional passages. Game pages are still 44-124 crawl words, and trafilatura extracts only **19-21 words** on JJKdle, CSMdle and CSM Pyramid |
| Structural Readability | 20% | 40 | 52 | 10.4 | Every game page has an H1 and the hub H1 is fixed. There are no question headings, no FAQ and no how-to-play sections. The dle H1 is `sr-only`. The guesswho H1 reads "Qui est-ce ?" in all 6 universes |
| Multi-Modal Content | 15% | 45 | 48 | 7.2 | Tower pages now use per-universe OG images. Draft and Codenames share one screenshot (the JJK one) across all 6 universes. There's no video |
| Authority & Brand Signals | 20% | 20 | 28 | 5.6 | The manifest says "Anime Arcade", the login title is neutral and the JSON-LD duplicate is gone. Still 7 unlinked Organization nodes, no `sameAs`, no creator, and no detectable off-site presence |
| Technical Accessibility | 20% | 75 | 85 | 17.0 | llms.txt returns 200 as text/markdown, sitemap lastmod is only set on the daily dle pages, and every bot gets 200 with SSR. Pages are still `no-store`, and `/llms-full.txt` and `/.well-known/*` still 307 to a 404 |
| **Total** | | **41** | **49** | **48.7** | |

### Platform-specific estimates
| Platform | AM | PM | Notes |
|---|---|---|---|
| Google AI Overviews | 35 | 42 | Snippets now match the right anime and VideoGame schema matches the meta. AIO still needs ranking first, and the thin game pages cap it |
| ChatGPT Search | 30 | 35 | OAI-SearchBot is allowed. ChatGPT Search relies on Bing plus third-party corroboration, and there's no Reddit/YouTube footprint |
| Perplexity | 35 | 42 | PerplexityBot is allowed. llms.txt and the landing/list pages give it quotable one-liners. It still has no answer for "what is CSMdle / how to play" |
| Bing Copilot | 30 | 35 | Same Bing dependency. No IndexNow or Bing Webmaster signal |

## 1. AI crawler access (re-checked live)

robots.txt: `User-Agent: *` / `Allow: /` / Disallow `/api/`, `/*/api/`, `/admin`, plus the Sitemap line. `/login` and `/register` are no longer disallowed, which is fine because they carry noindex/thin content. There are no bot-specific groups.

Live fetch of `/csm/games/jjkdle` and `/llms.txt` with each UA. Every request returned **200** with an identical SSR body (about 60 KB) and no challenge.

| Crawler | Governs | robots.txt | Live |
|---|---|---|---|
| OAI-SearchBot | ChatGPT Search citations | Allowed | 200 |
| ChatGPT-User | User-triggered ChatGPT fetches | Allowed | 200 |
| GPTBot | OpenAI **training** only (not ChatGPT Search) | Allowed | 200 |
| Claude-SearchBot | Claude search citations | Allowed | 200 |
| Claude-User | User-triggered Claude fetches | Allowed | 200 |
| ClaudeBot | Anthropic **training** only | Allowed | 200 |
| PerplexityBot | Perplexity index | Allowed | 200 |
| Googlebot | Google Search **and** AI Overviews/AI Mode | Allowed | 200 |
| Google-Extended | Gemini/Vertex training and grounding, plus Search gen-AI model training. **Not** AIO inclusion | Allowed | 200 |
| bingbot | Bing index (feeds Copilot and ChatGPT Search) | Allowed | 200 |
| CCBot, Applebot-Extended | Training only | Allowed | 200 |

Verdict: PASS. Everything is open, which is the right setting for a fan site that wants visibility.

## 2. llms.txt and RSL

**Status: present and well formed (fixed).** `/llms.txt` returns 200, `Content-Type: text/markdown; charset=utf-8`, about 17 KB, Vercel-cached.

What's good:
- It follows the llmstxt.org shape: an `# Anime Arcade` H1, a `>` blockquote summary, a context paragraph (unofficial fan project, French, dle reset "à minuit (heure de Paris)"), then one `##` section per universe. Each entry is a `[name](absolute URL): description` link with concrete numbers (8 characters, 4 attempts, 10 000 points, a grid of 25/36, 20 floors).
- All 6 universes × (landing + games list + 9 games) = 66 links, all canonical, all returning 200.

What to improve (low effort):
1. The hub root `https://jjkdle-arcade.vercel.app/` itself isn't linked anywhere in the file.
2. The flagship dle game is listed 8th of 11 in each section. Put `XXdle` first, because it's the main query target.
3. Six links share the identical label "Qui est-ce ?". Use "Qui est-ce ? Chainsaw Man" and so on, so each passage is self-contained when extracted.
4. "Wordle" appears nowhere. Add "(dans l'esprit de Wordle / Loldle)" to the summary and the dle lines. This is the bridge for "jeu anime wordle".
5. "quiz" is claimed in the summary and in every universe description, but no game is labelled a quiz. Either frame Higher/Lower and Pyramid as quizzes or drop the word.
6. An optional `## Optional` section could hold the casino, login and contact pages.
- `/llms-full.txt` and `/.well-known/llms.txt` still **307 → `/jjk/…` → 404**. That's harmless but untidy. Add `/llms-full.txt` and `/.well-known` to `UNIVERSE_FREE_PREFIXES` (or return a clean 404).
- RSL 1.0: none (`/.well-known/rsl.xml` and `/license.xml` 307 → 404). It isn't needed for a visibility-seeking fan site.

Impact note: no major AI search engine has confirmed that it consumes llms.txt, so treat this as hygiene rather than a ranking lever.

## 3. Citability (passage level)

### Fixed since AM
- **The JJK description leak is resolved.** CSMdle, AOTdle, KNYdle, TGdle and Bleachdle now carry their own anime in meta, og and twitter descriptions, all matching the VideoGame `isBasedOn`. Battle, guesswho and codenames are universe-specific in all 6 universes. Ranking, higher-lower and draft descriptions now name the anime ("CSM Pyramid (Chainsaw Man) : …").

### Still open: game pages are not citable
| Page type | Crawl words | trafilatura `extracted_text` | What an AI system can quote |
|---|---|---|---|
| dle (`/*/games/jjkdle`) | 59-61 | **19 words**: "Devine le personnage mystère du jour. Personne n'a encore trouvé le perso du jour — sois le premier !" | Nothing that defines the game |
| Pyramid (`ranking`) | 44-69 | 21 words: H1 + "Chargement…" + leaderboard rows | Nothing |
| guesswho / codenames / battle | 71-84 | 1 rules sentence + login CTA | One sentence |
| higher-lower / tower / builder / draft | 74-124 | Short intro + leaderboard. Tower has a useful line ("La tour d'aujourd'hui, la même pour tout le monde… Remise à zéro à minuit") | 1-2 sentences |
| Universe landing | 522-529 (330 extracted) | 9 game cards with concrete numbers | Good |
| `/*/games` | 449-459 | Same cards + ItemList | Good |
| Hub `/` | 85 | Picker + "Un seul compte / XP partagé" | Weak: no definition of Anime Arcade in body text |

No game page has a self-contained passage (about 130-170 words as a heuristic) that answers "What is CSMdle? How do you play? When does it reset? How many characters? Is it free?" The answers exist in llms.txt and in meta descriptions, but not in on-page body text, which is what AIO/Perplexity passage retrieval quotes.

### Query coverage (68 crawled pages: title + desc + SSR text)
| Target query | Coverage | Gap |
|---|---|---|
| "jeu anime wordle" | "wordle" on **0 pages** (only in the ignored `keywords` meta, `lib/seo/config.ts:131`, `lib/universes/jjk.ts:29`) | No passage tells an LLM this is a Wordle-style game |
| "CSMdle" | Title, H1 (sr-only), meta and llms.txt are correct now. Body has 19 extractable words. Slug is `/csm/games/jjkdle` | Entity is named correctly, but there's no body content to cite and the URL contradicts it |
| "quiz Jujutsu Kaisen" | "quiz" on 7 pages, all in description/summary boilerplate. No game is titled or framed as a quiz | Unbacked claim. An AI won't map any page to the "quiz" intent |
| "JJKdle" | Same as CSMdle. Strongest brand query, weakest page | |
| Character names (Gojo, Itadori, Denji, Eren, Tanjiro, Kaneki, Ichigo) | **0 pages** | No entity anchors linking the site to the anime knowledge graph |
| "minuit" (reset time) | 6 pages (tower leaderboards) | Not on the dle pages, where the question is actually asked |

## 4. Structural readability

- H1 on every game page: FIXED. The dle H1 is `<h1 class="flex"><span class="sr-only">CSMdle — jeu Chainsaw Man gratuit</span><a><img alt="CSM Arcade"></a></h1>`. That's acceptable to crawlers, but a visible H1 with a one-line definition below it would also help users and passage extraction.
- Guesswho H1 is "Qui est-ce ?" in all 6 universes, and so is the VideoGame `name`. That makes 6 entities with identical names. Battle and Codenames H1s use the acronym only ("CSM Random Battle"). Append the anime name: "Qui est-ce ? Chainsaw Man".
- Hub H1 is fixed ("Anime Arcade — mini-jeux anime gratuits · Choisis ton univers").
- There are no question-based H2/H3 anywhere, no FAQ and no FAQPage schema. Game pages have 0-1 H2s, and the H2 is usually a leaderboard label.
- `/*/games` H1s are thematic ("Les jeux des démons", "Les jeux maudits") and don't name the anime. Use something like "Tous les jeux Chainsaw Man — Les jeux des démons".

## 5. Entity clarity and brand signals

### Improved
- `/manifest.webmanifest`: "Anime Arcade — Mini-jeux anime gratuits", `start_url: "/"`, and it no longer depends on the cookie. FIXED.
- `/login` title is now "Connexion" (not "· JJK Arcade"). FIXED.
- Universe landings emit exactly one `ld+json` script (the AM duplicate is gone). FIXED.
- Hub canonical is present (`https://jjkdle-arcade.vercel.app`, without a trailing slash, which is consistent with og:url).

### Still open
- **7 Organization nodes** (`/#organization`, `/jjk/#organization`, … `/bleach/#organization`) with no `parentOrganization`/`subOrganization`, no `sameAs`, and no `founder`. No `sameAs`/`parentOrganization` string exists anywhere in `app/`, `lib/` or `components/`.
- `VideoGame.author` is still an inline `{"@type":"Organization","name":"CSM Arcade"}` with no `@id`, so it doesn't link to either org node. There's no `publisher`.
- `VideoGame.isBasedOn` is a plain string ("Chainsaw Man"). Make it a `CreativeWork`/`TVSeries` with `sameAs` pointing at the Wikipedia/Wikidata entry for the anime. This is the cheapest entity anchor available: it ties each page to a well-known Knowledge Graph entity.
- Three name layers remain: domain `jjkdle-arcade`, platform "Anime Arcade", and per-universe "CSM Arcade". Slugs `/csm/games/jjkdle`, `/aot/games/jujutsu-draft` and so on still carry JJK naming into the other universes.
- Brand-hygiene note: the site-wide CSP header lists `img-src/media-src https://*.rule34.xxx` on **every** public response (robots.txt, llms.txt, all pages). It exists for the admin-only booru importer (`lib/admin/booru.ts`). It's invisible to users, but crawlers and security scanners do log headers, and it's an adult-site domain on a fan site with a young audience. Scope that CSP directive to `/admin` only.

### Brand mention analysis
| Platform | Status | Note |
|---|---|---|
| Wikipedia / Wikidata | Absent (expected) | Not a realistic target for a fan project. Borrow authority instead via `isBasedOn.sameAs` → the anime's Wikipedia page |
| Reddit | Not verifiable from this environment (reddit.com returned 403; DuckDuckGo served a bot challenge). No evidence of mentions | Highest leverage for ChatGPT and Perplexity: r/JuJutsuKaisen, r/ChainsawMan, r/attackontitan, r/KimetsuNoYaiba, r/animefr, plus "daily dle" megathreads |
| YouTube | Not measurable (`youtube_search.py` has no API key). None found in AM | Strongest correlation with AI citations (~0.74). Daily "CSMdle du jour" Shorts or TikToks are cheap to make |
| LinkedIn | Not relevant | |
| Domain | `*.vercel.app` subdomain | Weak as a standalone entity. A custom domain plus 301s would consolidate signals |

No DataForSEO MCP tools were available, so live ChatGPT visibility and LLM mention tracking were not measured.

## 6. Technical accessibility

- SSR: `is_spa: false`. All text is in the initial HTML. PASS.
- All AI and search UAs: 200, identical content. PASS.
- Canonicals, og:url, per-universe OG images: correct. PASS.
- `/llms.txt`: 200, text/markdown, edge-cached. FIXED.
- Sitemap: 67 URLs. `<lastmod>` now only appears on the 6 dle pages (today's date, which is legitimate because the daily character changes). FIXED.
- `Cache-Control: private, no-cache, no-store` + `X-Vercel-Cache: MISS` on hub, landings and game pages. Every crawler hit runs a server render. Landings and `/games` lists have no per-user content and could be ISR/static. Still open (low).
- `publication_date` is inferred as 2026-01-01 from "© 2026". There's no `dateModified` in the VideoGame schema. Low.
- `/llms-full.txt`, `/.well-known/*` and `/license.xml` still 307 into `/jjk/…` → 404. Low.

## 7. Top 5 highest-impact changes (remaining)

| # | Change | Impact | Effort |
|---|---|---|---|
| 1 | **Add an SSR "Comment jouer ?" answer block plus a 3-4 question FAQ to every game page**, templated per universe from existing config. Lead with a 40-60 word definition: "CSMdle est un jeu quotidien gratuit dans l'esprit de Wordle/Loldle : devine le personnage Chainsaw Man du jour…". Then cover the attributes (the schema columns are already server-side), roster size, the midnight Paris reset, "sans compte" and unlimited tries. Use question H2s ("Comment jouer à CSMdle ?", "Quand change le personnage du jour ?", "Combien de personnages ?"). FAQPage JSON-LD is optional. Put it below the game so UX is unaffected. | **High**: moves 54 pages from 19-120 to about 250 extractable words, and creates the first on-page match for "jeu anime wordle" and "how to play X-dle" | 3-5 h |
| 2 | **Connect the entity graph.** Add `parentOrganization: {"@id": "/#organization"}` on the 6 universe orgs. Make `VideoGame.author`/`publisher` an `@id` reference. Make `isBasedOn` a `{"@type":"CreativeWork","name":"Chainsaw Man","sameAs":["https://fr.wikipedia.org/wiki/Chainsaw_Man", "https://www.wikidata.org/wiki/Q…"]}`. Add `sameAs` on the root org once social accounts exist. | Medium-High: ties every page to known KG entities | 1-2 h |
| 3 | **Build off-site brand signals.** Post a launch thread per anime subreddit and r/animefr, publish daily Shorts/TikToks ("CSMdle #123 en 3 essais") from the existing emoji share grid, and get listed on "dle games" lists and directories. | High for ChatGPT and Perplexity (slow burn) | Ongoing |
| 4 | **Rename the slugs and disambiguate the titles.** Move `/csm/games/jjkdle` → `/csm/games/csmdle` (or `/dle`) and `jujutsu-draft` → `draft` with 301s. Update the canonical, sitemap and llms.txt. Rename guesswho, battle and codenames H1 and `name` to include the anime ("Qui est-ce ? Chainsaw Man"). Make the `/games` H1s name the anime. | Medium: removes the URL/entity contradiction on the 5 non-JJK flagships | 1-2 h |
| 5 | **Polish llms.txt and the query bridges.** Add the hub URL, put XXdle first in each section, give each "Qui est-ce ?" label its universe, and add the "Wordle/Loldle" framing. Back up "quiz" (frame Higher/Lower and Pyramid as quizzes) or remove it. Add an SSR "Personnage d'hier : X" line on dle pages (fresh daily, factual and citable, with no spoiler of today). Scope the rule34 CSP to `/admin`. | Medium | 1-2 h |

## Structured findings (audit-data.json, category "AI Search Readiness")

```json
{
  "category": "AI Search Readiness",
  "score": 49,
  "previous_score": 41,
  "dimensions": {"citability": 34, "structural_readability": 52, "multimodal": 48, "authority_brand": 28, "technical_accessibility": 85},
  "platform_scores": {"google_aio": 42, "chatgpt": 35, "perplexity": 42, "bing_copilot": 35},
  "findings": [
    {"id": "geo-desc-leak", "severity": "pass", "status": "fixed", "title": "Per-universe meta/og descriptions now match the anime and the VideoGame isBasedOn on all 54 game pages"},
    {"id": "geo-llms-txt", "severity": "pass", "status": "fixed", "title": "/llms.txt returns 200 text/markdown with a well-formed llmstxt.org structure (H1, summary, 6 universe sections, 66 canonical links)", "followups": ["hub URL missing", "dle listed 8th not first", "6 identical 'Qui est-ce ?' labels", "no Wordle framing", "/llms-full.txt and /.well-known/* still 307 -> 404"], "effort": "low"},
    {"id": "geo-missing-h1", "severity": "pass", "status": "fixed", "title": "H1 present on all game pages (dle H1 is sr-only); hub H1 spacing fixed"},
    {"id": "geo-manifest-brand", "severity": "pass", "status": "fixed", "title": "Root manifest is 'Anime Arcade', cookie-independent; login title neutral; JSON-LD duplicate on landings removed"},
    {"id": "geo-thin-game-pages", "severity": "high", "status": "open", "title": "Game pages have 44-124 crawl words; trafilatura extracts 19-21 words on dle and Pyramid pages; no how-to-play or FAQ passages", "evidence": "render_page.py extracted_text /jjk/games/jjkdle = 19 words, /csm/games/ranking = 21 words", "fix": "SSR 'Comment jouer ?' block + question-H2 FAQ per game, templated per universe", "effort": "medium"},
    {"id": "geo-entity-fragmented", "severity": "high", "status": "open", "title": "7 Organization nodes with no parentOrganization/sameAs; VideoGame.author inline without @id; isBasedOn is a bare string", "fix": "parentOrganization @id links, @id-referenced author/publisher, isBasedOn CreativeWork with Wikipedia/Wikidata sameAs", "effort": "low"},
    {"id": "geo-slug-confusion", "severity": "medium", "status": "open", "title": "JJK slugs reused in other universes (/csm/games/jjkdle, /aot/games/jujutsu-draft)", "fix": "Universe-specific or generic slugs with 301", "effort": "medium"},
    {"id": "geo-generic-titles", "severity": "medium", "status": "open", "title": "Guesswho H1 and VideoGame name 'Qui est-ce ?' identical in 6 universes; battle/codenames H1 use acronym only; /games H1s omit the anime name", "effort": "low"},
    {"id": "geo-query-gaps", "severity": "medium", "status": "open", "title": "'wordle' on 0 pages (keywords meta only); 'quiz' claimed but no quiz-framed game; 0 character names in SSR text; reset time not stated on dle pages", "effort": "low"},
    {"id": "geo-offsite-brand", "severity": "high", "status": "open", "title": "No detectable Reddit/YouTube/Wikipedia brand presence; vercel.app subdomain", "fix": "Reddit/YouTube Shorts/TikTok seeding, dle directory listings, custom domain", "effort": "high"},
    {"id": "geo-csp-adult-domain", "severity": "low", "status": "new", "title": "Site-wide CSP header whitelists *.rule34.xxx on every public response (needed only by admin booru importer)", "evidence": "Content-Security-Policy img-src/media-src on /, /robots.txt, /llms.txt; lib/admin/booru.ts", "fix": "Scope that directive to /admin routes", "effort": "low"},
    {"id": "geo-freshness-caching", "severity": "low", "status": "partially fixed", "title": "Sitemap lastmod now limited to daily dle pages (fixed); all HTML still Cache-Control no-store/MISS; no dateModified in VideoGame", "effort": "low"},
    {"id": "geo-crawler-access", "severity": "pass", "title": "All AI search and training crawlers allowed by robots.txt and served 200 with full SSR (re-verified with 12 UAs)"}
  ]
}
```
