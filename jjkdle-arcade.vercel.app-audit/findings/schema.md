# Schema / Structured Data — jjkdle-arcade.vercel.app (re-audit, 2026-10-08)

**Score: 66/100** (baseline this morning: 62)

Method: `render_page.py --mode never --json-ld-output` on 7 URLs; generator `components/seo/JsonLd.tsx` read for cross-check. Pages are server-rendered (JSON-LD present in raw HTML). All blocks parse as valid JSON-LD, @context is `https://schema.org`, URLs absolute, no placeholders.

## Detection / validation per URL
| URL | Blocks | Types | Result |
|---|---|---|---|
| `/` | 1 | WebSite + Organization (`/#website`, `/#organization`, logo `/logo.png`) | PASS (logo heavy, no sameAs) |
| `/jjk` | 1 | WebSite + Organization (`/jjk/#…`, logo `/logo.webp`) | PASS, entity fragmentation |
| `/csm` | 1 | WebSite + Organization (`/csm/#…`, logo `/logo-csm.webp`) | PASS, entity fragmentation |
| `/csm/games` | 2 | WebSite+Org; BreadcrumbList(2) + ItemList(9) | PASS w/ warnings (breadcrumb skips universe, points to hub) |
| `/csm/games/jjkdle` | 2 | WebSite+Org; VideoGame + Offer | PASS, not rich-result eligible, no breadcrumb |
| `/jjk/games/builder` | 2 | same | same |
| `/bleach/games/tower` | 2 | same, **no `image`** | same + missing image |

Duplicate WebSite/Organization on universe landings: **FIXED** (exactly 1 JSON-LD block on `/jjk`, `/csm`).
Also improved vs baseline: universe logos are now WebP (113-147 KB) instead of the 730 KB JJK PNG.

## Findings

### MEDIUM — 7 WebSite + 7 Organization on one host, none linked
Hub (`/#website`) plus one WebSite/Organization per universe (`/jjk/`, `/csm/`, `/bleach/`, ...) with different names ("Anime Arcade", "JJK Arcade", "CSM Arcade"...). Google's site-name logic reads the WebSite on the host root; sub-path WebSites are ignored and fragment the brand entity. Fix: only the hub emits Organization+WebSite; universes become `CollectionPage` with `isPartOf {"@id": "/#website"}`. In `SiteJsonLd` replace the graph; keep `HubJsonLd` as the single source (ideally emit it in root layout so every page references the same `@id`s).

### MEDIUM — Platform Organization: heavy logo, no sameAs
`/logo.png` is 730,701 bytes (PNG; per baseline it is the JJK logo, not a platform mark). No `sameAs`. Use a dedicated square-ish platform logo (>=112x112, ideally 512x512 PNG/WebP, <50 KB) and add `sameAs` only for profiles that really exist (Discord, X, TikTok, GitHub).

### MEDIUM — VideoGame pages have no BreadcrumbList
`GameJsonLd` emits only VideoGame. Add Accueil > {Univers} > Jeux > {Jeu}. Also `author` is an anonymous inline Organization (`name: "CSM Arcade"`) not tied to the graph; use `{"@id": "/#organization"}` for `publisher`/`author`.

### LOW — `/{u}/games` breadcrumb is wrong-shaped
`GamesListJsonLd` uses `seo.url` for "Accueil" (resolves to the hub root) and goes straight to "Les jeux" — the universe level is missing. Use 3 levels: Accueil (`/`) > Chainsaw Man (`/csm`) > Les jeux (`/csm/games`). ItemList lacks `numberOfItems`; ItemList + games is fine as a non-rich-result semantic signal.

### LOW — VideoGame: not rich-result eligible; weak properties
- No `aggregateRating`/`review` — correct to omit; do NOT fabricate. Only add with genuine collected ratings.
- `genre: "Anime fan game"` is generic: use e.g. `["Puzzle","Quiz"]` per game. Add `playMode` (SinglePlayer / MultiPlayer for battle, guesswho, codenames).
- `/bleach/games/tower` has no `image` (`previewImage` missing in registry) — add one.
- Odd data: CSM slug `jujutsu-draft` (name "Chainsaw Draft") and CSM `jjkdle` slug (name "CSMdle") leak JJK naming into URLs; schema is OK but this is a content/canonical concern.
- `Offer` price 0 EUR is fine (`isAccessibleForFree: true` already present).

### LOW — Minor ID/URL consistency
`url` is `https://host/jjk` while `@id` is `https://host/jjk/#website` (slash mismatch) and hub `url` has no trailing slash. Harmless but pick one form (`https://host/` for root).

### INFO
- No HowTo (correct, deprecated). No FAQPage (correct; FAQ rich results retired May 2026 — do not add for SERP gain).
- JSON serialisation escapes `<` — good.

## Recommended JSON-LD graph

### Root layout / hub `/` (single Organization + WebSite)
```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://jjkdle-arcade.vercel.app/#organization",
      "name": "Anime Arcade",
      "url": "https://jjkdle-arcade.vercel.app/",
      "logo": {
        "@type": "ImageObject",
        "url": "https://jjkdle-arcade.vercel.app/logo-platform-512.png",
        "width": 512,
        "height": 512
      }
    },
    {
      "@type": "WebSite",
      "@id": "https://jjkdle-arcade.vercel.app/#website",
      "url": "https://jjkdle-arcade.vercel.app/",
      "name": "Anime Arcade",
      "description": "Mini-jeux anime gratuits dans le navigateur : Jujutsu Kaisen, Chainsaw Man, Attack on Titan, Kimetsu no Yaiba, Tokyo Ghoul, Bleach.",
      "inLanguage": "fr-FR",
      "publisher": { "@id": "https://jjkdle-arcade.vercel.app/#organization" }
    }
  ]
}
```
Add `"sameAs": [ ...real profile URLs... ]` to the Organization only when they exist. (`logo-platform-512.png` is a placeholder filename to create; do not ship until the asset exists.)

### Universe landing `/csm` (CollectionPage, no new WebSite/Organization)
```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      "@id": "https://jjkdle-arcade.vercel.app/csm#webpage",
      "url": "https://jjkdle-arcade.vercel.app/csm",
      "name": "CSM Arcade — mini-jeux Chainsaw Man",
      "description": "L'arcade fan dédiée à Chainsaw Man : mini-jeux gratuits, sans compte.",
      "inLanguage": "fr-FR",
      "isPartOf": { "@id": "https://jjkdle-arcade.vercel.app/#website" },
      "about": { "@type": "CreativeWork", "name": "Chainsaw Man" },
      "publisher": { "@id": "https://jjkdle-arcade.vercel.app/#organization" },
      "breadcrumb": { "@id": "https://jjkdle-arcade.vercel.app/csm#breadcrumb" }
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://jjkdle-arcade.vercel.app/csm#breadcrumb",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Accueil", "item": "https://jjkdle-arcade.vercel.app/" },
        { "@type": "ListItem", "position": 2, "name": "Chainsaw Man", "item": "https://jjkdle-arcade.vercel.app/csm" }
      ]
    }
  ]
}
```

### `/csm/games` (CollectionPage + BreadcrumbList + ItemList)
```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      "@id": "https://jjkdle-arcade.vercel.app/csm/games#webpage",
      "url": "https://jjkdle-arcade.vercel.app/csm/games",
      "name": "Jeux Chainsaw Man — CSM Arcade",
      "inLanguage": "fr-FR",
      "isPartOf": { "@id": "https://jjkdle-arcade.vercel.app/csm#webpage" },
      "breadcrumb": { "@id": "https://jjkdle-arcade.vercel.app/csm/games#breadcrumb" },
      "mainEntity": { "@id": "https://jjkdle-arcade.vercel.app/csm/games#list" }
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://jjkdle-arcade.vercel.app/csm/games#breadcrumb",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Accueil", "item": "https://jjkdle-arcade.vercel.app/" },
        { "@type": "ListItem", "position": 2, "name": "Chainsaw Man", "item": "https://jjkdle-arcade.vercel.app/csm" },
        { "@type": "ListItem", "position": 3, "name": "Les jeux", "item": "https://jjkdle-arcade.vercel.app/csm/games" }
      ]
    },
    {
      "@type": "ItemList",
      "@id": "https://jjkdle-arcade.vercel.app/csm/games#list",
      "name": "Jeux Chainsaw Man — CSM Arcade",
      "numberOfItems": 9,
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Build the Perfect Devil", "url": "https://jjkdle-arcade.vercel.app/csm/games/builder" },
        { "@type": "ListItem", "position": 2, "name": "CSM Pyramid", "url": "https://jjkdle-arcade.vercel.app/csm/games/ranking" }
      ]
    }
  ]
}
```
(Keep all 9 ListItems generated from `liveGames`; list truncated here for brevity.)

### Game page `/csm/games/jjkdle` (VideoGame + BreadcrumbList)
```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "VideoGame",
      "@id": "https://jjkdle-arcade.vercel.app/csm/games/jjkdle#game",
      "name": "CSMdle",
      "description": "Devine le personnage Chainsaw Man mystère du jour. Chaque proposition révèle des indices par attribut avec des flèches ↑/↓. Un perso par jour, essais illimités.",
      "url": "https://jjkdle-arcade.vercel.app/csm/games/jjkdle",
      "image": "https://jjkdle-arcade.vercel.app/assets/idle-screen-csm.png",
      "genre": ["Puzzle", "Quiz"],
      "gamePlatform": "Web browser",
      "applicationCategory": "GameApplication",
      "operatingSystem": "Any",
      "playMode": "SinglePlayer",
      "inLanguage": "fr-FR",
      "isAccessibleForFree": true,
      "isBasedOn": { "@type": "CreativeWork", "name": "Chainsaw Man" },
      "isPartOf": { "@id": "https://jjkdle-arcade.vercel.app/csm/games#webpage" },
      "author": { "@id": "https://jjkdle-arcade.vercel.app/#organization" },
      "publisher": { "@id": "https://jjkdle-arcade.vercel.app/#organization" },
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "EUR",
        "availability": "https://schema.org/InStock"
      }
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://jjkdle-arcade.vercel.app/csm/games/jjkdle#breadcrumb",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Accueil", "item": "https://jjkdle-arcade.vercel.app/" },
        { "@type": "ListItem", "position": 2, "name": "Chainsaw Man", "item": "https://jjkdle-arcade.vercel.app/csm" },
        { "@type": "ListItem", "position": 3, "name": "Les jeux", "item": "https://jjkdle-arcade.vercel.app/csm/games" },
        { "@type": "ListItem", "position": 4, "name": "CSMdle", "item": "https://jjkdle-arcade.vercel.app/csm/games/jjkdle" }
      ]
    }
  ]
}
```
No `aggregateRating`/`review` included on purpose. Note: Google does not require the final breadcrumb item's `item` URL, but including it is valid.

## Implementation notes (JsonLd.tsx, do not edit here — suggestions)
1. `SiteJsonLd` -> `UniverseJsonLd` emitting CollectionPage + BreadcrumbList; move Organization/WebSite emission to the root layout via `HubJsonLd` (hub-only `@id`s).
2. `GameJsonLd`: add BreadcrumbList to a `@graph`, swap inline `author` for `@id` ref, add per-game `genre`/`playMode` fields to the registry.
3. `GamesListJsonLd`: 3-level breadcrumb using universe name and `universeHref("/")`; add `numberOfItems`.
4. Produce a dedicated platform logo asset and retire `/logo.png` (730 KB) from schema.

## Score breakdown
Validity/syntax 20/20; Organization/WebSite entity model 10/20 (7 fragmented entities, no sameAs, heavy platform logo); Page-type coverage 14/20 (VideoGame, ItemList present; no CollectionPage; no breadcrumbs on games); Property completeness 12/20 (generic genre, anonymous author, missing image on one game); Rules compliance (no HowTo/FAQ, no fake ratings) 10/10; Total 20+10+14+12+10 = 66 (graph linking between entities earns no credit yet).
