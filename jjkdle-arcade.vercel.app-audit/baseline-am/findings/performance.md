# Performance findings - https://jjkdle-arcade.vercel.app/ (2026-10-08)

Method: PSI API returned "rate limit exceeded" (keyless, shared quota) on 2 attempts, and CrUX was unavailable (no key). Fallback: local Lighthouse CLI 12.8.2 (mobile = simulated Slow 4G/4x CPU; desktop preset), one run per URL/form-factor, plus curl TTFB. Lab data only - validate with CrUX/field when available. INP not measurable in lab; TBT used as proxy.

## Overall Performance score: 76/100 (mobile-weighted; mobile avg 77, desktop avg 98)

| URL | Mob score | LCP | TBT | CLS | FCP | Desk score | Desk LCP | Desk CLS |
|---|---|---|---|---|---|---|---|---|
| / | 75 | 4.89s (poor) | 69ms | 0 | 1.6s | 97 | 1.28s | 0 |
| /jjk | 84 | 4.23s (poor) | 110ms | 0 | 1.1s | 99 | 0.88s | 0 |
| /jjk/games/jjkdle | 91 | 3.28s (NI) | 88ms | 0 | 1.3s | 100 | 0.74s | 0 |
| /jjk/games/builder | 57 | 6.52s (poor) | 69ms | 0.397 (poor) | 1.1s | 96 | 1.10s | 0.091 |

INP proxy: TBT 69-110ms mobile, 0ms desktop -> INP likely good (<200ms); unverified in lab. Total JS bootup ~0.4-0.5s mobile.
TTFB (curl from test machine, cached-TLS-free): 0.25s / 0.26s / 0.37s / 0.32s (good, <0.8s). Lighthouse server-response ~16-29ms on doc (local network). Lighthouse LCP breakdown TTFB phase 84-103ms. Note: my vantage point is not France; measured TTFB likely understates iad1 penalty for cdg users (x-vercel-id cdg1::iad1 confirms edge in Paris, function in Virginia, ~80-100ms extra RTT per dynamic request).
HTML: transfer 11-17KB compressed (69KB raw on /). Headers: Cache-Control private,no-cache,no-store; X-Vercel-Cache MISS.

## Top issues (by impact)

1. Home preloads 6 logo .webp images (~830KB: tg 158K, aot 148K, logo 144K, kny 143K, csm 123K, bleach 112K) via <link rel=preload as=image>; all start at ~280ms and compete for bandwidth with CSS/JS. Only 1 is likely visible (carousel/stack with absolute-positioned imgs). Lighthouse: image-delivery savings 822KB; total page weight 1.24MB. LCP element on / is a text <p> with 86% render delay (4.2s) i.e. text is held back by contention + opacity:0 entrance animations (inline opacity:0 / translateY, animation-delay up to 2s) -> LCP 4.9s mobile. Fix: remove 5 of 6 preloads, drop logos to <=30-40KB (they're 112-158KB for ~200px display; serve via next/image w/ sizes or resize), do not start LCP text at opacity:0.
2. /jjk/games/builder: CLS 0.397 mobile (0.091 desktop, borderline). Culprit: container "mt-8 grid items-center gap-6 rounded-2xl border..." shifts when character images load. LCP (6.5s) is a character image /api/characters/kurourushi/image?v=... that is not discoverable in initial HTML (client-rendered), no fetchpriority, load delay 744ms + render delay 794ms. Page weight 1.57MB, uses-responsive-images savings ~953KB (full-size Yuji_Portrait 133KB etc. rendered small). Fix: reserve aspect-ratio/min-height, use width/height, next/image with sizes, priority on first image, thumbnails for the grid, lazy-load below fold.
3. Logo <img src="/logo.webp"> (144KB) is unsized (no width/height) on /jjk, /jjkdle, builder header; on /jjk it is the LCP element (4.2s mobile) without fetchpriority=high (discovery 204ms delay, render delay 1.3s). Fix: next/image priority + width/height + smaller asset (44px header uses full 144KB file).
4. HTML never cached: private/no-cache/no-store, MISS every request, dynamic render in iad1 for French users (cdg1 edge -> iad1 function). Fix: make pages static/ISR (remove cookies()/headers()/dynamic usage from the layout), set function region to cdg1 (vercel.json "regions":["cdg1"]) or Supabase region-colocated; allow s-maxage + stale-while-revalidate. Also hurts bfcache (bf-cache audit fails: 2-3 reasons, probably Cache-Control: no-store).
5. Static asset caching and misc: uses-long-cache-ttl flags 2 resources (/icon.png 49KB is requested twice: with and without ?c27... hash, and is a 49KB favicon); legacy-javascript ~12KB savings (chunk 4bd1b696 55KB + 1255 45KB); unused CSS ~15KB; render-blocking CSS 2 files. Compression of hero video (Hero_video_background.mp4 exists in /public - verify it is not loaded above the fold).

## Positive
CLS 0 on /, /jjk, /jjkdle; TBT low; DOM size 103-341 (fine); fonts preloaded (woff2); CSP/security headers solid; HTML small.

## Expected impact of fixes
Removing 5 preloads + shrinking logos should cut / mobile LCP by ~2s+ (target <2.5s, score ~90). Fixing builder image sizing/CLS should bring builder to ~85+ and CLS <0.1.

Raw Lighthouse JSON: scratchpad/perf/*.json (home_m, home_d, jjk_m, jjk_d, dle_m, dle_d, b_m, b_d).
