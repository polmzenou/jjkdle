# Content Quality / E-E-A-T: jjkdle-arcade.vercel.app (re-audit, afternoon)

Audit date: 2026-10-08 (PM). Baseline: `baseline-am/findings/content.md` (36/100).
Data: fresh `pages.json` (69 URLs, server-rendered text), Playwright renders of `/tg/games/tower`, `/kny/games/jujutsu-draft`, `/csm/games/jjkdle`, `/aot/games/battle`, `/bleach/games/guesswho`, `/kny`, `metadata_template.py` over all 69 title/description pairs, 5-word-shingle Jaccard similarity, and repo source checks.

## Scores

| Metric | Baseline | Now |
|---|---|---|
| **Content Quality (overall)** | 36 | **45 / 100** |
| E-E-A-T composite (internal weights) | 32 | 36 |
| - Experience (20%) | 45 | 45: original mechanics, live leaderboards, daily tower. Still no creator story or changelog |
| - Expertise (25%) | 30 | 42: JJK wording leaks fixed and meta hint lists now match each universe (KNY: "espèce, souffle, grade, arc"). One counter label still leaks (see below). Still no author |
| - Authoritativeness (25%) | 20 | 20: `vercel.app` subdomain, no About page, no external references |
| - Trustworthiness (30%) | 35 | 38: accurate per-universe metadata, `/login` and `/casino` now noindex. Still no mentions légales or privacy page, Contact is still a modal, and the "sans compte" claims remain |
| AI citation readiness | 22 | 28 / 100 |
| Readability (FR) | about 70 | about 70 (estimated Kandel-Moles score, "facile"). Spacing bugs fixed. Mixed French/English UI unchanged |

## Fixed since baseline

| Baseline finding | Status | Evidence |
|---|---|---|
| "The Culling Tower" / "Trois sorciers" on 5 non-JJK tower pages | **Fixed** | Server H1 and leaderboard use the universe name (La Tour de Cochlea, La Forteresse Infinie, La Tour de Wall Maria, La Tour de Réincarnation, La Tour du Repentir). The rendered `/tg/games/tower` reads "Trois personnages…". No "Culling" in the visible text of any non-JJK page |
| "Draft 1 sorcier" on non-JJK draft pages | **Fixed (intro)** | `/kny/games/jujutsu-draft` reads "Drafte 1 personnage par catégorie…" |
| JJK-worded meta descriptions on battle/guesswho/codenames/jjkdle × 5 | **Fixed** | Every description names its anime, e.g. "KNYdle (Kimetsu no Yaiba) : … (espèce, souffle, grade, arc…)". The factual error about attributes is gone |
| Duplicate meta (ranking ×6, higher-lower ×4, draft tg=bleach, login=jjk) | **Fixed** | 0 duplicate titles and 0 duplicate descriptions across 69 URLs |
| No H1 on 36 game pages | **Fixed** | 69/69 pages have exactly one H1 |
| "tonunivers" / "Lecasino" | **Fixed** | H1s now read "Choisis ton univers" and "Le casino" |
| `/login` indexable | **Fixed** | `noindex, nofollow`. `/casino` is now `noindex, follow` |
| Templated metadata | Still clean | `metadata_template.py`: `site_risk: low`, `templated_ratio: 0.0`, `shared_cta_phrases: {}`, 0 site flags |

Leak scan method: case-insensitive regex `jujutsu|jjk|sorcier|culling|maudit|exorcis|gojo|sukuna` over title, description, H1 and text of every non-JJK URL in `pages.json`, plus the visible DOM text of the five rendered non-JJK pages. Hits inside `href`, slugs, JSON-LD `@id` and script chunks were ignored, because the `jjkdle`/`jujutsu-draft` slugs and the `jjkdle-arcade` domain are expected.

## 1. Remaining JJK leaks (minor)

- **"Sorciers draftÉs 0 / 8"**: the budget counter on every non-JJK draft page (Hashira Draft, Kagune Draft, etc.) still uses JJK wording. It is client-rendered, so it is not in `pages.json`, but Google sees it after rendering. Source: `components/draft/DraftBoard.tsx:82`. Use the universe's unit label (« Pourfendeurs draftés », « Personnages draftés »). The "É" also looks like a typo: write "draftés" and let CSS `uppercase` handle the case.
- `/login` title "Connexion · JJK Arcade" and the "Créer un compte JJK Arcade" text sit on a shared, cross-universe login page. It is noindexed, so this is low impact. Rename it "Anime Arcade".
- Cosmetic, title and badge descriptions still say "Atteindre l'étage 10 de The Culling Tower" (`lib/titles/definitions.ts:128,135`, `lib/frames/definitions.ts:125`, `lib/badges/definitions.ts:157`). Progression is shared across universes, so these strings appear on non-JJK profiles. Low priority.

## 2. Thin content: unchanged

| Page type | Count | Server words | Floor | Result |
|---|---|---|---|---|
| `/` | 1 | 85 | 500 | **FAIL** |
| `/{u}` hub | 6 | 522-529 | 500 | Pass on count, but still mostly the 9 game blurbs shared with `/games` |
| `/{u}/games` | 6 | 449-459 | about 400 | Borderline, overlaps the hub |
| `/{u}/games/*` | 54 | 44-124 (median 79.5) | 300 | **54/54 FAIL** |

The weakest pages are `ranking` (44-69 words: "Chargement…" plus an empty leaderboard) and `jjkdle` (59-61 words: "Devine le personnage mystère du jour" only). `higher-lower` is the best of them: it is the only page with a server-rendered rules paragraph and a correct account statement ("Tu peux jouer sans compte, mais connecte-toi pour enregistrer ton score"). Use it as the model for the others.

## 3. Cross-universe similarity (5-shingle Jaccard on server text)

| Template | Baseline vs JJK | Now vs JJK | Now, pairwise among non-JJK |
|---|---|---|---|
| guesswho | 0.87 | 0.87 | 0.87 |
| battle | 0.79 | 0.79 | 0.79 |
| codenames | 0.78 | 0.78 | 0.78 |
| tower | 0.90 | **0.66-0.68** | 0.69-0.74 |
| jjkdle | 0.67 | **0.57-0.59** | 0.56-0.59 |
| higher-lower | 0.51-0.59 | 0.47-0.53 | 0.55-0.74 |
| builder / ranking / draft | 0.32-0.47 | 0.28-0.41 | 0.38-0.65 |
| list | 0.40-0.45 | 0.40-0.45 | 0.41-0.51 |
| hub | 0.32-0.37 | 0.32-0.37 | 0.34-0.41 |

Tower and jjkdle improved because their names are now universe-specific. The 18 multiplayer lobby pages did not change. They are login-walled, have exactly the same word count in all six universes (71/75/84), and differ only by the abbreviation. All six guesswho H1s are the same bare "Qui est-ce ?". The battle and codenames H1s ("KNY Random Battle") and the tower H1s ("La Forteresse Infinie") do not name the anime, while the other game H1s use the "— jeu Kimetsu no Yaiba gratuit" pattern. Make them consistent, e.g. « Qui est-ce ? Demon Slayer — jeu Kimetsu no Yaiba gratuit ». Doorway risk: **medium**, down from medium-high, but most of it is carried by these 18 pages.

## 4. E-E-A-T and trust gaps: unchanged

1. No About / "Qui sommes-nous" page. No named creator, project history, data-sourcing method or error-reporting path.
2. No mentions légales (LCEN) and no privacy policy page. The site has accounts, leaderboards, cookies and audience measurement. The cookie banner text is good ("cookies essentiels… mesure d'audience anonyme, sans publicité"), but it should link to a crawlable policy.
3. Contact is still a modal `<button>` with no URL.
4. **False "sans compte" claims persist:** 14 meta descriptions (`/`, 6 hubs, 6 `/games` lists, `/jjk/games/jjkdle`) and the body CTA of the 6 hubs ("Aucun compte, juste ton score à battre."). Battle, guesswho and codenames require login. Reuse the accurate higher-lower wording: « Jeux solo sans compte ; compte requis pour le multijoueur et les classements. »
5. Footer disclaimer "Fan-projet non officiel · aucun asset copyrighté": the "aucun asset copyrighté" part is still hard to defend legally. Replace it with rights-holder credits.
6. Casino: now noindexed, which is good. It still needs a virtual-currency notice: « Monnaie virtuelle sans valeur réelle, ni achat ni retrait. »
7. User-generated usernames in leaderboards link to `/{u}/u/{name}` profiles. Moderation and noindex on thin profiles are still recommended.

## 5. Readability / language

- English UI remains: "← Back" (24 pages), "Leaderboard" (36), "All-time" (30), "Best score local"/"Best Rank"/"Top Ranks" (6 each), "guess" (6). Tower now shows the hybrid label "Leaderboard La Tour de Cochlea". Use « Classement », « Depuis toujours », « Retour ». Note that `/csm/games/battle` already uses "← Retour aux jeux", so the wording is inconsistent across templates.
- "Speed" appears as a draft category label on KNY ("Speed / Vitesse de déplacement…"). Use « Vitesse ».
- Daily reset still says only "à minuit". Add « (heure de Paris) ».

## 6. AI citation readiness: 28/100

Better than baseline: one clean H1 on every page, and accurate, universe-specific descriptions that carry real facts (25-card / 36-card grids, 20 floors, squad of 3, 4 attempts and 10,000 points, score out of 1000). These facts are only in `<meta>` and in the hub blurbs, not in the game pages' own body text. Still missing: roster sizes, reset time with timezone, rules sections, "Mis à jour le" dates, and an About/source page that answer engines could cite.

## 7. Prioritised remaining actions

| # | Severity | Action |
|---|---|---|
| 1 | High | Add 250-450 words of server-rendered, universe-specific content to the 54 game pages: Comment jouer, Règles et score, roster size, reset time (Europe/Paris), and a visible « Questions fréquentes » block as plain HTML. Do not add FAQPage schema (rich result retired May 2026). Start with jjkdle and ranking, the thinnest pages |
| 2 | High | Add About, Mentions légales, Politique de confidentialité and a crawlable `/contact`, and link them in the footer |
| 3 | High | Correct the "sans compte" claims in the 14 descriptions and the 6 hub CTAs. State per game whether an account is required |
| 4 | Medium | Give the 18 multiplayer lobby pages unique content (universe roster sample, grid size, how to invite), or noindex them until they have it. Make the H1s name the anime (guesswho ×6, battle, codenames, tower) |
| 5 | Medium | Expand the homepage to about 400 words. Give hubs an original universe intro instead of the repeated blurbs |
| 6 | Medium | Rights-holder disclaimer wording. Virtual-currency notice on the casino |
| 7 | Low | Fix "Sorciers draftÉs" (`components/draft/DraftBoard.tsx:82`), the `/login` "JJK Arcade" branding, and the "The Culling Tower" strings in titles, badges and frames |
| 8 | Low | Translate the English UI (Back, Leaderboard, All-time, Best score, Speed). Add the timezone to "minuit" |

## Structured findings (audit-data.json, category "Content Quality")

```json
{
  "category": "Content Quality",
  "score": 45,
  "baseline_score": 36,
  "eeat": {"experience": 45, "expertise": 42, "authoritativeness": 20, "trustworthiness": 38, "composite": 36},
  "ai_citation_readiness": 28,
  "metadata_template": {"site_risk": "low", "templated_ratio": 0.0, "shared_cta_phrases": {}, "pages_checked": 69},
  "fixed_since_baseline": [
    "content-jjk-leak-body (tower title/intro/leaderboard, draft intro)",
    "content-duplicate-meta (0 duplicate titles/descriptions)",
    "content-factual-dle-attributes",
    "missing-h1 (69/69 have one H1)",
    "readability spacing bugs (tonunivers, Lecasino)",
    "login/casino noindex"
  ],
  "findings": [
    {"id": "content-thin-game-pages", "severity": "high", "pages": 54, "detail": "44-124 server words (median 79.5); 54/54 below the 300 floor; rules only in client modals"},
    {"id": "eeat-no-about-legal-privacy", "severity": "high", "pages": "site", "detail": "No About, mentions légales, privacy policy; Contact is a modal button"},
    {"id": "trust-false-no-account-claim", "severity": "high", "pages": 20, "detail": "'Sans compte' in 14 meta descriptions and 'Aucun compte' CTA on 6 hubs; multiplayer requires login"},
    {"id": "content-cross-universe-duplication", "severity": "medium", "pages": 18, "detail": "guesswho 0.87, battle 0.79, codenames 0.78 Jaccard, identical across all 6 universes; tower improved 0.90->0.67, jjkdle 0.67->0.58"},
    {"id": "content-h1-missing-anime-name", "severity": "medium", "pages": 24, "detail": "guesswho H1 'Qui est-ce ?' x6 identical; battle/codenames/tower H1s omit the anime name"},
    {"id": "content-thin-homepage", "severity": "medium", "pages": 1, "detail": "85 words vs 500 floor"},
    {"id": "content-hub-list-overlap", "severity": "medium", "pages": 12, "detail": "Hub and /games repeat the same 9 blurbs"},
    {"id": "trust-disclaimer-wording", "severity": "medium", "pages": "site", "detail": "'aucun asset copyrighté'; no rights-holder credits"},
    {"id": "trust-casino-virtual-currency", "severity": "medium", "pages": 1, "detail": "No virtual-currency notice (page now noindex)"},
    {"id": "content-jjk-leak-residual", "severity": "low", "pages": 6, "detail": "'Sorciers draftÉs' counter on non-JJK draft pages (components/draft/DraftBoard.tsx:82); /login 'JJK Arcade'; 'The Culling Tower' in shared title/badge/frame strings"},
    {"id": "readability-franglais", "severity": "low", "pages": "site", "detail": "Back x24, Leaderboard x36, All-time x30, Best score/Best Rank/Top Ranks x6, 'Speed' draft category"},
    {"id": "freshness-no-reset-tz", "severity": "low", "pages": 12, "detail": "'Remise à zéro à minuit' with no timezone; no 'Mis à jour le'"}
  ]
}
```
