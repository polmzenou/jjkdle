# Agent readiness re-audit: https://jjkdle-arcade.vercel.app/ (checked 2026-10-08, afternoon)

## Scores
- Lighthouse Agentic Browsing: not measurable (N unknown). PSI mobile and desktop still HTTP 429 (daily quota, no API key). Cached Lighthouse CLI is 12.8.2, which has no Agentic Browsing category (no agentic audits in its config), so no fraction could be produced locally. Re-run after `/seo google setup` (Lighthouse 13.5 needed).
- Agent-UX heuristic (separate from Lighthouse): / = 100/100 (complete); /csm/games/jjkdle = 100/100 (complete).
  - /: 10 buttons, 9 links, 5 landmarks, 0 div-onclick, 0 unnamed interactive nodes (189 nodes, 19 interactive).
  - /csm/games/jjkdle: 5 buttons, 12 links, 5 landmarks, 0 unnamed interactive nodes; 1 input flagged without aria (unchanged).

## Changes since baseline
- FIXED: /llms.txt now 200, text/markdown, 16.6 KB, H1 + `>` summary + 6 H2 sections + 66 Markdown links, French. agentic_check llms-txt = pass (Lighthouse rules, 0 errors). /llms-full.txt still 307 to 404 (optional).
- Note: robots.txt no longer disallows /login and /register (now only /api/, /*/api/, /admin). Confirm that is intended.
- NOT FIXED: /.well-known/* (ai-catalog.json, api-catalog) still 307 into /jjk/.well-known/* then 404; /llms-full.txt same. Harmless today (all not applicable), but the middleware matcher still rewrites them.
- NOT FIXED: search input on /csm/games/jjkdle still `<input placeholder="Tape un personnage..." autoComplete="off">` with no aria-label.
- NOT FIXED: home page ~100 words without JS (warn).

## Findings
### P0
- Thin server-rendered content on `/`: 100 words without JS (warn, js_shell_marker false). Fix: server-render the hub copy (game list, descriptions, links), or at least a crawlable list of games per universe.

### P1
- Unlabeled game search input (primary interaction). Fix: `aria-label="Rechercher un personnage"`, ideally role=combobox with aria-controls / aria-activedescendant for suggestions.

### P2/P3 (opportunities, not defects)
- Markdown delivery: Accept: text/markdown returns HTML (200 text/html), no Vary: Accept, /index.md 404. No consumer agent confirmed to request it (vendor-matrix, 2026-09-23). The new llms.txt already covers discovery.
- llms.txt: remains a community convention that Google Search ignores; no ranking/citation effect implied.
- WebMCP: 0 registerTool call sites, 0 forms, no navigator.modelContext. W3C Community Group draft, not a standard; WebKit opposes (checked 2026-09-23). Only a "submit guess" tool would make sense.
- ai-catalog.json (ARD 1.0 draft): 404 via redirect, not applicable unless MCP/A2A/skills are exposed.
- api-catalog, oauth-*, agent-card.json, ucp: 404, not applicable.
- Real 404s work (no catch-all 200).
- Middleware hygiene: exclude `/.well-known/*` and `/llms-full.txt` from the redirect-into-/jjk logic so they return honest 404s (or real files) instead of 307 chains.
- Out of agentic scope: CSP img-src/media-src allows `https://*.rule34.xxx`; review for content safety.

## Access policy (robots.txt, single `User-Agent: *` group, Allow /, Sitemap declared)
- Training (GPTBot, ClaudeBot, Google-Extended, CCBot): allowed by fall-through to `*`.
- Search (OAI-SearchBot, Claude-SearchBot, PerplexityBot, Googlebot): allowed.
- User-triggered (ChatGPT-User, Claude-User, Perplexity-User, Google-Agent): not blocked. Claude-User honours robots.txt; Perplexity-User and Google-Agent generally ignore it; ChatGPT-User may not apply it.
- No named AI groups, no Content-Signal (optional; Cloudflare CC0 policy, expired IETF individual draft 2026-04-04; preference only, Google does not act on it; checked 2026-09-23).

## Standards-status notes (vendor-matrix, last check 2026-09-23)
WebMCP: W3C CG draft. Content-Signal: preference only. ai-catalog/ARD: spec 1.0 (Lighthouse 13.5 checks it; absence = not applicable). Web Bot Auth: draft-ietf-webbotauth-httpsig-protocol-00 (2026-09-01). No ranking, citation or traffic effects implied.

## Structured findings (audit-data.json, AI Search Readiness)
[
 {"title":"Thin server-rendered content on home page","severity":"high","description":"About 100 words without JavaScript on /.","recommendation":"Server-render the hub copy and game links."},
 {"title":"Game search input has no accessible label","severity":"medium","description":"Input on /csm/games/jjkdle (and other dle games) relies on placeholder only.","recommendation":"Add aria-label and combobox semantics."},
 {"title":"/.well-known/* and /llms-full.txt redirect into /jjk then 404","severity":"low","description":"llms.txt is fixed (200, valid), but other root discovery paths still 307 to /jjk/* and 404.","recommendation":"Exclude these paths from the middleware rewrite."},
 {"title":"No AI-specific robots.txt policy or Content-Signal","severity":"low","description":"All agents fall through to the * group.","recommendation":"Optional named groups or Content-Signal line."},
 {"title":"No Markdown delivery or WebMCP","severity":"info","description":"Opportunities, not defects.","recommendation":"Optional Accept: text/markdown; WebMCP only for a guess-submit flow."}
]
