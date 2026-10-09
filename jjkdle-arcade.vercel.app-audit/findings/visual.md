# Visual Analysis (re-check) - jjkdle-arcade.vercel.app

Date: 2026-10-08 (afternoon). Score: 70/100 (baseline this morning: 66/100).

Pages: `/`, `/csm`, `/csm/games/jjkdle`. Screenshots in `screenshots/`: `home_desktop.png`, `home_mobile.png`, `csm_desktop.png`, `csm_mobile.png`, `csm_jjkdle_desktop.png`, `csm_jjkdle_mobile.png`. Mobile files are 750 px wide (2x DPR, 375 CSS px). The scripts also produced laptop and tablet captures, which were not kept.

Limitation: only the bundled scripts can run, so tap-target and font sizes are estimated from the screenshots (CSS px = image px / 2 on mobile). `analyze_visual.py` reports on all 3 pages: viewport meta present, no horizontal scroll, no overlaps or text overflow detected, 16 px base font, touch_targets_ok true. It is blind to the nav overlap below, so do not trust it on that point. It reports `cta_visible: false` above the fold on `/` and `/csm`, and `true` on the game page.

## Correction to the baseline
The baseline said the cookie banner covers about 49% of the mobile viewport. Measured at 2x it spans y=1178 to 1590 of 1624 image px, which is about 206 CSS px or about 25% of the 812 px viewport. The banner has not changed, but it hides less than the baseline claimed. It still hides the primary CTAs on two pages.

## Regression checks

### Logos moved to next/image
- Home ring (desktop): the six logos (JJK, Bleach, CSM, TG, AOT, KNY) are crisp and not stretched. The aspect ratios look natural.
- `/csm` hero logo (desktop and mobile): crisp, correct aspect ratio, no distortion. Chains and chainsaw edges are sharp at 2x.
- `/csm/games/jjkdle` header logo: renders correctly and is centered. It is small (about 60x30 CSS px on desktop, about 65x35 on mobile), but not distorted.
- Header logo on `/csm`: small (about 50x25 CSS px on desktop) but not distorted.
- `analyze_visual.py` shows the hero image served as `/_next/image?url=%2Flogo.webp&w=3840&q=75`. The 3840 width is probably just the largest srcset candidate it picked. It is not a visual issue, but check the `sizes` attribute so small logos do not download huge variants.
- Verdict: no visual regression from next/image.

### sr-only H1 on game pages
- No visible change on `/csm/games/jjkdle`. The layout is identical to the baseline pattern: logo, 14 px tagline "Devine le personnage mystere du jour.", search input, leaderboard. There is no visible H1 shift, no overlap, and no stray text. This is good.
- The visible page still has no heading text. This is acceptable for SEO now that an H1 exists, but sighted users get no title beyond the logo.

## Above the fold

### / (home)
- Desktop 1920x1080: the H1 "CHOISIS TON UNIVERS", the subtitle, the chips and the gold "CASINO - TOUS UNIVERS" CTA are visible and centered, with five of the six universe cards around them. KNY (bottom) is clipped by the fold and covered by the cookie banner. This is the same as the baseline.
- Mobile 375x812: the pill, H1, subtitle, chips and casino CTA are visible. The JJK and CSM cards start at about y=415 CSS px. The cookie banner (from y=589) cuts the card titles ("JJK Arcade" and "CSM Arcade" are half hidden). The other four universes need a scroll, and the banner also covers the next row. Primary navigation to universes is partly obstructed on first visit.
- The "Accepter" button is slate-blue/grey on `/`, but red on `/csm`. It follows the universe theme, so it looks inconsistent. This is minor.

### /csm
- Desktop: the logo, description, "VOIR LES JEUX" (red) and "BUILD THE PERFECT DEVIL" CTAs and the stats strip are all visible, with the CTAs at y=634. The banner only clips the "Liste des jeux" heading at the bottom. Good.
- Mobile: BUG, still present. The logo image in the nav pill sits on top of the "Accueil" label (around x=110-185, y=30 CSS px). The two overlap and the text is hard to read. This is the same as the baseline defect, now seen on /csm. It is not fixed.
- Mobile: the "VOIR LES JEUX" CTA is fully hidden by the cookie banner. Only its top edge shows at y=585. The primary CTA is not usable until the user accepts or refuses.
- The eyebrow pill wraps onto two lines with wide letter-spacing. It is readable but clumsy.

### /csm/games/jjkdle
- Desktop and mobile: the search input is above the fold and fully visible, and the banner does not cover it on mobile. The leaderboard is visible. Good.
- Desktop: about 55% of the viewport below the leaderboard is empty. The footer is partly hidden under the cookie banner on first paint (the copyright line is cut off).
- Mobile: the footer is below the fold and not visible in the capture.

## Cookie banner
- Desktop: bottom-centered bar, about 770x125 px (about 12% of the height). It is acceptable. It clips the home KNY card and the footer on the game page.
- Mobile: full-width card, about 206 CSS px (about 25% of the viewport). It has a large 17 px text block and two large buttons. Refuse and Accept have equal weight, which is good for CNIL. The banner obstructs the primary CTA on `/csm` (and, from the baseline, `/jjk`) and the universe cards on `/`.
- Suggestion: on mobile, use a compact layout. For example, cut the copy to one or two lines with a "En savoir plus" link, and make the buttons side by side at about 40 px.

## Tap targets (estimated, mobile)
- Nav home and grid icon buttons on `/csm`: about 36x44 CSS px, below 48.
- "Back" link on the game page: about 24 px high, below 48.
- Leaderboard ALL-TIME / HEBDO toggle: segments about 22-28 CSS px high, below 48. This is the weakest target.
- Cookie buttons REFUSER and ACCEPTER: about 37 CSS px high and wide enough. Slightly below 48.
- "Jeux" and "Connexion" nav items: about 36 CSS px high. Slightly below 48.
- Search input: about 50 CSS px high. OK.
- Casino chip and the universe cards: large, OK.

## Overflow and typography
- No horizontal scroll and no text overflow on any page at 375 px.
- Body text is 16 px or more. Eyebrow labels, stat labels, "Du jour", footer links and the "Essais" pill are about 10-12 px and low contrast (grey on near-black). The footer link row ("CASINO", "CONTACT", "GERER LES COOKIES") is tiny uppercase text.

## Issues by priority
1. `/csm` mobile nav: the logo overlaps the "Accueil" label (not fixed since the baseline).
2. Cookie banner hides the primary CTA on `/csm` mobile and the card titles on `/` mobile.
3. Tap targets under 48 px: nav icons, Back link, leaderboard toggle and the cookie buttons.
4. Low-contrast, tiny footer and label text.
5. The home ring is clipped at the fold on desktop (KNY), and the banner covers it.
6. Inconsistent "Accepter" button color on `/`.
7. The sr-only H1 means that no visible title or keyword text exists on the game page (minor, no regression).

## Score: 70/100
- Above-the-fold clarity: 17/25
- Mobile usability: 15/25
- Layout defects: 14/20 (the nav overlap persists, and the logos render cleanly)
- Typography and legibility: 12/15
- Cookie banner impact: 12/15 (about 25% of the viewport, but it still blocks CTAs)
