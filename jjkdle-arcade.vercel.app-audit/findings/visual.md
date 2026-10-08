# Visual Analysis - jjkdle-arcade.vercel.app

Date: 2026-10-08. Score: 66/100.

Screenshots in `screenshots/`: `home_desktop.png`, `home_mobile.png`, `jjk_desktop.png`, `jjk_mobile.png`, `jjkdle_desktop.png`, `jjkdle_mobile.png`. Mobile files are 750 px wide because they were captured at 2x DPR (375 CSS px).

Limitation: only bundled scripts can run, so no custom DOM measurement was possible. Tap-target sizes and font sizes are estimated from the screenshots. `analyze_visual.py` reports a 16px base font and a viewport meta tag on all three pages.

## Home (/)
- Desktop: the visible heading "CHOISIS TON UNIVERS" sits centered in a ring of six universe cards. This is a strong, clear hero. The only other CTA is the gold "CASINO - TOUS UNIVERS" pill.
- The card ring runs past the bottom of the 1080px fold. The KNY card is cut off and covered by the cookie banner. This looks intentional but hides one of the six primary CTAs.
- The rendered text reads "Anime Arcade - mini-jeux anime gratuits - Choisis tonunivers", so the SEO H1 is sr-only and visually the H1 is just "Choisis ton univers". No keyword or value proposition ("mini-jeux anime gratuits") is visible to sighted users. The extracted text also shows a missing space ("tonunivers"), which suggests the sr-only span and the visible spans are joined without whitespace. Check this.
- Mobile (375x812): the H1, subtitle and chips are visible above the fold. The first universe cards start at about y=415 CSS px, but the cookie banner then covers the bottom ~50% of the viewport (about y=590 to 800). Only the JJK and CSM cards are partly visible. The card names (e.g. "JJK Arcade") are cut off behind the banner.
- The universe-card links are the primary CTAs, and they are mostly hidden on first paint.
- The "Accepter" button is slate grey on the home page but purple on the other pages. This is inconsistent, because it picks up the universe theme.

## /jjk
- Desktop: strong hero with the logo, a description, and two visible CTAs ("VOIR LES JEUX" in purple, and "BUILD THE PERFECT SORCERER"). A stats strip is below. The cookie banner overlays the "Liste des jeux" heading at the bottom, which is acceptable.
- No visible H1 text. The logo image is the heading visually. `analyze_visual.py` says H1 is "visible", but it is probably the logo's alt text or an sr-only element. A visible keyword H1 is missing.
- Mobile: BUG. In the top nav, the "Accueil" label overlaps the JJK logo (the logo image sits behind or over the text, at about y=60 on the 2x screenshot). This is a clear overlap defect.
- Mobile: the primary CTAs ("VOIR LES JEUX", "BUILD...") are fully covered by the cookie banner at 375x812. Only the top edge of the purple button peeks out above it. This is a primary CTA obstruction.
- Mobile: the eyebrow pill "JUJUTSU KAISEN - FAN ARCADE" wraps onto two lines with wide letter-spacing, which looks clumsy but is readable.
- Desktop: the decorative kanji and the "?" floating button (bottom right, ~56 px) are fine. The "?" button could collide with the footer or content on small screens.

## /jjk/games/jjkdle
- Desktop: no H1 and no title text. The only visible heading text is the small 14 px tagline "Devine le personnage mystere du jour." The page has a logo, a search input, and a leaderboard. About 55% of the 1080px viewport is empty below the leaderboard.
- The primary action (search input "Tape un personnage...") is visible above the fold on both desktop and mobile. This is good. On mobile the input is 100 px high in the 2x screenshot, so about 50 CSS px, which is OK.
- No SEO copy, rules, or explanation is visible. A thin page for search engines as well as for users.
- The desktop footer is partly covered by the cookie banner. Footer text ("Fan-projet non officiel...", links) is small, about 11-12 px, and low contrast grey. The footer links ("CASINO", "CONTACT", "GERER LES COOKIES") are tiny uppercase text.
- Mobile: the cookie banner covers about 30% of the viewport but the input stays visible. No overlap with the primary UI. The footer is hidden under the banner.
- Leaderboard toggle (ALL-TIME / HEBDO) is about 40 CSS px high and the "Back" link is about 24 CSS px high. Both are below the 48 px recommendation.

## Cookie banner (all pages)
- Desktop: centered bottom bar, about 770x125 px, about 12% of the viewport height. This is acceptable.
- Mobile: about 400 CSS px of the 812 px viewport (~49%). The banner has a large text block with a 15-16 px font and two large buttons. It is a layout-blocking interstitial on first visit that hides the CTAs on / and /jjk. Suggest a compact one-line layout, or a two-line banner with small buttons, on mobile.
- The buttons "REFUSER" and "ACCEPTER" are about 37 CSS px high on mobile and fine on width. Refuse is as prominent as Accept, which is good for CNIL compliance.

## Mobile overall
- Viewport meta is present. No horizontal scroll was seen in any screenshot, and `analyze_visual.py` found no overflow.
- Base font is 16 px. Body text is readable. The small caps eyebrow labels, footer links, stat labels ("JEUX JOUABLES") and universe sub-labels are about 10-12 px and low contrast.
- Tap targets: home chips are not interactive. The nav icon buttons (home, grid) on /jjk are about 36 px on mobile (below 48 px). "Back" on the game page is a small text link. The "?" help button is fine.

## Issues by priority
1. Cookie banner hides the primary CTAs on mobile on / and /jjk (about 49% of the viewport).
2. The /jjk mobile nav has a logo/"Accueil" overlap.
3. There is no visible H1 or value proposition on the home page (the keywords exist only in sr-only text) and on /jjk. The game page has no H1 and no descriptive text (about 55 words).
4. The home universe ring is cut off at the fold on desktop (KNY hidden), and the cards are hidden on mobile by the banner.
5. The small tap targets (nav icons, Back, toggles) and the tiny, low-contrast footer text.
6. The accept-button color varies between pages.

## Score: 66/100
- Above-the-fold clarity: 15/25
- Mobile usability: 15/25
- Layout defects: 14/20
- Typography and legibility: 12/15
- Cookie banner impact: 10/15
