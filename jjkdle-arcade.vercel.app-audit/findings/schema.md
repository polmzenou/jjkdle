# Schema / Structured Data — jjkdle-arcade.vercel.app

**Score: 62/100**

## Current implementation
| Page type | Types | Source |
|---|---|---|
| `/` hub | WebSite + Organization ("Anime Arcade") | `HubJsonLd` |
| `/{u}` | WebSite + Organization (per universe) **×2** | `SiteJsonLd` in page.tsx **and** UniverseChrome |
| `/{u}/games` | WebSite+Org, BreadcrumbList, ItemList (9 ListItems) | `GamesListJsonLd` |
| `/{u}/games/*` | WebSite+Org, VideoGame + Offer(price 0) | `GameJsonLd` |
All blocks parse as valid JSON-LD.

## Findings

### MEDIUM — Duplicate WebSite/Organization block on the 6 universe landings
`app/[universe]/page.tsx:39` renders `<SiteJsonLd />` and `app/[universe]/layout.tsx` renders `UniverseChrome jsonLd` which also renders `<SiteJsonLd />`. Same `@id`s, so graphs merge, but it's redundant bytes and a validator warning. Remove the one in page.tsx.

### MEDIUM — Entity model: 7 "WebSite"s and 7 "Organization"s on one domain
Each universe declares itself a `WebSite` (`/jjk/#website`) and its own `Organization` ("JJK Arcade"). Google's site-name system reads the WebSite on the **home page of the domain/host** only; sub-path WebSites are ignored and fragment the entity.
Recommended graph:
- One `Organization` + one `WebSite` at `/` (`@id: https://<host>/#organization`, `#website`), with `logo` = a platform logo (currently `logo.png` = the JJK logo, 730 KB) and `sameAs` (Discord/X/TikTok if any).
- Universe landings: `CollectionPage` with `isPartOf: {"@id": "/#website"}`, `about: {"@type":"CreativeWork","name":"Chainsaw Man"}`.
- Game pages: keep `VideoGame`, set `publisher`/`author` to `{"@id":"/#organization"}`, add `isPartOf` the universe CollectionPage.

### LOW — VideoGame lacks breadcrumbs and is not rich-result eligible
- No BreadcrumbList on game pages (Accueil › Chainsaw Man › Jeux › CSMdle) — breadcrumbs are still shown in Google results; add them.
- `VideoGame`/`SoftwareApplication` rich results require `aggregateRating` or `review`; there is none, so no rich result is expected. Do **not** invent ratings; only add if you collect genuine on-site ratings.
- `description` in `GameJsonLd` uses `game.description` (registry) while the meta description uses the hard-coded JJK override — they diverge; fine, but fix the meta side (see on-page).
- `genre: "Anime fan game"` → use real genres ("Puzzle", "Quiz", "Trivia", "Card game"); `gamePlatform` OK; consider `playMode` ("SinglePlayer"/"MultiPlayer") for battle/guesswho/codenames.

### INFO
- No HowTo (correct — deprecated). No FAQPage (correct — FAQ rich results retired May 2026; don't add for SERP benefit).
