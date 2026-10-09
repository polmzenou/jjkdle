# Performance findings (re-measure) - https://jjkdle-arcade.vercel.app/ (2026-10-08, after logo/next-image fixes)

Method: local Lighthouse CLI 12.8.2 (cached; not 13.x), performance category only. Mobile = simulated Slow 4G / 4x CPU, 3 runs per URL (median reported; first run of each URL had a low benchmarkIndex ~1400-1800 vs ~2500 later, so it was CPU-contended and inflated TBT). Desktop preset, 1 run. PSI/CrUX not used (baseline hit rate limit, no key). Lab only; INP not measurable in lab, TBT used as proxy. Baseline = baseline-am/findings/performance.md (single runs).

## Overall Performance score: 83/100 (was 76). Mobile avg 83 (was 77), desktop avg 98-99 (was 98)

## Before / after (mobile, median of 3)

| URL | Score before -> after | LCP before -> after | TBT before -> after | CLS before -> after |
|---|---|---|---|---|
| / | 75 -> 93 | 4.89s -> 3.2s (NI) | 69 -> 100ms | 0 -> 0 |
| /jjk | 84 -> 85 | 4.23s -> 3.4s (NI) | 110 -> 210ms | 0 -> 0 |
| /jjk/games/jjkdle | 91 -> 92 | 3.28s -> 3.0s (NI) | 88 -> 270ms (100-280 range) | 0 -> 0 |
| /jjk/games/builder | 57 -> 61 (56-77) | 6.52s -> 5.1s (poor; 4.9-6.3) | 69 -> 140ms (50-140) | 0.397 -> 0.397 in 2 of 3 runs (0 in one) |

Desktop (1 run): / 97->100 (LCP 1.28->0.6s), /jjk 99->99 (0.88->0.7s), /jjkdle 100->100 (0.74->0.6s), builder 96->95 (LCP 1.10->1.2s, CLS 0.091->0.091).

Core Web Vitals (lab): LCP fails/borderline on all 4 mobile pages (only <=2.5s passes; best run 2.6s on /jjkdle); CLS passes on 3, fails on builder; INP proxy (TBT) is 60-280ms mobile after warm-up, likely OK but TBT is higher than baseline (more on this below), 0-50ms desktop. Field/CrUX not checked.

## Confirmed wins
- Home: 6 logo preloads gone (only webpack chunk preload remains). Logos now /_next/image w=640 at 27-34KB each (was 112-158KB). Page weight 1.24MB -> 531KB. LCP 4.9 -> 3.2s, score 75 -> 93.
- /jjk: hero logo is now next/image (priority; 9KB at w=256 + 29KB at w=640); page 560KB. LCP 4.2 -> 3.4s.
- Header logo 144KB -> 9KB (w=256) on /jjkdle and builder; /jjkdle weight 412KB.
- TTFB unchanged and fine: 0.32 / 0.34 / 0.42 / 0.35s curl; Lighthouse TTFB phase 77-98ms.

## Top remaining issues
1. LCP is now dominated by element render delay, not network. Home: LCP is the `<p class="mt-4 max-w-sm text-sm text-white/55">` with ~1.6s render delay; /jjk: logo img with 2.3s render delay (resource load only 55ms); /jjkdle: `<p>` 0.5-0.7s render delay. Cause: opacity-0 entrance animations/delays and main-thread work (style/layout ~790ms, script eval ~710ms on home) holding first paint of the LCP element. Fix: do not start LCP element (logo, tagline) at opacity 0; no animation-delay on it; animate only non-LCP elements or use transform-only.
2. Builder CLS 0.397 unchanged (0 in one of 3 runs, so intermittent/timing-dependent). Shifting node: `div.mt-8.grid.items-center.gap-6.rounded-2xl...` (BEST RANK / TOP RANKS panel, y~1500) moves when client-rendered character grid loads. Reserve space (min-height / skeleton rows / aspect-ratio) for the grid. Also header logo has loading="lazy" (should be eager/priority above fold).
3. Builder LCP 5.1s (4.9-6.3): LCP is a character portrait (varies: Dagon/Mahito/Megumi) not in initial HTML: load delay 0.73-0.9s + render delay 0.9s. Page 1.19MB; image-delivery savings ~700KB: Yuji_Portrait_Modulo.webp 133KB is 633x632 shown at 30x38; Yuta 74KB, etc. Serve thumbnails via next/image with sizes, lazy-load offscreen cards, fetchpriority=high on first visible card.
4. Main-thread work/TBT: home bootup dominated by chunks 4814 (690ms total) and 1255 (384ms, 350ms scripting); long tasks of 123ms (doc), 108ms (1255), 56ms (4814). Code-split/defer non-critical client components on landing; legacy-JS polyfills ~12KB. TBT variance is large on this machine (60-480ms home) so treat as indicative.
5. HTML still Cache-Control private,no-cache,no-store, X-Vercel-Cache MISS, x-vercel-id cdg1::iad1 (edge Paris, function Virginia). Hurts bfcache and adds ~80-100ms RTT for EU users. Make routes static/ISR or set region cdg1.
6. Home still downloads all 6 hub logos at w=640 (27-34KB each, ~185KB) in Lighthouse's mobile viewport even though lazy; consider sizes matching ~200px display (w=256/384) to save ~100KB.

## Not verified
CrUX/field data, real INP, Lighthouse 13.x scores (CLI cached is 12.8.2; scores may differ slightly on PSI). Raw JSON: scratchpad/perf2/*.json.
