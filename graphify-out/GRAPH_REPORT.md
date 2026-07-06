# Graph Report - jjkdle  (2026-07-06)

## Corpus Check
- 219 files · ~431,746 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1132 nodes · 3285 edges · 44 communities (41 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 24 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `27285f7f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]

## God Nodes (most connected - your core abstractions)
1. `getCurrentUser` - 95 edges
2. `Character` - 64 edges
3. `findLobby()` - 39 edges
4. `getRoster()` - 31 edges
5. `SerializedLobby` - 31 edges
6. `getAdminUser()` - 27 edges
7. `CategoryConfig` - 25 edges
8. `CharacterImage()` - 24 edges
9. `DraftCharacter` - 23 edges
10. `isPusherConfigured()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `getAdminUser()`  [INFERRED]
  app/api/draft-characters/[id]/image/route.ts → lib/auth/session.ts
- `DELETE()` --calls--> `getAdminUser()`  [INFERRED]
  app/api/draft-characters/[id]/image/route.ts → lib/auth/session.ts
- `LoginPage()` --calls--> `getCurrentUser`  [EXTRACTED]
  app/(auth)/login/page.tsx → lib/auth/session.ts
- `RegisterPage()` --calls--> `getCurrentUser`  [EXTRACTED]
  app/(auth)/register/page.tsx → lib/auth/session.ts
- `POST()` --calls--> `getAdminUser()`  [INFERRED]
  app/api/characters/[id]/image/route.ts → lib/auth/session.ts

## Import Cycles
- 1-file cycle: `data/roster/characters.ts -> data/roster/characters.ts`

## Communities (44 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.15
Nodes (13): CharacterPool(), CharacterPoolProps, DraggableCard(), DraggableCardProps, GameOverScreen(), GameOverScreenProps, RankingCard(), RankingCardProps (+5 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (41): CatField, FormState, Tab, TAB_LABELS, TAB_ORDER, TIERS, ImageDropzone(), ImageDropzoneProps (+33 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (33): AccountForms(), STATS, AuthResult, loginAction(), logoutAction(), registerAction(), updatePasswordAction(), updateUsernameAction() (+25 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (39): dependencies, @dnd-kit/core, @dnd-kit/utilities, framer-motion, next, @prisma/client, pusher, pusher-js (+31 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (106): PageProps, PageProps, PageProps, POST(), getAdminOrVipUser(), getCurrentUser, SessionUser, applyLeave() (+98 more)

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (69): DRAFT_TIERS, DraftRosterAdmin(), DraftRosterAdminProps, EMPTY_FORM, FormState, TIER_COLOR, getCachedImage(), GET() (+61 more)

### Community 6 - "Community 6"
Cohesion: 0.25
Nodes (7): DraftLeaderboardEntry, DraftLeaderboard(), DraftLeaderboardProps, MEDALS, HigherLowerLeaderboardProps, JjkdleLeaderboardProps, LeaderboardScope

### Community 7 - "Community 7"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 8 - "Community 8"
Cohesion: 0.11
Nodes (27): evaluateBadges(), POST(), consumeSession(), saveHigherLowerScore(), xpForScore(), awardGameExpAction(), ExpResult, GAMES (+19 more)

### Community 9 - "Community 9"
Cohesion: 0.18
Nodes (17): Character SVG Naming Convention, Original-Only Assets Policy, Best Score Persistence (httpOnly cookie), Build the Perfect Sorcerer (tap game), Draw Eligibility & Random Draw (seedable), Grade Tiers (Grade 4- to Grade S), JJK Arcade Platform, JJK Pyramid (ranking game) (+9 more)

### Community 10 - "Community 10"
Cohesion: 0.15
Nodes (23): UserAvatar(), UserAvatarProps, CharacterRow, EVENTS, LobbyStatePayload, PlayerLockedPayload, SerializedLobby, SerializedPlayer (+15 more)

### Community 13 - "Community 13"
Cohesion: 0.22
Nodes (4): byCat, CATEGORIES, prisma, scores

### Community 14 - "Community 14"
Cohesion: 0.50
Nodes (3): cspProd, nextConfig, securityHeaders

### Community 16 - "Community 16"
Cohesion: 0.07
Nodes (47): ActionResult, adminGrantBadgeAction(), adminGrantFrameAction(), adminGrantTitleAction(), adminRevokeBadgeAction(), adminRevokeFrameAction(), adminRevokeTitleAction(), adminSetLevelAction() (+39 more)

### Community 17 - "Community 17"
Cohesion: 0.33
Nodes (4): ALLOWED_MIME, DELETE(), Params, POST()

### Community 18 - "Community 18"
Cohesion: 0.14
Nodes (13): Ajouter un jeu (système pluggable), Ajouter un personnage, Ajouter une catégorie, Ajouter une condition (JJK Pyramid), 📁 Architecture, 🚀 Démarrage local, ☁️ Déploiement Vercel, JJK Arcade — Plateforme de mini-jeux Jujutsu Kaisen (+5 more)

### Community 20 - "Community 20"
Cohesion: 0.24
Nodes (14): ActionResult, equipFrameAction(), equipTitleAction(), getFrameGrantKeys(), getTitleGrantKeys(), buildUnlockContext(), getUnlockedFrameKeys(), getUnlockedTitleKeys() (+6 more)

### Community 21 - "Community 21"
Cohesion: 0.05
Nodes (67): BadgeToast(), BadgeToastProps, BuilderPage(), metadata, getCharacterMap(), getConditions(), getRoster(), awardJjkdleExpAction() (+59 more)

### Community 22 - "Community 22"
Cohesion: 0.17
Nodes (19): AccountPage(), metadata, BadgeShelf(), BadgeShelfProps, getUserBadgeKeys(), LevelBar(), LevelBarProps, TitleBadge() (+11 more)

### Community 23 - "Community 23"
Cohesion: 0.18
Nodes (18): BuilderGameProps, CategoryTile(), CategoryTileProps, RankFooter(), RankFooterProps, ScoreReveal(), ScoreRevealProps, useCountUp() (+10 more)

### Community 24 - "Community 24"
Cohesion: 0.07
Nodes (39): clearImageCacheAction(), refreshRosterImagesFromApiAction(), AdminDashboard(), buildUrl(), candidateTags(), fetchPosts(), ImageLookup, ImageRefreshResult (+31 more)

### Community 25 - "Community 25"
Cohesion: 0.14
Nodes (20): BattleCombat(), BattleCombatProps, hpColor(), pct(), BattleLobbyProps, BattleResultProps, DeckGrid(), DeckGridProps (+12 more)

### Community 26 - "Community 26"
Cohesion: 0.17
Nodes (13): BuilderGame(), LeaderboardRow(), SubmitScore(), formatScore(), AttemptsBar(), AttemptsBarProps, RankingCondition, scoreForAttempt() (+5 more)

### Community 27 - "Community 27"
Cohesion: 0.12
Nodes (12): prisma, prisma, ConditionDef, CONDITIONS, CRITERION_META, DEFS, LoreConditionDef, StatConditionDef (+4 more)

### Community 28 - "Community 28"
Cohesion: 0.17
Nodes (15): GET(), GAME_GLYPH, GAME_LABEL, Leaderboard(), LeaderboardProps, MEDALS, GAMES, ScopeToggle() (+7 more)

### Community 29 - "Community 29"
Cohesion: 0.25
Nodes (9): CONDITION_DEFS, criterionValue(), ATTEMPT_SCORES, checkPlacement(), isComplete(), pickRandomCondition(), shuffledPool(), order (+1 more)

### Community 30 - "Community 30"
Cohesion: 0.13
Nodes (19): AdminDashboardProps, CharacterImage(), CharacterImageProps, initials(), GuessConfirmModal(), GuessConfirmModalProps, BoardMode, GuessWhoBoard() (+11 more)

### Community 31 - "Community 31"
Cohesion: 0.14
Nodes (18): UnlockContext, BY_KEY, FrameDefinition, frameRing(), FRAMES, frameRingForStyle(), FrameStyle, FrameStyleKey (+10 more)

### Community 32 - "Community 32"
Cohesion: 0.15
Nodes (18): BattleResult(), battleValueOf(), battleValues, buildDuelScript(), DuelStep, gauntletBreakdown(), GauntletCardLog, GauntletRun (+10 more)

### Community 33 - "Community 33"
Cohesion: 0.18
Nodes (14): updateProfileLayoutAction(), CustomizeProfilePage(), metadata, ProfileLayoutEditor(), ProfileLayoutEditorProps, DEFAULT_PROFILE_LAYOUT, defaultLayout(), isSectionKey() (+6 more)

### Community 34 - "Community 34"
Cohesion: 0.19
Nodes (13): POST(), HigherLowerPage(), getHigherLowerPool(), deleteSession(), getSession(), computeCorrect(), HLCharacter, HLChoice (+5 more)

### Community 35 - "Community 35"
Cohesion: 0.24
Nodes (14): Draw, drawAll(), drawAllOne(), drawCategory(), drawOne(), eligibleFor(), redrawUnlocked(), redrawUnlockedOne() (+6 more)

### Community 36 - "Community 36"
Cohesion: 0.31
Nodes (10): AvatarChoice, BANNER_KEYS, ProfileEditor(), ProfileEditorProps, BannerKey, bannerRequiredLevel(), bannerStyle, isBannerKey() (+2 more)

### Community 37 - "Community 37"
Cohesion: 0.31
Nodes (8): BadgeRule, BADGES, BY_KEY, getBadge(), isBadgeKey(), check(), buildUserStatsContext(), UserStatsContext

### Community 38 - "Community 38"
Cohesion: 0.18
Nodes (8): CardData, GameOverState, HigherLowerGame(), HigherLowerGameProps, Phase, ResultModal(), RevealState, useCountUp()

### Community 39 - "Community 39"
Cohesion: 0.24
Nodes (10): SingleDraw, LobbyStatusValue, asRecord(), BoardTile, DrawIds, idsToSelection(), LobbyRow, PlayerRow (+2 more)

### Community 40 - "Community 40"
Cohesion: 0.22
Nodes (7): adminSetXpBonusAction(), Feedback, UserAdmin(), UserAdminProps, AdminUser, applyUserXpBonus(), getUserXpBonus()

### Community 41 - "Community 41"
Cohesion: 0.27
Nodes (6): GET(), metadata, HigherLowerLeaderboardEntry, topHigherLowerEntries(), HigherLowerLeaderboard(), MEDALS

### Community 42 - "Community 42"
Cohesion: 0.39
Nodes (8): advanceSession(), BestRow, buildTurnView(), createSession(), pickRight(), randOf(), SESSION_SELECT, SessionRow

### Community 43 - "Community 43"
Cohesion: 0.40
Nodes (5): Feedback, LeaderboardAdmin(), LeaderboardAdminProps, getGame(), AdminScore

## Knowledge Gaps
- **233 isolated node(s):** `metadata`, `metadata`, `ProfileEditorProps`, `BANNER_KEYS`, `ActionResult` (+228 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getCurrentUser` connect `Community 4` to `Community 33`, `Community 2`, `Community 34`, `Community 36`, `Community 5`, `Community 8`, `Community 41`, `Community 16`, `Community 20`, `Community 21`, `Community 22`, `Community 24`?**
  _High betweenness centrality (0.104) - this node is a cross-community bridge._
- **Why does `Character` connect `Community 30` to `Community 32`, `Community 1`, `Community 0`, `Community 35`, `Community 4`, `Community 39`, `Community 10`, `Community 16`, `Community 21`, `Community 23`, `Community 24`, `Community 25`, `Community 26`, `Community 27`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Why does `CharacterImage()` connect `Community 30` to `Community 32`, `Community 1`, `Community 0`, `Community 36`, `Community 5`, `Community 38`, `Community 10`, `Community 21`, `Community 23`, `Community 25`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `getCurrentUser` (e.g. with `BattleLobbyPage()` and `GuessWhoLobbyPage()`) actually correct?**
  _`getCurrentUser` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `metadata`, `metadata`, `ProfileEditorProps` to the rest of the system?**
  _233 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06862745098039216 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.0519774011299435 - nodes in this community are weakly interconnected._