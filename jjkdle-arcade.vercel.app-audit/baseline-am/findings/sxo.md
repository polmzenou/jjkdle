# SXO Analysis: jjkdle-arcade.vercel.app

Date: 2026-10-08 | Market: France (FR) | Analyst: SXO sub-agent
Pages rendered with `render_page.py --mode always` (Playwright): `/`, `/jjk`, `/jjk/games/jjkdle`, `/csm/games/jjkdle`, `/jjk/games/guesswho`, `/jjk/games/ranking`. Site-wide titles, descriptions and H1s are cross-checked against `../pages.json` (crawl of 66 URLs).

---

## SXO Gap Score (separate from the SEO Health Score)

| Scope | SXO Gap Score |
|---|---|
| **Primary page `/jjk/games/jjkdle` (query "jjkdle" / "jujutsu kaisen dle")** | **48/100** |
| `/csm/games/jjkdle` ("chainsaw man dle") | 38/100 |
| `/jjk/games/guesswho` ("qui est-ce jujutsu kaisen") | 40/100 |
| `/jjk/games/ranking` ("tier list jujutsu kaisen") | 30/100 |
| `/` ("anime wordle") | 35/100 |
| `/jjk` hub (navigational "JJK mini-jeux") | 58/100 |
| **Site-weighted SXO Gap Score** | **42/100** |

---

## 1. PRIMARY FINDING: Page-type and on-page signal mismatches

All game pages fit the **Tool / Interactive** type, and so do the competitors in each dle SERP, so the page type is **broadly aligned**. The gap is in the format. Most ranking dle pages are **"Tool + supporting content"**: an H1, the game above the fold, and below it a "How to play" section, rules, hints and sometimes yesterday's answer or FAQs. Our dle pages put only the bare tool in the server-rendered HTML.

| Query | SERP dominant type (confidence) | Target page / type | Severity | Core mismatch |
|---|---|---|---|---|
| jjkdle | Tool + supporting content (6/6 relevant results = 100%) | /jjk/games/jjkdle, bare Tool | **MEDIUM** | No H1, 55-65 SSR words. Competitors have H1 "JJKdle" plus 200-750 words of how-to-play text. |
| jujutsu kaisen dle | Tool (dle sites) mixed with editorial noise | /jjk/games/jjkdle | **MEDIUM** | Same as above. "Jujutsu Kaisen" does not appear in the title. |
| chainsaw man dle | Tool + supporting content (6/6 CSM dle sites) | /csm/games/jjkdle | **HIGH** | Meta and OG description say *"JJKdle : le jeu du jour Jujutsu Kaisen…"*, and the URL slug is `jjkdle`. The page tells Google it is about the wrong anime. |
| anime wordle | Multi-anime dle **hub/list** (animedle.org, mangadle, otakle, alternativeto) | `/`, Tool hub with 85-128 words | **MEDIUM** | The H1 does not contain "dle" or "wordle". Universe cards link to the `/jjk` hubs, not to the dle games. There is no list page of all 6 dles. |
| quiz jujutsu kaisen | Trivia quiz pages (JetPunk FR, AlloCiné, Sporcle, AnimeExplained, Bookroo) | No quiz page exists | **HIGH** | Meta descriptions on `/` and `/jjk` promise a "quiz", but none of the 9 games is a trivia quiz. |
| qui est-ce jujutsu kaisen | No dedicated result: generic JJK pages plus "Guess Who multiplayer" (CrazyGames, Roblox anime mode) | /jjk/games/guesswho, Tool behind a **login wall** | **HIGH** | Tool pages must not hide basic play behind a login (taxonomy rule). The title lacks "Jujutsu Kaisen". The H1 "Qui est-ce ?" is identical across 6 universes. |
| tier list jujutsu kaisen | Tool (TierMaker templates) plus Blog (gacha-game tier lists: Phantom Parade, Cursed Clash) | /jjk/games/ranking ("JJK Pyramid") | **CRITICAL** for this query | Pyramid is a ranking *quiz* with a fixed answer, not a free tier-list maker. It has no H1, its UI is in English ("Your Ranking", "Available", "Check Order", "Rank 1 to 8 · 4 attempts") on a French site, and the rendered DOM has a duplicate `<title>`. |

### Verified on-page defects (rendered DOM)
- **Wrong-universe meta descriptions**: the 5 non-JJK dle pages (`/csm|aot|kny|tg|bleach/games/jjkdle`) and the 5 non-JJK guesswho pages (`/…/games/guesswho`) all use the JJK description ("…Jujutsu Kaisen…"). The VideoGame JSON-LD is correctly localized (e.g. `"name":"CSMdle"`, `"isBasedOn":"Chainsaw Man"`), so only meta/OG are broken.
- **No H1** on any dle page or any Pyramid/ranking page. The first heading is `h2 "Leaderboard CSMdle"`.
- **SSR text is thin**: the dle page contains only "Essais : 0 · Devine le personnage mystère du jour · Leaderboard · Personne n'a encore trouvé le perso du jour — sois le premier !" plus the footer. The rules sit behind a client-side "?" button.
- **Empty leaderboard message** ("Personne n'a encore trouvé le perso du jour") is server-rendered. To crawlers and first visitors it signals low activity.
- **Positives**: the input "Tape un personnage…" is server-rendered above the fold, no account is needed for dle, `html lang="fr"`, the VideoGame + Offer(price 0) schema has `inLanguage: fr-FR`, the fan disclaimer is present, and each universe has its own OG image.

---

## 2. SERP analysis and competitors

Note: WebSearch is not google.fr. The bare query "jjkdle" returned unrelated results, so I used descriptive variants ("JJKdle guess the Jujutsu Kaisen character daily game", "Chainsaw Man guess the character daily game"). I could not observe PAA, ads, AI Overview or featured snippets.

### "jjkdle" / "jujutsu kaisen dle": competitors (all English-language)
| # | URL | Type | Format notes |
|---|---|---|---|
| 1 | jjkdle.com | Tool (EMD) | 3 modes (Standard, Character+Ability, Word). About 3,000 words of character descriptions. No how-to-play section. |
| 2 | jjkdle.net | Tool hub (EMD) | H1 = title. 19 JJK mini-games, 10 sister anime sites (including Chainsaw Man, AOT, Kimetsu), about 600 words of SEO blurbs, leaderboards, card deck, online duel. **Closest model to our site.** |
| 3 | jjk.guide/games/jjkdle | Tool + wiki | H1 "JJKdle". H2s "How to play", "Who is it today?". Yesterday's answer (Kento Nanami) links to the character page. Puzzle #163, midnight countdown, about 40 internal wiki links. |
| 4 | jujutsudle.com | Tool | H1 plus "How to play jujutsudle?" (3 subsections), about 200 words, 3 images, trademark disclaimer. |
| 5 | dlegames.org/game/jjkdle | Tool + article | H1 plus about 750 words: What is, How to play (5 steps), Strategy, Where to play. |
| 6 | jujutkdle.org, dlegames.org/game/jujutsudle | Tool | Clone or aggregator variants. |

### "chainsaw man dle": competitors
csmdle.com (EMD; Classic/Quote/Emoji/Contract modes; SSL certificate expired at fetch time), chainsawdle.net (hub with pixel mode), chainsawmandle.com (Classic/Quote/Emoji/Blur), animedle.org/chainsawdle (H1, "How to play" plus a "Chainsawdle Answers" section), csm.guide/games/chainsawdle, mangadle.net/chainsawman.

### "anime wordle": competitors
animedle.org (hub of dle games plus the list page "Daily Manga Character Guessing Games"), Mangadle (multi-series), Otakle, Animedle (Product Hunt), AlternativeTo listings.

### "quiz jujutsu kaisen"
JetPunk user quizzes (including one in French), AlloCiné "le quiz ultime… tueur de Fléaux", Sporcle, AnimeExplained (average score 64%), Twinfinite, Bookroo per-volume quizzes. **Dominant type: quiz page (Tool, multiple choice).**

### "tier list jujutsu kaisen"
TierMaker templates (strength, ch. 227, manga, "classement de préférence" FR) plus gacha tier-list articles (Pocket Gamer, Twinfinite, AFK Gaming, Breakflip FR, mobi.gg FR) plus Dexerto FR "classement des 10 personnages les plus puissants". **Split intent: Tool (maker) about 50%, Blog about 50%.**

### "qui est-ce jujutsu kaisen"
No relevant result. CrazyGames "Guess Who Multiplayer" and Roblox "Guess Who" (Anime mode) appear for the generic concept. **Opportunity: weak competition in French.**

### Strategic insight
**Every dle competitor found is English-only.** The French-language JJK/CSM/AOT/KNY/TG/Bleach dle space appears uncontested. Fighting the EMDs (jjkdle.com, jjkdle.net, csmdle.com) for the bare brand term is low-yield. Owning the "FR / en français / devine le personnage … du jour" variants is realistic.

---

## 3. User stories

1. **Awareness/consideration.** As a **French JJK fan who has heard of "dle" games**, I want to play today's JJK character puzzle in French, because the English sites use English attribute names I have to translate, but I'm blocked by **an information gap**: the SERP snippet and page give no rules, no puzzle number and no "FR" signal.
   *(Signals: all 6 JJKdle competitors are English; jjk.guide, jujutsudle and dlegames all have "How to play" H2s.)*
2. **Decision/retention.** As a **daily player who failed or missed yesterday**, I want to see yesterday's character and when the next one drops, because I want to keep my streak going, but I'm blocked by **no answer or countdown content**.
   *(Signals: jjk.guide "yesterday's answer: Kento Nanami" plus countdown; animedle.org "Chainsawdle Answers" heading; answer-article ecosystem: holdtoreset "Onepiecedle Answers Today", amkstation/gamertweak "Narutodle answers".)*
3. **Consideration.** As a **Chainsaw Man fan**, I want a CSM-specific daily game, because the JJK games don't cover my series, but I'm blocked by **a trust gap**: the Google snippet for our CSMdle reads "le jeu du jour Jujutsu Kaisen" and the URL says `jjkdle`.
   *(Signals: 6 CSM-dedicated dle sites rank, including csmdle.com and chainsawdle.net; our meta description is wrong.)*
4. **Decision.** As a **player who wants to challenge a friend**, I want to start a 1v1 "Qui est-ce ?" instantly from a shared link, because we're on Discord right now, but I'm blocked by **friction**: I have to log in before I see any grid.
   *(Signals: CrazyGames "Guess Who Multiplayer" asks only for a nickname; Roblox has an anime mode; jjkdle.net promotes "Online Duel – NEW MODE".)*
5. **Awareness.** As a **power-scaling debater**, I want to drag JJK characters into S/A/B tiers and share the image, because I disagree with the Dexerto top 10, but I'm blocked by **a format mismatch**: Pyramid has a single "correct" order and its UI is in English.
   *(Signals: TierMaker templates such as "strength ch 227" and "classement de préférence"; Dexerto FR "personnages les plus puissants".)*

---

## 4. Gap analysis: `/jjk/games/jjkdle` (48/100)

| Dimension | Score | Evidence |
|---|---|---|
| Page Type | 11/15 | The Tool type matches 100% of the SERP, but it lacks the "Tool + how-to/FAQ" layer that 4 of 6 competitors use. |
| Content Depth | 3/15 | 55-65 SSR words (93 rendered). No H1, no rules, no attribute legend, no strategy. Competitors have 200-750 words (jujutsudle 200, jjk.guide 250-300, jjkdle.net 600, dlegames 750). |
| UX Signals | 9/15 | Input above the fold and server-rendered, no login, leaderboards (day/week/all-time). But the help is hidden behind "?", there is no puzzle #, no countdown and no yesterday's answer in the DOM, the back link is in English ("← Back"), and the SSR leaderboard is empty. |
| Schema | 10/15 | VideoGame + Offer(0 EUR) + `inLanguage fr-FR` + `isBasedOn`. Missing BreadcrumbList, a `sameAs`/`url` Organization identity, and `aggregateRating` (only if genuine). |
| Media | 6/15 | One OG/idle image. No illustrated how-to (jujutsudle has 3 images) and no example guess-row image. |
| Authority | 4/15 | `*.vercel.app` subdomain against EMDs (jjkdle.com/.net). No about page and no wiki or character content to build topical authority. The fan disclaimer is the main plus. |
| Freshness | 5/10 | Daily rotation is inherently fresh, but there is no visible date or puzzle number. `htmldate` returns 2026-01-01 for every page. |
| **Total** | **48/100** | |

Quick scores for the other pages: `/csm/games/jjkdle` 38 (wrong meta, wrong slug), `/jjk/games/guesswho` 40 (H1 present, 75 words, login wall, generic title), `/jjk/games/ranking` 30 (no H1, English UI, duplicate title, wrong format for "tier list"), `/` 35 (85-128 words, no dle links), `/jjk` 58 (H1, 522 words, H3 per game; best page on the site).

---

## 5. Persona scoring (weakest first)

| Persona | SERP evidence | Relevance | Clarity | Trust | Action | Total | Rating |
|---|---|---|---|---|---|---|---|
| Answer Seeker (stuck or missed yesterday) | Answer articles (holdtoreset, amkstation, gamertweak); jjk.guide yesterday's answer; animedle "Answers" | 5 | 3 | 10 | 8 | **26** | Critical mismatch |
| Trivia Quiz Taker | JetPunk FR, AlloCiné, Sporcle, AnimeExplained | 6 | 6 | 12 | 10 | **34** | Critical mismatch |
| Power-Scaling Debater | TierMaker templates; Dexerto FR rankings | 8 | 9 | 10 | 14 | **41** | Needs work |
| Multi-Anime Dle Collector | animedle.org hub, Mangadle, jjkdle.net 10 sister sites | 14 | 9 | 12 | 12 | **47** | Needs work |
| 1v1 Friends Player | CrazyGames Guess Who, Roblox anime mode, jjkdle.net Online Duel | 16 | 12 | 12 | 7 | **47** | Needs work |
| Chainsaw Man Fan | 6 CSM dle competitors | 12 | 12 | 8 | 19 | **51** | Needs work |
| French Daily Dle Player | 6 English-only JJKdle sites | 20 | 15 | 13 | 20 | **68** | Good |

**Weakest persona: Answer Seeker (26/100).** Top issue: there is no surface for "yesterday's character", hints or countdown. Fix: add an "Hier : <perso> · Prochain perso dans HH:MM · Puzzle #N" strip under the game. Also create `/jjk/games/jjkdle/reponses` (archive of past answers with character attributes), linked from the game page, so the game page stays spoiler-free.

**Systemic issues**
- **Clarity**: no H1 or SSR rules on game pages. Crawlers and first-time visitors see a leaderboard heading, not what the page is.
- **Trust**: copy-pasted JJK meta on other universes, English UI strings, empty leaderboards and the vercel.app domain all undermine credibility.
- **Action friction**: Qui est-ce requires login, and there is no share or streak CTA in SSR.

---

## 6. Prioritized recommendations

1. **(CRITICAL, quick fix) Localize meta and OG descriptions** for the 10 non-JJK dle and guesswho pages. Example for CSM: "CSMdle : devine le personnage Chainsaw Man du jour (démon, contrat, arc…). Nouveau perso chaque jour, gratuit, en français, sans compte."
2. **(HIGH) Rename the dle slugs per universe**: `/csm/games/csmdle`, `/aot/games/aotdle`, `/kny/games/knydle`, `/tg/games/tgdle`, `/bleach/games/bleachdle`, with 301s from `/…/games/jjkdle`. Update the canonical, sitemap and internal links.
3. **(HIGH) Add an SSR H1 and a supporting-content block below every dle game** (250-400 words, French). Use this order: H1 "JJKdle — Devine le personnage Jujutsu Kaisen du jour" → game → H2 "Comment jouer à JJKdle ?" (colour/arrow legend, list of attributes) → H2 "Indices et astuces" → H2 "Personnage d'hier" plus countdown plus puzzle # → H2 "FAQ" (Quand change le perso ? Combien d'essais ? Est-ce officiel ?) → links to the other 5 dles. Use `<details>` or keep it below the fold so the tool stays first.
4. **(HIGH) Claim the French niche in titles**, e.g. "JJKdle FR — Devine le personnage Jujutsu Kaisen du jour | JJK Arcade" and "CSMdle — Jeu du jour Chainsaw Man en français". Every competitor is English.
5. **(HIGH) Qui est-ce: remove the login wall for basic play.** Allow a guest lobby (nickname only, share link). Server-render the rules plus a sample 25-card grid preview. Title: "Qui est-ce ? Jujutsu Kaisen — jeu 1v1 en ligne gratuit". Use a universe-specific H1 ("Qui est-ce ? version Jujutsu Kaisen").
6. **(HIGH) "tier list jujutsu kaisen"**: either build a real free tier-list maker (`/jjk/games/tier-list`: drag into S-F tiers, export PNG, share), or retarget Pyramid to "classement personnages Jujutsu Kaisen (jeu)" with an H1. In both cases, translate "Your Ranking / Available / Check Order / Rank 1 to 8 · 4 attempts" into French and fix the duplicate `<title>` after hydration.
7. **(MEDIUM) "quiz jujutsu kaisen"**: build a real multiple-choice quiz page per universe (it would match the JetPunk/AlloCiné format), or remove "quiz" from the `/` and `/jjk` meta descriptions so the snippet does not overpromise.
8. **(MEDIUM) "anime wordle" hub**: create a `/dle` page ("Anime dle en français : JJKdle, CSMdle, AOTdle, KNYdle, TGdle, Bleachdle") with direct links. Add "dle" to the home H1 ("Anime Arcade — jeux dle et mini-jeux anime gratuits en français").
9. **(MEDIUM) Trust and freshness**: replace the SSR "Personne n'a encore trouvé…" with a neutral line (or render it client-side only), and show "Puzzle #N · <date>". Add an About/"À propos" page. Consider a custom domain; vercel.app caps authority.
10. **(LOW) Schema**: add BreadcrumbList (Accueil > JJK Arcade > Jeux > JJKdle). FAQPage is fine as markup, but do not expect rich results; Google restricts them to authoritative gov/health sites.

### SOLL wireframe (dle page, condensed)
```
[Header: JJK Arcade | Jeux | Connexion]
H1: JJKdle — Devine le personnage Jujutsu Kaisen du jour
Sub: Puzzle #212 · 8 oct. 2026 · Prochain perso dans 05:42:10 · Essais illimités · Sans compte
[INPUT "Tape un personnage…"] [Grille de résultats]
[Partager mon résultat] [Voir la série / streak]
H2: Comment jouer ?  (légende vert/orange/rouge + flèches ↑↓, 7 attributs: race, grade, clan, arc…)
H2: Personnage d'hier : <nom>  → lien "Toutes les réponses JJKdle"
H2: Leaderboard du jour / Hebdo / All-time
H2: Les autres dle : CSMdle · AOTdle · KNYdle · TGdle · Bleachdle
H2: FAQ (À quelle heure change le perso ? Est-ce officiel ? Fonctionne sur mobile ?)
[Footer: Fan-projet non officiel…]
```

---

## Cross-skill referrals
- `/seo schema`: BreadcrumbList, Organization identity, verify VideoGame.
- `/seo content`: E-E-A-T, About page, French supporting copy for game pages.
- `/seo page`: thin content and missing H1 across 36 game URLs.
- Local intent: none detected; `/seo local` is not needed.

## Limitations
- WebSearch is not google.fr. Rankings, positions, PAA, AI Overview, ads and featured snippets could not be observed. Competitor lists are inferred from search-tool results, not from actual Google FR positions.
- The bare query "jjkdle" returned unrelated results in the tool, so descriptive variants were used.
- I had no search volume, GSC or click data. Persona weights are qualitative.
- csmdle.com could not be fetched (expired SSL certificate). Competitor word counts are WebFetch estimates.
- Rendered analysis covers 6 pages. Other universes are extrapolated from the `pages.json` crawl.
- Core Web Vitals, mobile tap targets and the in-game client-only help modal content were not assessed.

Generate a PDF report? Use `/seo google report`.

---

## Structured findings (audit-data.json → "Search Experience")
```json
{
  "category": "Search Experience",
  "sxo_gap_score": {"site_weighted": 42, "jjk_jjkdle": 48, "csm_jjkdle": 38, "jjk_guesswho": 40, "jjk_ranking": 30, "home": 35, "jjk_hub": 58},
  "findings": [
    {"id": "sxo-01", "severity": "critical", "title": "Non-JJK dle and guesswho pages use the Jujutsu Kaisen meta/OG description", "urls": ["/csm/games/jjkdle", "/aot/games/jjkdle", "/kny/games/jjkdle", "/tg/games/jjkdle", "/bleach/games/jjkdle", "/csm/games/guesswho", "/aot/games/guesswho", "/kny/games/guesswho", "/tg/games/guesswho", "/bleach/games/guesswho"]},
    {"id": "sxo-02", "severity": "critical", "title": "Pyramid page targets 'tier list' intent but is a fixed-answer quiz with English UI, no H1, duplicate <title>", "urls": ["/*/games/ranking"]},
    {"id": "sxo-03", "severity": "high", "title": "Dle pages lack H1 and how-to-play/FAQ supporting content (55-65 SSR words vs 200-750 for competitors)", "urls": ["/*/games/jjkdle"]},
    {"id": "sxo-04", "severity": "high", "title": "Non-JJK dle URLs use 'jjkdle' slug", "urls": ["/csm|aot|kny|tg|bleach/games/jjkdle"]},
    {"id": "sxo-05", "severity": "high", "title": "Qui est-ce requires login before any play; generic title and H1 across universes", "urls": ["/*/games/guesswho"]},
    {"id": "sxo-06", "severity": "high", "title": "Meta descriptions promise a 'quiz' but no trivia quiz exists", "urls": ["/", "/jjk"]},
    {"id": "sxo-07", "severity": "medium", "title": "No yesterday's answer / countdown / puzzle number; Answer-Seeker persona scores 26/100", "urls": ["/*/games/jjkdle"]},
    {"id": "sxo-08", "severity": "medium", "title": "No French 'anime dle' hub page; home H1 lacks 'dle'", "urls": ["/"]},
    {"id": "sxo-09", "severity": "medium", "title": "Empty-leaderboard text server-rendered signals low activity", "urls": ["/*/games/jjkdle"]}
  ],
  "competitors": ["jjkdle.com", "jjkdle.net", "jjk.guide", "jujutsudle.com", "dlegames.org", "jujutkdle.org", "csmdle.com", "chainsawdle.net", "chainsawmandle.com", "animedle.org", "csm.guide", "mangadle.net", "tiermaker.com", "jetpunk.com", "allocine.fr", "crazygames.com"],
  "opportunity": "All dle competitors found are English-only; the French-language anime dle niche appears uncontested."
}
```

Sources: [jjkdle.com](https://www.jjkdle.com/), [jjkdle.net](https://jjkdle.net/), [jjk.guide JJKdle](https://www.jjk.guide/games/jjkdle), [jujutsudle.com](https://jujutsudle.com/), [dlegames.org JJKdle](https://dlegames.org/game/jjkdle), [jujutkdle.org](https://jujutkdle.org/), [csmdle.com](https://www.csmdle.com/), [chainsawdle.net](https://chainsawdle.net/), [chainsawmandle.com](https://www.chainsawmandle.com/), [animedle.org Chainsawdle](https://animedle.org/chainsawdle/), [csm.guide Chainsawdle](https://www.csm.guide/games/chainsawdle), [mangadle.net CSM](https://mangadle.net/chainsawman), [animedle.org list](https://animedle.org/daily-manga-character-guessing-games/), [Mangadle (AlternativeTo)](https://alternativeto.net/software/mangadle/about/), [TierMaker JJK](https://tiermaker.com/create/jujutsu-kaisen-15603075), [TierMaker FR classement](https://tiermaker.com/create/classement-de-prfrence-des-personnages-de-jujutsu-kaisen--464345), [Dexerto FR top 10](https://www.dexerto.fr/films-series/jujutsu-kaisen-le-classement-des-10-personnages-les-plus-puissants-de-lanime-1517214/), [AlloCiné quiz](https://www.allocine.fr/article/fichearticle_gen_carticle=18707623.html), [JetPunk JJK FR](https://www.jetpunk.com/user-quizzes/2826399/jujutsu-kaisen), [AnimeExplained quiz](https://www.animeexplained.com/quizzes/test-your-knowledge-with-this-jujutsu-kaisen-quiz/), [CrazyGames Guess Who](https://www.crazygames.com/es/game/guess-who-multiplayer), [holdtoreset Onepiecedle answers](https://holdtoreset.com/onepiecedle-answers-today-classic-devil-fruit-wanted-and-laugh/)
