# Content Quality / E-E-A-T: jjkdle-arcade.vercel.app

Audit date: 2026-10-08. Data: `pages.json` (69 URLs crawled), plus Playwright renders of `/tg/games/tower` and `/kny/games/jjkdle`, `metadata_template.py` run across all 69 title/description pairs, 5-word-shingle Jaccard similarity across universes, and source checks in the repo.

## Scores

| Metric | Score |
|---|---|
| **Content Quality (overall)** | **36 / 100** |
| E-E-A-T composite (internal weights) | 32 / 100 |
| - Experience (20%) | 45: original game mechanics, live leaderboards, daily tower. No creator story, no changelog |
| - Expertise (25%) | 30: no author or creator page. JJK wording leaks into the other 5 universes (accuracy errors) |
| - Authoritativeness (25%) | 20: `vercel.app` subdomain, no About page, no external references |
| - Trustworthiness (30%) | 35: fan disclaimer and cookie manager are present. No mentions légales or privacy page, Contact only opens a modal, and the "sans compte" claims are false |
| AI citation readiness | 22 / 100 |
| Readability (FR) | Good, around 70 (estimated Kandel-Moles score, "facile"). Uses the informal "tu", sentences are short, and the mixed French/English wording hurts it |

## 1. Thin content by page type (server-rendered words)

| Page type | Count | Words | Floor used | Result |
|---|---|---|---|---|
| `/` universe picker | 1 | 85 | 500 (homepage) | **FAIL** |
| `/{u}` hub | 6 | 522-529 | 500 | Pass on count, but about 60% of the text is the 9 game-card blurbs, repeated word for word on `/{u}/games` |
| `/{u}/games` list | 6 | 449-459 | about 400 (category) | Borderline. Its content is the same as the hub's |
| `/{u}/games/*` game pages | 54 | 38-117 (median about 75) | 300 (product-like) | **54 / 54 FAIL** |
| `/casino` | 1 | 54 | n/a | Thin |
| `/login` | 1 | 50 | n/a | Indexable and reuses the `/jjk` meta description. Should be **noindex** |

Weakest pages: every `ranking` page (38-63 words) and every `jjkdle` page (55 words). On jjkdle the only text is "Devine le personnage mystère du jour" plus an empty leaderboard. The rules for Tower (`components/tower/TowerRules.tsx`) and the general tutorial (`components/TutorialButton.tsx`, the "?" button in the footer) exist only in client-side modals, so crawlers never see them.

## 2. Cross-universe template duplication / doorway risk: MEDIUM-HIGH

5-shingle Jaccard similarity of the page text against the JJK version (footer included):

| Template | Similarity vs JJK |
|---|---|
| tower | 0.90 (all 5) |
| guesswho | 0.87 |
| battle | 0.79 |
| codenames | 0.78 |
| jjkdle | 0.67 |
| higher-lower | 0.51-0.59 |
| builder / ranking / draft | 0.32-0.47 |
| hub | 0.32-0.37 |
| list | 0.40-0.45 |

The 18 multiplayer lobby pages (battle, guesswho, codenames × 6) are login-walled, around 71-84 words each, and differ only by the universe abbreviation. Together with the 6 tower pages they match the "many near-identical pages, only the keyword swapped" pattern. Each universe does have its own roster, so these are not classic doorway pages, but none of that roster data appears in server HTML.

**JJK wording leaks into the body text of non-JJK pages (new finding, beyond the known meta issue):**
- All 5 non-JJK tower pages: the heading and leaderboard label say **"The Culling Tower"**, and the intro says **"Trois sorciers"** (rendered on `/tg/games/tower` with Tokyo Ghoul characters). The page titles say "La Tour de Cochlea" etc. Hardcoded in `app/[universe]/games/tower/TowerGame.tsx:135,300`, `components/leaderboard/TowerLeaderboard.tsx:47`, `components/tower/TowerRules.tsx:94`, `components/tower/ShareRun.tsx:45-50`, `app/[universe]/games/tower/page.tsx:40-41`, and `app/og/tower/route.tsx:77`.
- All 5 non-JJK draft pages: "Draft 1 **sorcier** par catégorie" (`app/[universe]/games/jujutsu-draft/JujutsuDraftGame.tsx:151`).
- Meta descriptions (already known) are hardcoded in `app/[universe]/games/{battle,guesswho,codenames,jjkdle}/page.tsx`. The jjkdle description promises hints "race, grade, clan, arc", but KNY actually uses Espèce/Genre/Affiliation/Grade/**Souffle**/Statut/Arc/Puissance (`lib/universes/kny-attributes.ts`). That is a factual inaccuracy.
- The `jjkdle` and `jujutsu-draft` URL slugs appear under `/csm/`, `/kny/` and the other universes. This is a minor relevance mismatch: keep the slugs and add redirects only if you rename them.

Other duplicate descriptions: `ranking` ×6 identical; `higher-lower` ×4 identical (csm/aot/kny/tg); `jujutsu-draft` tg = bleach; `/login` = `/jjk`.

`metadata_template.py` (site-wide): `site_risk: low`, `templated_ratio: 0`, `shared_cta_phrases: {}`. There is no stock CTA templating. The problem is verbatim duplication, not title-echo templating.

## 3. E-E-A-T and trust gaps

1. **No About / "Qui sommes-nous" page.** Nobody is named as the creator, and there is no motivation or project history. Add a short creator page that covers who makes the site, why, since when, how character data is sourced and checked, and how to report an error.
2. **No mentions légales and no privacy policy page.** For a French site, the LCEN requires the publisher to be identified. Accounts, leaderboards and cookies make a crawlable privacy policy necessary. "Gérer les cookies" is a button only.
3. **Contact is a `<button>` that opens a modal** (`ContactButton`) and has no crawlable URL. Add a `/contact` page, or at least a mailto link or form address in HTML.
4. **Disclaimer wording.** "Fan-projet non officiel · aucun asset copyrighté" (`components/SiteFooter.tsx:50`) is good to have, but "aucun asset copyrighté" is a legal claim that is hard to defend: character names and likenesses are protected. Use the standard wording: *« Projet de fan non officiel, non affilié à Shueisha, Kōdansha, MAPPA, ufotable… Jujutsu Kaisen © Gege Akutami / Shueisha, … Tous droits réservés à leurs ayants droit. »*
5. **Inaccurate "sans compte" claims.** The descriptions for `/`, the hubs, `/games` and jjkdle say "Sans compte" / "0 compte requis". Battle, guesswho and codenames say "Connecte-toi pour créer ou rejoindre un lobby", and the homepage itself advertises "Un seul compte". Mark which games need an account ("Compte requis pour le multijoueur").
6. **Casino** (blackjack, roulette, slots, pile ou face with coins) on an anime fan site that is likely used by minors. No real-money payment was found in the code, so state it on the page: *« Monnaie virtuelle sans valeur réelle, impossible à acheter ou à retirer. »* Consider adding an age notice and noindexing `/casino/*`.
7. **User-generated usernames** in server-rendered leaderboards (e.g. "GROKAKAKIPU") link to `/{u}/u/{name}` profiles. Make sure moderation is in place, and noindex thin profile pages.

## 4. Readability (French audience)

- Strengths: short sentences, direct informal "tu", lively brand voice ("libérer ton énergie maudite").
- **Mixed French/English UI:** "← Back", "Leaderboard", "All-time", "Best score local", "Best Rank", "Top Ranks", "guess", "Build the Perfect Sorcerer", "Random Battle", "Higher/Lower". Use French equivalents ("Retour", "Classement", "Depuis toujours", "Meilleur score"). The English game titles can stay as brand names, but add a French subtitle (e.g. « Build the Perfect Sorcerer : crée ton sorcier idéal »).
- Missing spaces between text nodes: H1 "Choisis **tonunivers**" (`/`) and "**Lecasino**" (`/casino`).
- Decorative CJK glyphs (呪術廻 領域展開 …) show up as hub body text. Add `aria-hidden="true"` so they stay out of extracted text and screen readers.

## 5. What each game page should carry (server-rendered, below the game, about 250-450 words)

Write a shared skeleton per game, but fill it with **universe-specific data from the existing registries** (`lib/universes/*-attributes.ts`, `*-categories.ts`, `*-items.ts`, roster DB):

1. **H1** with universe and game: « KNYdle : devine le personnage Demon Slayer du jour ».
2. **Intro (40-60 words):** what the game is in one or two sentences, solo or multiplayer, and whether an account is needed.
3. **« Comment jouer »:** 3-5 numbered steps.
4. **« Règles et score »:** attempts, points (Pyramid 4 tentatives / 10 000 pts; Builder /1000 with grade scale; Higher/Lower chain; Tower 20 étages, escouade de 3, "un mort reste mort").
5. **Universe-specific facts:**
   - jjkdle: the list of hint attributes with what each means (e.g. KNY "Souffle"), the **number of characters in the roster**, and the reset time **« Nouveau personnage chaque jour à minuit (heure de Paris) »** (`lib/games/jjkdle/daily.ts` uses Europe/Paris). Optionally add yesterday's answer for engagement and freshness.
   - tower: the daily reset time with timezone (currently only "à minuit"), floor count, how the leaderboard ranks players.
   - builder / draft: category names for that universe and the grade scale (Grade 4 to S for JJK; equivalents for other universes).
   - battle / guesswho / codenames: number of players, grid size (25 / 36), how to invite a friend, and that an account is required.
6. **Spoiler notice:** « Contient des personnages jusqu'à l'arc X ». This is a real trust signal for anime fans.
7. **« Questions fréquentes »** as plain visible HTML (`<details>` or H3 plus a paragraph), with 3-5 questions: Faut-il un compte ? À quelle heure change le perso ? Combien de personnages ? Mes scores sont-ils sauvegardés ? Do **not** add FAQPage schema: the rich result was retired in May 2026. The text is still useful for users and for AI answer extraction.
8. **« Mis à jour le … »** line tied to roster or data changes, plus links to 2-3 related games in the same universe.

The hub (`/{u}`) and `/games` pages should stop repeating the same 9 blurbs. Give the hub an original universe intro (around 150 words: which characters and arcs are covered, roster size, what is new). Keep `/games` as the catalogue.

Homepage (`/`, 85 words): add about 300-400 words covering what Anime Arcade is, the 6 universes with roster counts, the daily games and their reset time, the account and XP system, and the fan disclaimer.

## 6. AI citation readiness: 22/100

The site has no quotable facts in HTML: no roster sizes, reset times, rules or dates. `VideoGame` and `ItemList` JSON-LD help a little. The heading hierarchy is broken on 36 game pages (no H1). The sitemap has `lastmod` on only 6 of 67 URLs, all equal to the crawl date, which suggests they are generated at request time and are not a reliable freshness signal. Adding the section 5 blocks with concrete numbers would raise this the most.

## 7. Prioritised actions

| # | Severity | Action |
|---|---|---|
| 1 | Critical | Remove JJK wording from non-JJK pages: tower title/intro/leaderboard/share/OG, draft "sorcier", and the 4 hardcoded meta descriptions. Use per-universe labels from the registry |
| 2 | High | Add 250-450 words of server-rendered, universe-specific "Comment jouer / Règles / Personnages / Réinitialisation / FAQ" text to all 54 game pages, starting with jjkdle and tower in each universe |
| 3 | High | Add About, Mentions légales, Politique de confidentialité and a crawlable Contact page, and link them in the footer |
| 4 | High | Fix the "sans compte" claims and state which games need an account |
| 5 | Medium | Until the multiplayer lobbies (18 pages) get unique content, consider `noindex` on them. Noindex `/login`, `/register` and thin `/u/*` profiles |
| 6 | Medium | Reword the fan disclaimer with rights-holder credits. Add a virtual-currency notice to the casino |
| 7 | Medium | Give each hub its own intro text instead of repeating the game blurbs. Expand the homepage to about 400 words |
| 8 | Low | Translate the remaining English UI to French. Fix "tonunivers"/"Lecasino". Add `aria-hidden` to decorative CJK |
| 9 | Low | Base sitemap `lastmod` on real data changes. Show « Mis à jour le » on game pages |

## Structured findings (audit-data.json, category "Content Quality")

```json
{
  "category": "Content Quality",
  "score": 36,
  "eeat": {"experience": 45, "expertise": 30, "authoritativeness": 20, "trustworthiness": 35, "composite": 32},
  "ai_citation_readiness": 22,
  "metadata_template": {"site_risk": "low", "templated_ratio": 0, "shared_cta_phrases": {}},
  "findings": [
    {"id": "content-jjk-leak-body", "severity": "critical", "pages": 10, "detail": "'The Culling Tower'/'Trois sorciers' on 5 non-JJK tower pages; 'Draft 1 sorcier' on 5 non-JJK draft pages"},
    {"id": "content-thin-game-pages", "severity": "high", "pages": 54, "detail": "38-117 server-rendered words (median ~75); rules exist only in client modals"},
    {"id": "content-cross-universe-duplication", "severity": "high", "pages": 54, "detail": "tower 0.90, guesswho 0.87, battle 0.79, codenames 0.78, jjkdle 0.67 Jaccard vs JJK; doorway-like pattern"},
    {"id": "content-duplicate-meta", "severity": "high", "pages": 34, "detail": "ranking x6, battle/guesswho/codenames/jjkdle x6 (JJK-worded), higher-lower x4, draft tg=bleach, login=jjk"},
    {"id": "eeat-no-about-legal-privacy", "severity": "high", "pages": "site", "detail": "No About, mentions légales, privacy policy; Contact is a modal button only"},
    {"id": "trust-false-no-account-claim", "severity": "high", "pages": 22, "detail": "'Sans compte' in meta/hubs while multiplayer games require login"},
    {"id": "content-thin-homepage", "severity": "medium", "pages": 1, "detail": "85 words vs 500 floor"},
    {"id": "content-hub-list-overlap", "severity": "medium", "pages": 12, "detail": "Hub and /games repeat the same 9 game blurbs"},
    {"id": "trust-disclaimer-wording", "severity": "medium", "pages": "site", "detail": "'aucun asset copyrighté' claim; no rights-holder credits"},
    {"id": "trust-casino-virtual-currency", "severity": "medium", "pages": 5, "detail": "No virtual-currency / no-real-money notice"},
    {"id": "content-factual-dle-attributes", "severity": "medium", "pages": 5, "detail": "Meta promises 'race, grade, clan, arc' hints; e.g. KNY uses Souffle/Affiliation/Statut"},
    {"id": "readability-franglais", "severity": "low", "pages": "site", "detail": "Back, Leaderboard, All-time, Best score local, Top Ranks; 'tonunivers', 'Lecasino' spacing bugs"},
    {"id": "freshness-no-reset-tz", "severity": "low", "pages": 12, "detail": "Daily reset says 'minuit' with no timezone (Europe/Paris in code); sitemap lastmod only 6/67 and request-time"}
  ]
}
```
