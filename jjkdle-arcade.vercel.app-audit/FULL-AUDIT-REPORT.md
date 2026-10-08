# SEO Audit — jjkdle-arcade.vercel.app ("Anime Arcade")

**Date:** 2026-10-08 · **Scope:** 69 URLs (67 sitemap + /casino + /login), source code cross-checked in this repo · **Business type:** Browser-game / fan entertainment site (closest to *Publisher*; not SaaS, local or e-commerce) · **Market:** France, French-language

## SEO Health Score: **56 / 100**

| Category | Weight | Score | Weighted |
|---|---|---|---|
| Technical SEO | 22% | 72 | 15.8 |
| Content Quality | 23% | 36 | 8.3 |
| On-Page SEO | 20% | 52 | 10.4 |
| Schema / Structured Data | 10% | 62 | 6.2 |
| Performance (CWV, lab) | 10% | 76 | 7.6 |
| AI Search Readiness | 10% | 45 | 4.5 |
| Images | 5% | 60 | 3.0 |
| **Total** | | | **55.8** |

Out-of-score diagnostics: SXO gap 42/100 · Visual/mobile 66/100 · Agent-UX heuristic 100/100 (Lighthouse Agentic X/N not measurable — PSI quota).

**Data limits:** no Google Search Console / CrUX / GA4 credentials, so no field CWV, impressions or indexation data; PSI API was rate-limited (local Lighthouse lab runs used instead); competitor SERPs via generic web search, not google.fr.

---

## Executive summary

The technical foundation is genuinely good — SSR Next.js, clean canonicals, honest sitemap, correct noindex handling, strong security headers. What holds the site back is **content and multi-universe templating**: the site was built JJK-first and the other five anime inherited JJK text in places search engines read first (meta descriptions, game body copy), every game page is ~40–120 words of game UI with no H1, and the brand/entity is split between "Anime Arcade" and "JJK Arcade". The French "dle" niche looks uncontested (all competitor dle sites found are English-only), so fixing on-page relevance has unusually high upside.

### Top 5 issues
1. **JJK text on non-JJK pages** — meta/OG descriptions of `jjkdle`, `battle`, `guesswho`, `codenames` are hard-coded JJK strings shown on all 5 other universes (20 pages; CSMdle's snippet says *"le jeu du jour Jujutsu Kaisen"*). Body copy also leaks: every non-JJK tower page shows "The Culling Tower"; every non-JJK draft page says "Draft 1 sorcier".
2. **Thin game pages, no H1** — 54/54 game pages have 38–117 words of server-rendered text (median ~75); 36 have no `<h1>`. Rules exist only in client-side modals. Cross-universe text similarity 0.67–0.90 → doorway-like templating.
3. **Soft-200s** — `/favicon.ico`, `/anything.png` etc. return the JJK landing with 200 (unknown `[universe]` slug not validated); no favicon exists.
4. **Fragmented entity/brand** — 7 `WebSite` + 7 `Organization` entities, manifest says "JJK Arcade" sitewide, `/csm/games/jjkdle` slugs, JJK logo as platform logo, `*.vercel.app` host named "jjkdle".
5. **Mobile UX & LCP** — cookie banner covers ~50 % of a 375×812 viewport over the primary CTAs; mobile LCP 4.2–6.5 s (6 logo preloads ≈ 830 KB on `/`; builder CLS 0.397).

### Top 5 quick wins
1. Delete the 4 hard-coded JJK `seoDescription` strings and template from universe config (~30 min).
2. Validate `params.universe` → `notFound()`; add `app/favicon.ico` (~20 min).
3. Remove duplicate `<SiteJsonLd />` from `app/[universe]/page.tsx` (~2 min).
4. Keep one logo preload, resize logos to display size (~1 h).
5. `noindex` `/casino`; un-block `/login` `/register` in robots.txt (~10 min).

---

## Technical SEO — 72
**Works:** 67/67 sitemap URLs 200 + self-canonical; HTTPS/HSTS preload; 308 for http and trailing slash; preview deploys `Disallow: /`; private routes `noindex` and crawlable; real 404 under universes; CSP, XFO, nosniff; GSC verified.

| Sev | Finding | Evidence / fix |
|---|---|---|
| High | Soft-200 for root paths with static extensions | `/favicon.ico`, `/nothing.png` → 200 HTML, `index,follow`, canonical `/jjk`. Middleware matcher skips them → `app/[universe]` renders with slug `favicon.ico`. Validate slug + add favicon. |
| Medium | Root files redirected into `/jjk` | `/llms.txt`, `/.well-known/*` → 307 → 404. Add to `UNIVERSE_FREE_PREFIXES` and matcher exclusions. |
| Medium | No HTML caching, US origin | `private, no-store`, `X-Vercel-Cache: MISS`, function `iad1` vs FR users. Set region `cdg1`; static/ISR for hub, landings, `/games`. |
| Medium | `/casino` indexable, thin | 54 words, title "Casino", gambling theme on a teen-audience site. `noindex`. |
| Low | `/login` robots-blocked + noindex + canonical `/jjk` | Google can't read the noindex. Unblock, drop canonical override. |
| Low | Manifest JJK-branded for whole domain | Use `hubSeo()` in `app/manifest.ts`. |
| Info | `*.vercel.app` host | Custom domain is the biggest long-term authority lever; migrate before link building, bundle with slug changes. |
| Info | CSP whitelists `*.rule34.xxx` sitewide | Only admin uses it; scope CSP to `/admin`. |

## Content Quality — 36
E-E-A-T 32 (Exp 45 · Expertise 30 · Authority 20 · Trust 35). Readability good (short, informal French), but mixed FR/EN UI ("Back", "Leaderboard", "All-time", "Your Ranking").
- **Critical:** JJK body copy on other universes (tower: `TowerGame.tsx`, `TowerLeaderboard.tsx`, `TowerRules.tsx`, `ShareRun.tsx`, `app/og/tower/route.tsx`; draft: `JujutsuDraftGame.tsx:151`). JJKdle meta promises "race, grade, clan, arc" but KNY uses Souffle/Affiliation/Statut.
- **High:** all game pages thin; add 250–450 words SSR per page: H1, *Comment jouer*, rules/scoring, roster size & hint attributes, reset *minuit (heure de Paris)*, account requirement, 3–5 visible Q&As (no FAQPage schema — retired), "Mis à jour le".
- **High:** doorway-like duplication across universes (similarity vs JJK: tower 0.90, guesswho 0.87, battle 0.79, codenames 0.78, dle 0.67).
- **High:** no About / Mentions légales (legally required for a French site) / privacy page; Contact is a modal with no URL.
- **High:** "Sans compte / 0 compte requis" is false for multiplayer games (Qui est-ce ? requires login).
- **Medium:** homepage 85 words; hubs repeat `/games` blurbs; "aucun asset copyrighté" — credit rights-holders instead; casino lacks "virtual coins, no real value" notice; "quiz" promised in meta but no quiz game exists.

## On-Page SEO — 52
**Works:** unique titles ≤ 60 chars on all 69 URLs; OG/Twitter everywhere; universe hubs have a strong H1 and ~520 words; clean hub → universe → games → game linking.
- **High:** 20 wrong-anime meta descriptions (see top issue 1) — `app/[universe]/games/{jjkdle,battle,guesswho,codenames}/page.tsx`.
- **Medium:** identical descriptions — ranking ×6, higher-lower ×4, draft TG = Bleach, `/login` = `/jjk`.
- **Medium:** 36 game pages with no H1 (builder, ranking, draft, dle, higher-lower, tower ×6).
- **Medium:** JJK slugs on every universe (`/csm/games/jjkdle`, `/bleach/games/jujutsu-draft`).
- **Low:** 50/69 descriptions > 160 chars; homepage visible H1 is just "Choisis ton univers" (sr-only text missing a space: "tonunivers", also "Lecasino"); 13 pages without og:image (`/{u}/games`, `/{u}/games/tower`, `/casino`).
- **Opportunity:** titles don't say "en français"/"FR" — the differentiator vs English competitors; no `/dle` cross-universe hub.

## Schema — 62
Valid JSON-LD everywhere: hub WebSite+Org, landing WebSite+Org, `/games` Breadcrumb+ItemList, game VideoGame+Offer.
- **Medium:** landing pages emit WebSite+Org twice (`app/[universe]/page.tsx:39` + `UniverseChrome jsonLd`).
- **Medium:** 7 WebSites / 7 Organizations on one host; no `sameAs`; platform logo = JJK logo (730 KB). Consolidate: one Org + WebSite at `/`, universes as `CollectionPage` `isPartOf` it, games' `publisher` → `/#organization`.
- **Low:** no BreadcrumbList on game pages; `genre: "Anime fan game"` → real genres; add `playMode`. VideoGame isn't rich-result eligible without genuine ratings — don't fabricate.

## Performance — 76 (lab, Lighthouse 12.8.2)
| URL | Mobile | LCP | CLS | TBT | Desktop |
|---|---|---|---|---|---|
| / | 75 | 4.9 s | 0 | 69 ms | 97 |
| /jjk | 84 | 4.2 s | 0 | 110 ms | 99 |
| /jjk/games/jjkdle | 91 | 3.3 s | 0 | 88 ms | 100 |
| /jjk/games/builder | 57 | 6.5 s | 0.397 | 69 ms | 96 |

INP not lab-measurable; TBT suggests likely-good INP (unverified). Issues: 6 concurrent logo preloads (~830 KB) + opacity-0 entrance animations delay text LCP; builder grid layout shift + late `/api/characters/…/image` LCP; 144 KB logo used for a 44 px header icon without dimensions; no HTML caching / bfcache fail; `/icon.png` fetched twice.

## Images — 60
All `<img>` have meaningful alt. Logos 112–162 KB WebP (should be ~20–40 KB); OG screenshots 0.7–1.3 MB PNG (convert to ≤ 200 KB JPEG/WebP 1200×630); 6.5 MB of unused MP4 and 0.7–2.9 MB PNG originals in `public/`.

## AI Search Readiness — 45 (GEO 41 + agent readiness)
- Crawler access ✅ — GPTBot, OAI-SearchBot, ClaudeBot, Claude-SearchBot, PerplexityBot, Google-Extended, Googlebot, bingbot all get 200 with full SSR text. No Content-Signal / AI-specific groups (fine — open policy is implicit).
- Citability 28: no passage answers "what is CSMdle / how to play / how many characters / when does it reset"; "wordle" appears nowhere; no character names in SSR text.
- Authority/brand 20: split brand, no `sameAs`, no off-site mentions measured.
- `/llms.txt` broken (307 → 404). Game search input has placeholder only — add `aria-label` + combobox semantics. Homepage ~100 words without JS.

## Visual / Mobile — 66
Cookie banner covers ~50 % of mobile viewport over primary CTAs (all pages); "Accueil" nav label overlaps logo on `/jjk` mobile; KNY card cut at fold on desktop; tap targets 24–40 px (Back, nav icons, scope toggle) < 48 px; footer text 10–12 px low contrast; inconsistent "Accepter" button colour. Screenshots in `screenshots/`.

## SXO — 42
Page type matches (interactive game pages rank), but competitors pair the game with an H1 + 200–750 words of how-to/rules/FAQ. Pyramid ≠ "tier list" intent (searchers want a free tier-list maker). Qui est-ce ? gates play behind login. Dle pages lack yesterday's answer, puzzle number, countdown (answer-seeker persona 26/100). Competitors: jjkdle.com, jjkdle.net (multi-anime, closest model), jujutsudle.com, animedle.org, chainsawdle.net, mangadle.net, tiermaker.com. **Every dle competitor found is English-only.**

---
Per-category detail: `findings/technical.md`, `onpage.md`, `content.md`, `schema.md`, `sitemap.md`, `performance.md`, `images.md`, `geo.md`, `agentic.md`, `visual.md`, `sxo.md`. Action plan: `ACTION-PLAN.md`.
