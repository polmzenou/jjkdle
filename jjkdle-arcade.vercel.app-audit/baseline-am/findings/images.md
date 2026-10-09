# Images — jjkdle-arcade.vercel.app

**Score: 60/100**

## What works
- All server-rendered `<img>` have non-empty, meaningful `alt` (0 missing across 69 pages).
- Logos served as WebP on pages.

## Findings
- **MEDIUM — Homepage preloads 6 logos ≈ 850 KB** (`logo*.webp` 115–162 KB each, `<link rel=preload as=image>` ×6). Six preloads compete with each other and with LCP; they display at ~68 % of a card width. Re-export at display size (≤ 600 px wide, ~20–40 KB each, or AVIF), preload only the first/LCP one, `loading="lazy"` + `fetchpriority="low"` for the rest. Consider `next/image`.
- **MEDIUM — OG/preview screenshots are 0.7–1.3 MB PNGs** (`public/assets/guesswho-screen-csm.png` 1.28 MB …). Some platforms (WhatsApp ~300 KB) drop previews over size; also used as `VideoGame.image`. Convert to 1200×630 JPEG/WebP ≤ 200 KB.
- **LOW — Organization logo `logo.png` is 730 KB** and is the JJK logo used for the multi-anime platform. Provide a square platform logo ≥ 112 px, < 50 KB.
- **LOW — Unused 6.5 MB of MP4 in `public/`** (`Hero_video_background*.mp4`, no references in `app/` or `components/`). Deployed for nothing; delete.
- **LOW — Logo PNG originals 0.7–2.9 MB in `public/`**: publicly fetchable; keep sources out of `public/`.
