# SXO Re-analysis: jjkdle-arcade.vercel.app (PM pass)

Date: 2026-10-08 (afternoon) | Market: France (FR) | Baseline: `../baseline-am/findings/sxo.md` (SXO 42/100)
Live renders: `render_page.py --mode always --json` (Playwright) for `/`, `/jjk`, `/jjk/games/jjkdle`, `/csm/games/jjkdle`, `/jjk/games/guesswho`, `/jjk/games/ranking`. Other universes were cross-checked against `../pages.json` (fresh crawl, 15:50). I reused the competitor list and SERP observations from the baseline. Two new French-variant searches were run to confirm them.

---

## SXO Gap Score (separate from the SEO Health Score)

| Page (target query) | AM | **PM** | Delta | Why |
|---|---|---|---|---|
| `/jjk/games/jjkdle` ("jjkdle", "jujutsu kaisen dle") | 48 | **50** | +2 | It now has a server-rendered H1. Body is still 71 SSR words, with no rules, puzzle number or yesterday's answer. |
| `/csm/games/jjkdle` ("chainsaw man dle") | 38 | **47** | +9 | Meta and OG descriptions are now about Chainsaw Man, and the H1 is correct. The slug is still `jjkdle` and the title still lacks "Chainsaw Man". |
| `/jjk/games/guesswho` ("qui est-ce jujutsu kaisen") | 40 | **40** | 0 | Unchanged: login wall, H1 "Qui est-ce ?" and a title without "Jujutsu Kaisen". |
| `/jjk/games/ranking` ("tier list jujutsu kaisen") | 30 | **35** | +5 | The H1 was added and the leaderboard is now populated in SSR. The duplicate `<title>`, description and robots tags remain after hydration, the UI is in English, and the format still does not match the query. |
| `/` ("anime wordle", "jeux dle anime") | 35 | **35** | 0 | Unchanged: 100 SSR words, "dle" absent from the H1, no direct links to the dle games, and the meta still promises a "quiz". |
| `/jjk` (navigational) | 58 | **58** | 0 | Still the best page on the site. The meta still promises a "quiz". |
| **Site-weighted SXO Gap Score** | 42 | **44** | **+2** | The morning fixes corrected trust and relevance signals. The heaviest gaps (Content Depth, Answer Seeker) are untouched. |

---

## 1. PRIMARY FINDING: format mismatch is now the main gap

The page type matches the SERP: every page is a Tool, and so is 100% of the dle SERP. Now that meta descriptions and H1s are fixed, **the main gap is format. Ranking dle pages are "Tool + supporting content"; ours are still a bare Tool.**

| Query | SERP dominant format | Our page | Severity (AM → PM) |
|---|---|---|---|
| jjkdle / jujutsu kaisen dle | Tool + how-to/answer content (6/6; jjk.guide, jujutsudle, dlegames: 200-750 words) | H1 + input + empty leaderboard, 71 SSR words | MEDIUM → **MEDIUM** |
| chainsaw man dle | Tool + supporting content (6/6 CSM dle sites; animedle "Answers" H2) | Correct meta and H1, but slug `/csm/games/jjkdle` and title "CSMdle · CSM Arcade" | HIGH → **MEDIUM** |
| qui est-ce jujutsu kaisen | Weak SERP; instant-play Guess Who (CrazyGames: nickname only) | Login wall, generic H1 | **HIGH** (unchanged) |
| tier list jujutsu kaisen | TierMaker maker (~50%) + ranking articles (~50%) | Fixed-answer ranking quiz, English UI | **CRITICAL** (unchanged) |
| quiz jujutsu kaisen | Multiple-choice quiz pages | No quiz exists, but the meta on `/` and `/jjk` promises one | **HIGH** (unchanged) |
| anime wordle / dle anime | Multi-dle list hubs (animedle.org, mangadle) | `/` links only to the universe hubs | **MEDIUM** (unchanged) |

### Verified in the PM render
**Fixed since the morning**
- All 5 non-JJK dle pages have universe-specific meta and OG descriptions. CSM: "Devine le personnage Chainsaw Man mystère du jour… (espèce, camp, contrat, arc…)". AOT is also correct.
- Non-JJK guesswho meta is fixed, e.g. "Qui est-ce ? (Chainsaw Man) : …".
- Every dle page has an SSR H1 ("JJKdle — jeu Jujutsu Kaisen gratuit", "CSMdle — jeu Chainsaw Man gratuit", "AOTdle — …").
- Pyramid has an H1 ("JJK Pyramid — jeu Jujutsu Kaisen gratuit"). Its SSR leaderboard shows 4 players (Kata 10 000…), which is a better activity signal.

**Still open**
- Dle body text: "← Back · Essais : 0 · Devine le personnage mystère du jour. · Leaderboard JJKdle · Personne n'a encore trouvé le perso du jour — sois le premier !" There are no rules, attributes, colour legend, puzzle number, date, reset time or yesterday's answer in SSR. The countdown (`msUntilMidnight`) and the share button appear only after a win.
- `← Back` is still in English (`JJKdleGame.tsx:257`).
- Dle titles are `JJKdle · JJK Arcade` and `CSMdle · CSM Arcade`. Neither contains the series name or a French or "du jour" signal.
- Slugs are still `/{csm,aot,kny,tg,bleach}/games/jjkdle`.
- Pyramid after hydration has **2 `<title>`, 2 `meta description` and 2 `robots`** tags. "Your Ranking", "Available", "Check Order", "Rank 1 to 8 · 4 attempts · Correct positions lock", "Attempt 1/4", "Worth 10 000 pts if correct now" and the dnd-kit screen-reader string are still in English.
- Qui est-ce: "Connecte-toi pour créer ou rejoindre un lobby. Se connecter". The page has no grid preview, no 0 images and a generic H1/title.
- Game pages have no BreadcrumbList. It exists only on `/jjk/games`.
- `htmldate` still returns 2026-01-01 for every page, so there is no visible date.

---

## 2. SERP and competitors (reused from the baseline, re-checked)

The competitor set is unchanged: jjkdle.com, jjkdle.net, jjk.guide, jujutsudle.com, dlegames.org, jujutkdle.org; csmdle.com, chainsawdle.net, chainsawmandle.com, animedle.org, csm.guide, mangadle.net; TierMaker, Dexerto FR, JetPunk, AlloCiné, CrazyGames.

PM re-check: "jjkdle français devine le personnage Jujutsu Kaisen du jour" and "chainsaw man dle personnage du jour jeu en français" returned **no dle game in French, and our site did not appear either**, only wiki and news pages (Vikidia, Dexerto FR). This confirms the baseline: **the French-language dle niche is uncontested, but our pages are not yet visible for it.** The French copy block below is how we claim it.

Format benchmarks for the "Comment jouer" block:
- **jjk.guide/games/jjkdle**: H2 "How to play", H2 "Who is it today?", yesterday's answer (with a link), puzzle number, midnight countdown.
- **jujutsudle.com**: "How to play jujutsudle?" in 3 subsections, ~200 words, 3 images.
- **dlegames.org**: What is / How to play (5 steps) / Strategy / Where to play, ~750 words.
- **animedle.org/chainsawdle**: "How to play" plus a "Chainsawdle Answers" section.

---

## 3. User stories (updated)

1. **Decision/retention (Answer Seeker).** As a daily player who missed yesterday, I want to see yesterday's character and when the next one drops, so I can keep my streak going. I'm blocked by **no answer, date or puzzle number in the page**. *(Signals: jjk.guide yesterday's answer + countdown; animedle "Chainsawdle Answers"; answer-article ecosystem, e.g. holdtoreset, gamertweak.)* **Unchanged.**
2. **Awareness (French dle player).** As a French JJK fan, I want the rules in French before I type my first guess, because the English sites use attribute names I have to translate. I'm blocked by **rules hidden behind interaction; SSR shows only an input and an empty leaderboard**. *(Signals: 6/6 English competitors; 4/6 have an H2 "How to play".)* **Partly improved: the H1 now names the game.**
3. **Consideration (Chainsaw Man fan).** As a CSM fan, I want a CSM-specific daily game. **Mostly resolved**: the snippet now says Chainsaw Man. What remains: the URL `/csm/games/jjkdle` and a title without "Chainsaw Man". *(Signals: 6 CSM dle competitors, including EMDs.)*
4. **Decision (1v1 friends).** As a player on Discord with a friend, I want to start "Qui est-ce ?" from a shared link without an account. I'm blocked by **the login wall**. *(Signals: CrazyGames Guess Who asks only for a nickname; jjkdle.net "Online Duel".)* **Unchanged.**
5. **Awareness (power-scaling debater).** As a debater, I want a free JJK tier-list maker. I'm blocked by **a fixed-answer quiz with English UI**. *(Signals: TierMaker JJK templates, including a French "classement de préférence"; Dexerto FR ranking.)* **Unchanged.**

---

## 4. Gap analysis

### `/jjk/games/jjkdle` (50/100, was 48)
| Dimension | AM | PM | Evidence |
|---|---|---|---|
| Page Type | 11 | 12 | Tool, matching 100% of the SERP. The H1 now states the game. The "Tool + how-to" layer is still missing. |
| Content Depth | 3 | 4 | 71 SSR / 99 rendered words. Competitors have 200-750. No rules, attributes or FAQ. |
| UX Signals | 9 | 9 | Input "Tape un personnage…" is SSR and above the fold, no login, share button and countdown after a win. Against that: "← Back" in English, empty-leaderboard text in SSR, help hidden. |
| Schema | 10 | 10 | VideoGame + Offer(0) + `inLanguage fr-FR` + `isBasedOn`. No BreadcrumbList. |
| Media | 6 | 6 | 1 idle image. No illustrated example row. |
| Authority | 4 | 4 | vercel.app subdomain against EMDs. No About page. Fan disclaimer present. |
| Freshness | 5 | 5 | Content rotates daily, but no visible date or puzzle number. htmldate = 2026-01-01. |

### `/csm/games/jjkdle` (47/100, was 38)
Page Type 11 (the slug contradicts the H1), Content 4, UX 8, Schema 10, Media 6, Authority 3, Freshness 5. Fixing the meta removed the trust penalty. The next points come from the slug, the title and the Comment jouer block.

### `/jjk/games/guesswho` (40/100, unchanged)
Page Type 7 (Tool behind a login, against the taxonomy rule), Content 4 (87 SSR words), UX 5, Schema 10, Media 2 (0 images), Authority 4, Freshness 8 (live lobbies; not date-sensitive).

### `/jjk/games/ranking` (35/100, was 30)
Page Type 3 (for "tier list": wrong format), Content 4, UX 7 (+1: H1 and populated leaderboard; −: English UI), Schema 9 (VideoGame, but duplicate head tags), Media 6, Authority 4, Freshness 2.

### `/` (35/100) and `/jjk` (58/100): unchanged since the baseline.

---

## 5. Persona scoring (weakest first)

| Persona | R | C | T | A | AM | **PM** | Top fix |
|---|---|---|---|---|---|---|---|
| Answer Seeker | 5 | 3 | 10 | 8 | 26 | **26** | SSR strip "Personnage n°N · date · reset minuit" + H2 "Personnage d'hier" (section 6) |
| Trivia Quiz Taker | 6 | 6 | 12 | 10 | 34 | **34** | Remove "quiz" from the `/` and `/jjk` metas, or build a real QCM page |
| Power-Scaling Debater | 8 | 10 | 11 | 14 | 41 | **43** | Translate the Pyramid UI, dedupe the head tags, decide maker vs retarget |
| 1v1 Friends Player | 16 | 12 | 12 | 7 | 47 | **47** | Guest lobby (nickname only) + SSR rules + grid preview |
| Multi-Anime Dle Collector | 14 | 9 | 12 | 12 | 47 | **47** | `/dle` hub page + an "Les autres dle" block on every dle page |
| Chainsaw Man Fan | 14 | 14 | 13 | 19 | 51 | **60** | Slug `/csm/games/csmdle` (301) + title with "Chainsaw Man" |
| French Daily Dle Player | 20 | 17 | 13 | 20 | 68 | **70** | Visible French rules + attribute legend in SSR |

Systemic: **Clarity** (no SSR rules on 36 game URLs) and **Action** (login wall on guesswho, empty-leaderboard copy) are still the weakest dimensions.

---

## 6. DELIVERABLE: target layout + French copy for the dle "Comment jouer" block

### 6.1 Principles
- **Tool first.** The H1, status strip and input stay above the fold on mobile. The guide sits **below the game and the leaderboard is moved under it**. Nothing pushes the input down.
- **Server-rendered.** The guide is a server component in `app/[universe]/games/jjkdle/page.tsx`, rendered after `<JJKdleGame>`. It must not be a modal, and it must not sit behind the "?" button.
- **Data-driven per universe.** The attribute table loops over `schema.columns` (already loaded on the page). Each universe then gets its own list (JJK: 8 columns, CSM: 6) with no copy-paste and no new risk of wrong-universe text. Only the short per-attribute explanations come from a small per-universe copy map.
- **Spoiler-safe.** Only yesterday's answer is shown, never today's.
- **Visible Q&A, no FAQPage schema.** Use `<h3>` questions with `<p>` answers, or `<details>`/`<summary>` (content stays in the DOM). Do not add `FAQPage` JSON-LD.
- **Length.** About 350-450 SSR words, which brings the page into the competitor range (200-750).

### 6.2 Target layout (SOLL, mobile-first)
```
[Header universe: JJK Arcade | Jeux | Connexion]
[← Retour aux jeux]                                   ← French (currently "← Back")
H1: JJKdle — devine le personnage Jujutsu Kaisen du jour
Strip (SSR <p>): Personnage n°214 · jeudi 8 octobre 2026 · Nouveau perso à minuit (heure de Paris) · Essais illimités · Sans compte
[INPUT "Tape un personnage…"]  Essais : 0
[Grille d'indices — 8 colonnes]
[after win: Trouvé en N essais · Partager 🟩🟧🟥 · Prochain perso dans HH:MM:SS]
────────────── below the fold ──────────────
H2: Comment jouer à JJKdle ?
   <ol> 4 steps
   H3: Que veulent dire les couleurs ?   (Vert / Orange / Rouge / ↑ ↓)
   H3: Les 8 indices de JJKdle            (table generated from schema.columns)
H2: Le personnage JJKdle d'hier
   [miniature] "Hier (mercredi 7 octobre), il fallait trouver : <Nom>"  — trouvé par N joueurs
H2: Astuces pour trouver en moins de 5 essais
   <ul> 3 bullets
H2: Questions fréquentes sur JJKdle       (visible <h3>/<p> or <details>; no FAQPage schema)
   H3 × 6
H2: Classement JJKdle  (Du jour · Hebdo · All-time)      ← moved here from directly under the game
H2: Les autres jeux « dle » d'Anime Arcade
   CSMdle (Chainsaw Man) · AOTdle (Attack on Titan) · KNYdle (Kimetsu no Yaiba) · TGdle (Tokyo Ghoul) · Bleachdle (Bleach) · Tous les jeux JJK →
[Footer: Fan-projet non officiel…]
```

### 6.3 French copy (JJK version; placeholders in `{}` swap per universe)

**Title tag:** `JJKdle — Devine le personnage Jujutsu Kaisen du jour (FR)` (~58 chars)
CSM: `CSMdle — Devine le personnage Chainsaw Man du jour (FR)`

**H1:** `JJKdle — devine le personnage Jujutsu Kaisen du jour`
(The current H1 "jeu Jujutsu Kaisen gratuit" lacks the query phrase "personnage du jour". "Gratuit" can move to the strip.)

**Status strip:**
`Personnage n°{N} · {jeudi 8 octobre 2026} · Nouveau perso à minuit (heure de Paris) · Essais illimités · Gratuit, sans compte`

**H2 — Comment jouer à JJKdle ?**
> Chaque jour, un personnage de *Jujutsu Kaisen* est tiré au sort, et c'est le même pour tous les joueurs. Ton but : le retrouver en un minimum d'essais.
> 1. Tape le nom d'un personnage dans la barre de recherche et valide.
> 2. Une ligne apparaît avec ses 8 caractéristiques. Chaque case se colore selon qu'elle correspond ou non au personnage mystère.
> 3. Sers-toi des couleurs et des flèches pour éliminer des pistes, puis propose un autre personnage.
> 4. Une fois le personnage trouvé, partage ta grille d'émojis 🟩🟧🟥 et reviens demain : un nouveau personnage arrive à minuit, heure de Paris.

**H3 — Que veulent dire les couleurs ?**
| Case | Signification |
|---|---|
| 🟩 Vert | Bonne réponse : l'attribut est identique à celui du personnage mystère. |
| 🟧 Orange | Proche : pour l'Énergie occulte, tu es à 20 points ou moins de la bonne valeur. |
| 🟥 Rouge | Mauvaise réponse. |
| ↑ / ↓ | La bonne valeur est plus haute ou plus basse (grade, arc, énergie occulte). |

**H3 — Les 8 indices de JJKdle** (rows generated from `schema.columns`; labels below are the current JJK values)
| Indice | Ce qu'il compare |
|---|---|
| Race | Humain, fléau, réceptacle… |
| Genre | Homme / Femme |
| Grade | De « Grade 4 » à « Grade Spécial ». Flèche ↑/↓. « Pas de grade » n'a jamais de flèche. |
| Affiliation | École de Tokyo, École de Kyoto, Faction des fléaux, Shibuya, Culling Game, Autre |
| Clan | Zen'in, Kamo, Gojo ou Aucun |
| Arc | Arc de première apparition, de *Jujutsu Kaisen 0* à *Modulo*. Flèche = plus tôt ou plus tard dans l'histoire. |
| Territoire | Le personnage possède-t-il une extension du territoire ? Oui / Non |
| Énergie occulte | Valeur chiffrée. Orange si l'écart est de 20 ou moins, flèche ↑/↓ sinon. |

CSM version: the same table built from the DB columns (Espèce, Genre, Arc, Affiliation/Camp, Pouvoir/Contrat, Statut), with a one-line description each from the copy map.

**H2 — Le personnage JJKdle d'hier**
> Hier ({mercredi 7 octobre}), il fallait trouver **{Kento Nanami}** ({Grade 1}, {École de Tokyo}). {N} joueurs l'ont trouvé, en {X,X} essais en moyenne.
> Le personnage du jour reste secret jusqu'à minuit. Pas de spoiler ici.

(Optional later: a link to "Toutes les réponses JJKdle →" `/jjk/games/jjkdle/reponses`, an archive page that is noindex until it has more than 30 entries.)

**H2 — Astuces pour trouver en moins de 5 essais**
> - Commence par un personnage « moyen » : un Grade 1 de l'École de Tokyo apparu tôt dans l'histoire. Les flèches sur Grade et Arc éliminent alors la moitié du roster d'un coup.
> - Joue le Clan et l'Affiliation tôt : une case verte sur « Zen'in » ou « Faction des fléaux » réduit fortement la liste.
> - Utilise l'Énergie occulte en dernier, pour départager les candidats qui restent.

**H2 — Questions fréquentes sur JJKdle** (visible; no FAQPage schema)
- **À quelle heure change le personnage du jour ?**
  À minuit, heure de Paris (00 h 00 en France, Belgique et Suisse ; 18 h 00 au Québec). Le compte à rebours s'affiche dès que tu as trouvé.
- **Tout le monde a-t-il le même personnage ?**
  Oui. Le personnage est le même pour tous les joueurs d'une même journée, ce qui permet de comparer vos scores.
- **Combien d'essais ai-je ?**
  Illimités. Le classement du jour range les joueurs du plus petit au plus grand nombre d'essais.
- **Faut-il un compte pour jouer ?**
  Non, JJKdle se joue sans inscription. Un compte gratuit sert seulement à apparaître dans le classement et à garder ta série de jours d'affilée 🔥.
- **Pourquoi le grade n'a-t-il pas de flèche ?**
  Si toi ou le personnage mystère êtes « Pas de grade », aucune comparaison n'est possible, donc pas de flèche.
- **JJKdle est-il un jeu officiel ?**
  Non. JJKdle est un fan-projet gratuit et non officiel, sans lien avec Gege Akutami, la Shūeisha ou MAPPA. Il contient des spoilers jusqu'à {Jujutsu Kaisen Modulo}.

**H2 — Les autres jeux « dle » d'Anime Arcade**
> Tu as trouvé ? Enchaîne avec les autres personnages du jour : [CSMdle (Chainsaw Man)](/csm/games/csmdle) · [AOTdle (L'Attaque des Titans)](/aot/games/aotdle) · [KNYdle (Demon Slayer)](/kny/games/knydle) · [TGdle (Tokyo Ghoul)](/tg/games/tgdle) · [Bleachdle](/bleach/games/bleachdle) · [Tous les jeux Jujutsu Kaisen →](/jjk/games)

(Use the French or common series names "L'Attaque des Titans" and "Demon Slayer" in the anchors. French players search for those as well as AOT/KNY.)

**Empty-leaderboard copy** (replaces "Personne n'a encore trouvé le perso du jour — sois le premier !" in SSR):
`Classement du jour : sois parmi les premiers à trouver le personnage n°{N}.`

### 6.4 Implementation notes (from reading the code)
- **Reset time:** `lib/games/jjkdle/daily.ts` uses `TIMEZONE = "Europe/Paris"` and `todayKey()`, so the "minuit, heure de Paris" claim is accurate. Render the date with `Intl.DateTimeFormat("fr-FR", {timeZone: "Europe/Paris", dateStyle: "full"})`.
- **Yesterday's character:** compute `yesterdayKey` in Europe/Paris and call **`pickDailyTarget(yesterdayKey, eligibleRoster(roster, schema))` directly. Do not use `resolveDailyTarget`.** That function applies the admin `forcedTarget` override to any date, so it would show today's forced target as "yesterday".
  - Caveat: the eligible pool is sorted by id and filtered on completeness. If a character is added or completed today, re-picking yesterday's key can return a different character than the one actually played. The robust fix is to persist each day's answer (`DailyAnswer{universe,date,characterId}`), either from the existing `app/api/cron/daily-digest` cron or lazily on the first request of the day, and read yesterday from that table.
- **Puzzle number:** `N = days between {universe launch date} and todayKey + 1`, using a per-universe launch-date constant.
- **"Trouvé par N joueurs / X essais en moyenne":** aggregate on `JjkdleScore` for `date = yesterdayKey` in the current universe. Hide the line if N < 3.
- **Attribute table:** `schema.columns` is already passed to the client as `columns`. Render the same array server-side. Keep explanations in a `DLE_GUIDE_COPY[universeId][attributeKey]` map, with a fallback to the plain label.
- **Fix `← Back` → `← Retour aux jeux`** (`JJKdleGame.tsx:257`).
- **Slugs:** `/csm/games/csmdle` and the other universe slugs, with 301s from `/…/games/jjkdle` and updated canonical, sitemap and internal links. Do this before the new links in the "autres dle" block go live, so they point at the final URLs.
- **Schema:** keep VideoGame. Add BreadcrumbList (Accueil › JJK Arcade › Jeux › JJKdle). **No FAQPage.**

---

## 7. Prioritized recommendations (PM)

1. **(HIGH) Ship the server-rendered "Comment jouer" block + status strip + "Personnage d'hier"** on all 6 dle pages (section 6). This is the biggest remaining lever: Content Depth +6-8, Answer Seeker persona 26 → ~60, and it claims the uncontested French niche. Expected `/jjk/games/jjkdle` score: ~66.
2. **(HIGH) Universe slugs + titles**: `/csm/games/csmdle` etc. with 301s; titles "{X}dle — Devine le personnage {Série} du jour (FR)".
3. **(HIGH) Qui est-ce guest play**: nickname-only lobby via a share link. Add SSR rules (3 steps) and a static preview of 6-8 roster cards. Title "Qui est-ce ? Jujutsu Kaisen — jeu 1v1 en ligne gratuit", H1 "Qui est-ce ? version Jujutsu Kaisen".
4. **(HIGH) Pyramid**: dedupe the `<title>`, description and robots tags after hydration (head metadata is probably also emitted by a client component), translate the 7 English UI strings, and retarget the title and meta to "classement personnages Jujutsu Kaisen (jeu)" rather than "tier list". A real tier-list maker remains the only way to win "tier list jujutsu kaisen".
5. **(MEDIUM) Remove "quiz" (and "tier list") from the meta on `/` and `/jjk`** until those formats exist.
6. **(MEDIUM) `/dle` hub**, plus "dle" in the home H1 ("Anime Arcade — jeux dle et mini-jeux anime gratuits en français"), plus direct links from `/` to the 6 dle games.
7. **(LOW) BreadcrumbList on game pages**; an About page; a custom domain over time.

## Cross-skill referrals
- `/seo content`: final French copy review, E-E-A-T and an About page.
- `/seo schema`: BreadcrumbList on 54 game URLs; verify VideoGame. Do not add FAQPage.
- `/seo page`: thin SSR content on the 36 game URLs after the guide ships.
- `/seo local`: not needed (no local intent).

## Limitations
- WebSearch is not google.fr. Positions, PAA, AI Overview, ads and featured snippets were not observable. The competitor list is reused from the baseline, and only 2 French-variant queries were re-run.
- Our domain did not appear for the French dle queries in the search tool, so indexation and ranking could not be confirmed. Check GSC.
- No search volume, GSC or click data. Persona weights are qualitative.
- CSM attribute labels for the first 5 columns live only in the DB (created via /admin). The CSM table in 6.3 is indicative; generate it from `schema.columns`.
- The scores are evidence-based estimates on the same rubric as the baseline. A +2 site change is within scoring noise for individual dimensions.
- The client-only "?" help content, Core Web Vitals and tap targets were not assessed.

Generate a PDF report? Use `/seo google report`.

---

## Structured findings (audit-data.json → "Search Experience")
```json
{
  "category": "Search Experience",
  "sxo_gap_score": {"site_weighted": 44, "baseline_am": 42, "jjk_jjkdle": 50, "csm_jjkdle": 47, "jjk_guesswho": 40, "jjk_ranking": 35, "home": 35, "jjk_hub": 58},
  "resolved_since_baseline": [
    "sxo-01: non-JJK dle and guesswho meta/OG descriptions now universe-specific",
    "sxo-03 (partial): SSR H1 present on all dle pages and Pyramid"
  ],
  "findings": [
    {"id": "sxo-03", "severity": "high", "title": "Dle pages still bare Tool: 71 SSR words, no rules/attribute legend/FAQ (competitors 200-750)", "urls": ["/*/games/jjkdle"], "fix": "SSR Comment jouer block, see section 6"},
    {"id": "sxo-07", "severity": "high", "title": "No puzzle number, date, reset time or yesterday's character in SSR; Answer Seeker persona 26/100", "urls": ["/*/games/jjkdle"]},
    {"id": "sxo-04", "severity": "high", "title": "Non-JJK dle URLs still use 'jjkdle' slug; titles lack series name", "urls": ["/csm|aot|kny|tg|bleach/games/jjkdle"]},
    {"id": "sxo-05", "severity": "high", "title": "Qui est-ce still login-gated; generic H1/title", "urls": ["/*/games/guesswho"]},
    {"id": "sxo-02", "severity": "critical", "title": "Pyramid: duplicate title/description/robots after hydration, English UI, wrong format for 'tier list' intent", "urls": ["/*/games/ranking"]},
    {"id": "sxo-06", "severity": "high", "title": "Meta descriptions on / and /jjk promise 'quiz' that does not exist", "urls": ["/", "/jjk"]},
    {"id": "sxo-08", "severity": "medium", "title": "No French dle hub; home H1 lacks 'dle'; no direct dle links from /", "urls": ["/"]},
    {"id": "sxo-09", "severity": "medium", "title": "Empty-leaderboard text server-rendered; '← Back' in English", "urls": ["/*/games/jjkdle"]},
    {"id": "sxo-10", "severity": "low", "title": "No BreadcrumbList on game pages", "urls": ["/*/games/*"]}
  ],
  "personas": {"answer_seeker": 26, "trivia_quiz_taker": 34, "power_scaling_debater": 43, "friends_1v1": 47, "multi_dle_collector": 47, "csm_fan": 60, "fr_daily_player": 70},
  "competitors": ["jjkdle.com", "jjkdle.net", "jjk.guide", "jujutsudle.com", "dlegames.org", "jujutkdle.org", "csmdle.com", "chainsawdle.net", "chainsawmandle.com", "animedle.org", "csm.guide", "mangadle.net", "tiermaker.com", "jetpunk.com", "allocine.fr", "crazygames.com"],
  "opportunity": "French-language dle SERP still shows no dle game (ours included); SSR French how-to + daily answer content is the main lever."
}
```

Sources: baseline sources in `../baseline-am/findings/sxo.md`; PM re-check queries returned [Vikidia Jujutsu Kaisen](https://fr.vikidia.org/wiki/Jujutsu_Kaisen), [Dexerto FR JJK descriptions](https://www.dexerto.fr/anime/jujutsu-kaisen-nouvelles-descriptions-officielles-personnages-majeurs-1547142/), [Vikidia Chainsaw Man](https://fr.vikidia.org/wiki/Chainsaw_Man), [Fnac L'Éclaireur CSM VF](https://leclaireur.fnac.com/article/185287-chainsaw-man-enfin-disponible-en-vf-sur-crunchyroll/), with no dle results.
