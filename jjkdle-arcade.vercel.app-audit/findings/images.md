# Images — jjkdle-arcade.vercel.app (re-audit)

**Score: 72/100** (+12, baseline 60)

## Fixed since baseline
- Logos served through `next/image` (`/_next/image?…`, AVIF/WebP at display width): ~3 KB (header, 96 w) to ~57 KB (828 w) instead of the 111–162 KB 800 px originals.
- Homepage no longer emits 6 `<link rel=preload as=image>` (0 now); hub discs lazy-load. Only the universe landing hero logo is preloaded (`priority`), as the likely LCP image.
- Per-universe default OG image (`/og?u=<slug>`, ~170 KB PNG) replaces the JJK-branded one on hubs, `/games` and tower pages.
- All 185 `<img>` across 69 pages still have meaningful `alt` (0 missing).

## Still open
- **MEDIUM — Game OG screenshots still 0.7–1.3 MB PNG** (`guesswho-screen-csm.png` 1.28 MB, `builder-screen-csm.png` 0.74 MB). Some platforms drop previews over ~300 KB. Convert to 1200×630 JPEG/WebP ≤ 200 KB.
- **LOW — Organization logo `logo.png` (730 KB, JJK logo)** used as the platform logo in JSON-LD. Provide a square "Anime Arcade" logo ≥ 112 px, < 50 KB.
- **LOW — ~6.5 MB unused MP4 and 0.7–2.9 MB PNG originals in `public/`.** Deployed and fetchable for nothing.
- **LOW — `UniverseSwitcher` still uses a raw `<img>` of the 800 px logo** for a 56×28 thumbnail (6 logos ≈ 830 KB whenever the switcher list renders; not verified whether it mounts before being opened). Switch to `next/image` with `sizes="56px"`.
