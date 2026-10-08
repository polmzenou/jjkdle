# Action Plan — jjkdle-arcade.vercel.app

Each item: **Why** (first-principle observation) · **Depends on / unblocks** · **Failed if** (falsifiability) · **Watch** (leading indicator without re-running the audit).

## Phase 1 — Critical fixes (this week)

### 1. Remove JJK text from non-JJK universes — CRITICAL · ~2–3 h
- Meta: delete hard-coded `seoDescription` in `app/[universe]/games/{jjkdle,battle,guesswho,codenames}/page.tsx`; build from `universe.sourceWork` + `universeGame(id).title`. Make ranking / higher-lower / draft descriptions per-universe in `lib/universes/*.ts`.
- Body: tower ("The Culling Tower") and draft ("sorcier") strings → universe labels.
- **Why:** the snippet is the only thing a searcher sees before clicking; "Jujutsu Kaisen" on a Chainsaw Man page reads as irrelevant and as a templated duplicate.
- **Unblocks:** #5 (content blocks reuse the same templating), #8.
- **Failed if:** `curl /csm/games/jjkdle | grep -i "jujutsu"` still matches.
- **Watch:** GSC → Performance → pages `/csm|aot|kny|tg|bleach/games/*` CTR over 4 weeks.

### 2. Kill soft-200s + add favicon — HIGH · ~20 min
- `app/[universe]/layout.tsx`: `const { universe } = await params; if (!getUniverseBySlug(universe)) notFound();`. Add `app/favicon.ico` (48×48 multiple).
- **Failed if:** `curl -I /favicon.ico` isn't `image/x-icon`, or `/x.png` isn't 404.
- **Watch:** GSC → Pages → "Duplicate, Google chose different canonical" count trending down.

### 3. Server-rendered H1 on all 54 game pages — HIGH · ~1–2 h
- "CSMdle — devine le personnage Chainsaw Man du jour", etc.
- **Depends on:** #1 (same universe-label plumbing).
- **Failed if:** crawl still finds pages with 0 `<h1>`.

### 4. Mobile cookie banner — HIGH · ~1 h
- Compact bottom bar (≤ 20 % viewport) on mobile, no overlap of primary CTAs, consistent "Accepter" colour.
- **Why:** intrusive interstitial guidance + it hides the only CTAs above the fold.
- **Failed if:** 375×812 screenshot shows the universe cards / "Voir les jeux" covered.

## Phase 2 — High-impact improvements (weeks 2–3)

### 5. "Comment jouer" content block per game — HIGH · ~1 day (template once, data per universe)
- 250–450 words SSR below the game: rules, scoring, roster size & hint attributes (from `lib/universes/*-attributes.ts`), reset "minuit (heure de Paris)", account requirement, 3–5 visible Q&As (no FAQPage schema), "Personnage d'hier" + puzzle number on dle pages, "Mis à jour le".
- Make each universe's block genuinely different (attributes, roster, signature characters) to drop similarity < 0.6.
- **Depends on:** #1, #3. **Unblocks:** #9 (citability), #10.
- **Failed if:** median SSR words per game page < 250, or JJK↔CSM similarity > 0.6.
- **Watch:** GSC impressions for queries containing "comment jouer", "règles", "personnage d'hier".

### 6. Performance: LCP — HIGH · ~2–3 h
- One logo preload on `/` (the LCP one) with `fetchpriority="high"`; others lazy. Re-export logos at display size (~20–40 KB). Explicit width/height on header logo; small separate header-logo asset.
- Builder: reserve grid height (fix CLS 0.397), preload/priority the first character image.
- Remove opacity-0 entrance animation from the LCP text.
- **Failed if:** Lighthouse mobile LCP on `/` > 2.5 s or builder CLS > 0.1.
- **Watch:** Vercel Speed Insights / CrUX p75 LCP once traffic qualifies.

### 7. Rendering & region — MEDIUM · ~2–4 h
- `vercel.json` `"regions": ["cdg1"]` (co-locate DB). Static/ISR for `/`, `/{u}`, `/{u}/games` via `generateStaticParams`; keep per-user parts client-side.
- **Failed if:** `X-Vercel-Cache` never `HIT` on landings; TTFB from France > 200 ms.

### 8. Entity & brand consolidation — MEDIUM · ~2–3 h
- One `Organization` + `WebSite` at `/` (platform logo ≥ 112 px, < 50 KB, `sameAs` socials); universe landings → `CollectionPage isPartOf /#website`; games' `publisher` → `/#organization`; BreadcrumbList on game pages; remove duplicate `<SiteJsonLd />` in `app/[universe]/page.tsx`; manifest from `hubSeo()`.
- **Depends on:** nothing. **Unblocks:** #11 (domain migration keeps one entity).
- **Failed if:** Rich Results Test shows > 1 WebSite on any page.
- **Watch:** Google site name shown in SERPs = "Anime Arcade".

### 9. Root files & small technical — MEDIUM · ~1 h
- Add `/llms.txt`, `/.well-known`, `/favicon.ico` to `UNIVERSE_FREE_PREFIXES` + matcher; publish a French `llms.txt` listing universes and games.
- `noindex` `/casino` (+ "pièces virtuelles sans valeur réelle" notice); remove `/login` `/register` from robots `disallow` and the `/login` canonical override.
- `aria-label` + `role="combobox"` on the character search input.
- Scope `*.rule34.xxx` CSP to `/admin` only.

## Phase 3 — Content & authority (month 2)

### 10. Trust pages — HIGH · ~half day
- `/a-propos` (who, why, fan project, rights-holder credits), `/mentions-legales` (legally required in France), `/confidentialite`, `/contact` as a real URL. Link in footer. Fix "Sans compte" claims where login is required; let Qui est-ce ? be tried before login if feasible.

### 11. Own the French niche
- Titles/H1 mention "en français" / "FR" on dle pages; add a `/dle` hub linking all 6 dles.
- Rename slugs `/{u}/games/jjkdle` → `/{u}/games/{u}dle` (csmdle, aotdle…) and draft slugs, with **308** redirects — bundle with a custom-domain migration (e.g. animearcade.fr) to pay the redirect cost once.
- Consider a real free tier-list maker for "tier list <anime>" intent (Pyramid is a quiz, not a maker).
- **Failed if:** after 8 weeks, GSC shows < 50 % of impressions on renamed URLs (redirects not consolidated).
- **Watch:** GSC queries "<anime> dle", "<anime> wordle" impressions & average position.

### 12. Images & cleanup — LOW
- OG screenshots → 1200×630 WebP/JPEG ≤ 200 KB; og:image on `/{u}/games`, `/{u}/games/tower`; delete unused MP4s and PNG originals from `public/`; real `lastmod` from DB `updatedAt`.

## Phase 4 — Monitoring (ongoing)
- Connect Google APIs (`/seo google setup`) for CrUX field data, URL inspection and query data; re-run `/seo audit` after Phase 2.
- `/seo drift baseline https://jjkdle-arcade.vercel.app/` now, `drift compare` after each deploy.
- Off-site: Reddit (r/JuJutsuKaisen FR-friendly threads, r/france gaming), Discord, TikTok/YouTube Shorts of daily puzzles — the main authority lever once the domain is settled.
