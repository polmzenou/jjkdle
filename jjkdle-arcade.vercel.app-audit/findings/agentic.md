# Agent readiness: https://jjkdle-arcade.vercel.app/ (checked 2026-10-08)

## Scores
- Lighthouse Agentic Browsing: not measurable (N unknown). PSI mobile and desktop both returned HTTP 429 (daily quota, no API key). Re-run after `/seo google setup`.
- Agent-UX heuristic (separate from Lighthouse): / = 100/100 (complete); /jjk/games/jjkdle = 100/100 (complete).
  - /: 10 buttons, 9 links, 5 landmarks, 0 div-onclick widgets, 0 unnamed interactive nodes (189 nodes, 19 interactive).
  - /jjk/games/jjkdle: 5 buttons, 12 links, 5 landmarks, 0 unnamed interactive nodes (122 nodes, 18 interactive). One input flagged "without aria": the character search `<input placeholder="Tape un personnage…" autoComplete="off">` has no aria-label or visible <label>; its name comes only from the placeholder.

## Findings
### P0
- Thin server-rendered content on `/`: about 100 words without JS (warn). Agent fetchers that skip JS see little. Fix: SSR/pre-render the hub copy (game list, descriptions, links).

### P1
- /llms.txt and /.well-known/ai-catalog.json: 307 to /jjk/llms.txt and /jjk/.well-known/ai-catalog.json, then 404 (middleware rewrites unknown root paths into the /jjk universe). Lighthouse treats a missing llms.txt as not applicable, so nothing is lost today, but publishing a valid one would add a counted pass. Fix: exclude `/llms.txt`, `/llms-full.txt` and `/.well-known/*` from the middleware matcher (as `robots.txt` and `sitemap.xml` already are, both 200), then serve a French llms.txt with an H1, a `>` summary and Markdown links to the games.
- Unlabeled search input on /jjk/games/jjkdle: add `aria-label="Rechercher un personnage"` (and consider role=combobox plus aria-controls/aria-activedescendant for the suggestion list). Primary interaction of the game, so this is the most useful agent-UX fix.
- Markdown delivery absent (Accept: text/markdown returns HTML; /index.md 404; no Vary: Accept). Opportunity only; no consumer agent is confirmed to request it (vendor-matrix, 2026-09-23).

### P2/P3 (opportunities, not defects)
- WebMCP: 0 registerTool call sites, 0 forms, no navigator.modelContext. W3C Community Group draft, not a standard; Chrome origin trial M149-M156; WebKit opposes (checked 2026-09-23). Games are realtime and websocket-driven (Pusher), so imperative tools for "submit guess" would be the only sensible candidate. Low priority.
- ai-catalog.json (ARD 1.0 draft): na; publish only if you expose MCP/A2A/skills.
- api-catalog, oauth-*, agent-card.json, ucp: all 404, not applicable.
- Real 404s work (unknown URL returns 404, no catch-all 200).
- CSP `img-src` allows `https://*.rule34.xxx` (and media-src). Out of agentic scope, but an adult-content host in the policy is worth a content-safety review.
- Pusher: CSP connect-src allows pusher.com and wss://. Multiplayer state is not visible to non-JS fetchers; that is acceptable for games.

## Access policy (robots.txt)
robots.txt (200): single `User-Agent: *` group; Allow /; Disallow /api/, /*/api/, /admin, /login, /register; Sitemap declared. No named AI groups, no Content-Signal.
- Training (GPTBot, ClaudeBot, Google-Extended, CCBot...): allowed by fall-through to `*`.
- Search (OAI-SearchBot, Claude-SearchBot, PerplexityBot, Googlebot): allowed.
- User-triggered (ChatGPT-User, Claude-User, Perplexity-User, Google-Agent): not blocked. Claude-User honours robots.txt; Perplexity-User and Google-Agent generally ignore it; ChatGPT-User may not apply it (vendor docs).
- Optional: add named groups or `Content-Signal: search=yes, ai-input=yes, ai-train=no` if a different per-purpose policy is wanted. Content-Signal is a Cloudflare CC0 policy with an expired IETF individual draft (2026-04-04); a preference, not enforcement; Google does not act on it (checked 2026-09-23).

## Standards-status notes (vendor-matrix, last full check 2026-09-23)
WebMCP: W3C CG draft. Content-Signal: preference only. ai-catalog/ARD: spec 1.0, Lighthouse 13.5 checks it, absence = not applicable. Web Bot Auth: draft-ietf-webbotauth-httpsig-protocol-00 (2026-09-01). Lighthouse 13.5.0. No ranking, citation or traffic effects are implied by any item here.

## Structured findings (audit-data.json, AI Search Readiness)
[
 {"title":"Thin server-rendered content on home page","severity":"high","description":"About 100 words without JavaScript on /.","recommendation":"Server-render the hub copy and game links."},
 {"title":"llms.txt and ai-catalog.json unreachable (redirect to /jjk then 404)","severity":"medium","description":"Middleware rewrites unknown root paths into /jjk; both files 307 then 404.","recommendation":"Exclude /llms.txt and /.well-known/* from the middleware matcher and publish a valid llms.txt."},
 {"title":"Game search input has no accessible label","severity":"medium","description":"Input on /jjk/games/jjkdle relies on placeholder only.","recommendation":"Add aria-label and combobox semantics."},
 {"title":"No AI-specific robots.txt policy or Content-Signal","severity":"low","description":"All agents fall through to the * group.","recommendation":"Optional named groups or Content-Signal line."},
 {"title":"No Markdown delivery or WebMCP","severity":"info","description":"Opportunities, not defects.","recommendation":"Optional Accept: text/markdown support; WebMCP only if a stable guess-submit flow is worth exposing."}
]
