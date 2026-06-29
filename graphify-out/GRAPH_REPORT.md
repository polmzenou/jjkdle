# Graph Report - jjkdle  (2026-06-29)

## Corpus Check
- 154 files · ~343,435 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 822 nodes · 2135 edges · 35 communities (31 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `835822d6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Builder, Draw & Scoring|Builder, Draw & Scoring]]
- [[_COMMUNITY_Pyramid Game & Ranking Logic|Pyramid Game & Ranking Logic]]
- [[_COMMUNITY_Auth & Site Shell|Auth & Site Shell]]
- [[_COMMUNITY_Dependencies & Tooling|Dependencies & Tooling]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Leaderboard|Leaderboard]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Game Registry & Showcase|Game Registry & Showcase]]
- [[_COMMUNITY_Domain Concepts & Rationale|Domain Concepts & Rationale]]
- [[_COMMUNITY_Claude Permissions Config|Claude Permissions Config]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]
- [[_COMMUNITY_Tailwind Config|Tailwind Config]]
- [[_COMMUNITY_Roster JSON Data|Roster JSON Data]]
- [[_COMMUNITY_Next.js Config|Next.js Config]]
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

## God Nodes (most connected - your core abstractions)
1. `getCurrentUser` - 57 edges
2. `Character` - 47 edges
3. `CategoryConfig` - 25 edges
4. `getRoster()` - 24 edges
5. `SerializedLobby` - 24 edges
6. `DraftCharacter` - 23 edges
7. `findLobby()` - 23 edges
8. `RosterMap` - 20 edges
9. `getAdminUser()` - 19 edges
10. `isPusherConfigured()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `LoginPage()` --calls--> `getCurrentUser`  [EXTRACTED]
  app/(auth)/login/page.tsx → lib/auth/session.ts
- `RegisterPage()` --calls--> `getCurrentUser`  [EXTRACTED]
  app/(auth)/register/page.tsx → lib/auth/session.ts
- `POST()` --calls--> `getAdminUser()`  [INFERRED]
  app/api/characters/[id]/image/route.ts → lib/auth/session.ts
- `DELETE()` --calls--> `getAdminUser()`  [INFERRED]
  app/api/characters/[id]/image/route.ts → lib/auth/session.ts
- `POST()` --calls--> `getAdminUser()`  [INFERRED]
  app/api/draft-characters/[id]/image/route.ts → lib/auth/session.ts

## Import Cycles
- 1-file cycle: `data/roster/characters.ts -> data/roster/characters.ts`

## Communities (35 total, 4 thin omitted)

### Community 0 - "Builder, Draw & Scoring"
Cohesion: 0.15
Nodes (13): CharacterPool(), CharacterPoolProps, DraggableCard(), DraggableCardProps, GameOverScreen(), GameOverScreenProps, RankingCard(), RankingCardProps (+5 more)

### Community 1 - "Pyramid Game & Ranking Logic"
Cohesion: 0.06
Nodes (48): AdminDashboard(), AdminDashboardProps, CatField, FormState, Tab, TAB_LABELS, TAB_ORDER, TIERS (+40 more)

### Community 2 - "Auth & Site Shell"
Cohesion: 0.07
Nodes (27): getCachedImageCount(), inter, metadata, RootLayout(), spaceGrotesk, AuthResult, loginAction(), logoutAction() (+19 more)

### Community 3 - "Dependencies & Tooling"
Cohesion: 0.05
Nodes (39): dependencies, @dnd-kit/core, @dnd-kit/utilities, framer-motion, next, @prisma/client, pusher, pusher-js (+31 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (69): PageProps, PageProps, POST(), getCurrentUser, SessionUser, applyLeave(), broadcastBattle(), createBattleLobbyAction() (+61 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (58): DRAFT_TIERS, DraftRosterAdmin(), DraftRosterAdminProps, EMPTY_FORM, FormState, TIER_COLOR, CharacterImage(), CharacterImageProps (+50 more)

### Community 6 - "Leaderboard"
Cohesion: 0.18
Nodes (11): GET(), getDraftRoster(), DraftLeaderboardEntry, getUserDraftBest(), topDraftEntries(), JujutsuDraftGame(), JujutsuDraftPage(), metadata (+3 more)

### Community 7 - "TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 8 - "Game Registry & Showcase"
Cohesion: 0.13
Nodes (11): STATS, GameCard(), GameCardProps, FEATURES, metadata, GAMES, Game, GameShowcase() (+3 more)

### Community 9 - "Domain Concepts & Rationale"
Cohesion: 0.18
Nodes (17): Character SVG Naming Convention, Original-Only Assets Policy, Best Score Persistence (httpOnly cookie), Build the Perfect Sorcerer (tap game), Draw Eligibility & Random Draw (seedable), Grade Tiers (Grade 4- to Grade S), JJK Arcade Platform, JJK Pyramid (ranking game) (+9 more)

### Community 10 - "Claude Permissions Config"
Cohesion: 0.06
Nodes (61): BattleCombat(), BattleCombatProps, hpColor(), pct(), BattleResult(), BattleResultProps, battleValueOf(), battleValues (+53 more)

### Community 13 - "Roster JSON Data"
Cohesion: 0.22
Nodes (4): byCat, CATEGORIES, prisma, scores

### Community 14 - "Next.js Config"
Cohesion: 0.50
Nodes (3): cspProd, nextConfig, securityHeaders

### Community 16 - "Community 16"
Cohesion: 0.12
Nodes (24): ActionResult, clearImageCacheAction(), deleteCharacterAction(), deleteDraftCharacterAction(), deleteScoreAction(), DRAFT_TIERS, GAMES, refreshRosterImagesFromApiAction() (+16 more)

### Community 17 - "Community 17"
Cohesion: 0.21
Nodes (9): ALLOWED_MIME, DELETE(), Params, POST(), ALLOWED_MIME, DELETE(), Params, POST() (+1 more)

### Community 18 - "Community 18"
Cohesion: 0.14
Nodes (13): Ajouter un jeu (système pluggable), Ajouter un personnage, Ajouter une catégorie, Ajouter une condition (JJK Pyramid), 📁 Architecture, 🚀 Démarrage local, ☁️ Déploiement Vercel, JJK Arcade — Plateforme de mini-jeux Jujutsu Kaisen (+5 more)

### Community 20 - "Community 20"
Cohesion: 0.47
Nodes (5): deleteUserAction(), setUserRoleAction(), deleteUser(), getUserRole(), setUserRole()

### Community 21 - "Community 21"
Cohesion: 0.09
Nodes (41): guessAction(), newAdminGameAction(), newVipGameAction(), submitJjkdleScoreAction(), CharacterSearch(), CharacterSearchProps, coprimeStep(), dayNumber() (+33 more)

### Community 22 - "Community 22"
Cohesion: 0.17
Nodes (14): AccountForms(), AccountPage(), metadata, Feedback, LeaderboardAdmin(), LeaderboardAdminProps, getUserDraftScore(), SaveDraftInput (+6 more)

### Community 23 - "Community 23"
Cohesion: 0.09
Nodes (37): BuilderGame(), BuilderGameProps, CategoryTile(), CategoryTileProps, RankFooter(), RankFooterProps, ScoreReveal(), ScoreRevealProps (+29 more)

### Community 24 - "Community 24"
Cohesion: 0.16
Nodes (17): buildUrl(), candidateTags(), fetchPosts(), ImageLookup, ImageRefreshResult, lookupImage(), nameToTag(), PostsResult (+9 more)

### Community 25 - "Community 25"
Cohesion: 0.21
Nodes (13): getCachedImage(), metadata, CharacterRow, getCharacterMap(), getConditions(), toCharacter(), toDraftCharacter(), Leaderboard() (+5 more)

### Community 26 - "Community 26"
Cohesion: 0.23
Nodes (10): formatScore(), AttemptsBar(), AttemptsBarProps, RankingCondition, scoreForAttempt(), RankingGame(), RankingGameProps, Status (+2 more)

### Community 27 - "Community 27"
Cohesion: 0.15
Nodes (9): prisma, ConditionDef, CONDITIONS, CRITERION_META, DEFS, LoreConditionDef, StatConditionDef, StatCriterion (+1 more)

### Community 28 - "Community 28"
Cohesion: 0.20
Nodes (11): GET(), GAMES, SubmitResult, submitScoreAction(), GAMES, LeaderboardGame, MAX_SCORE, saveScore() (+3 more)

### Community 29 - "Community 29"
Cohesion: 0.24
Nodes (11): Rng, shuffle(), CONDITION_DEFS, criterionValue(), ATTEMPT_SCORES, checkPlacement(), isComplete(), pickRandomCondition() (+3 more)

### Community 30 - "Community 30"
Cohesion: 0.31
Nodes (8): AdminPage(), metadata, readRoster(), listUsers(), listDraftCharacters(), listAllDraftScores(), listAllJjkdleScores(), listAllScores()

### Community 31 - "Community 31"
Cohesion: 0.36
Nodes (5): JjkdleLeaderboardEntry, topJjkdleEntries(), JjkdleLeaderboard(), JjkdleLeaderboardProps, MEDALS

### Community 32 - "Community 32"
Cohesion: 0.29
Nodes (6): GAME_GLYPH, GAME_LABEL, LeaderboardProps, LeaderboardRow(), MEDALS, LeaderboardEntry

## Knowledge Gaps
- **191 isolated node(s):** `allow`, `metadata`, `metadata`, `metadata`, `TIERS` (+186 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Character` connect `Pyramid Game & Ranking Logic` to `Builder, Draw & Scoring`, `Community 4`, `Community 5`, `Claude Permissions Config`, `Community 16`, `Community 21`, `Community 23`, `Community 25`, `Community 26`, `Community 27`, `Community 30`?**
  _High betweenness centrality (0.136) - this node is a cross-community bridge._
- **Why does `getCurrentUser` connect `Community 4` to `Auth & Site Shell`, `Community 5`, `Leaderboard`, `Community 16`, `Community 17`, `Community 21`, `Community 22`, `Community 25`, `Community 28`, `Community 30`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **Why does `DraftCharacter` connect `Community 5` to `Community 16`, `Pyramid Game & Ranking Logic`, `Community 30`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `getCurrentUser` (e.g. with `BattleLobbyPage()` and `LobbyPage()`) actually correct?**
  _`getCurrentUser` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `allow`, `metadata`, `metadata` to the rest of the system?**
  _191 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Pyramid Game & Ranking Logic` be split into smaller, more focused modules?**
  _Cohesion score 0.06271186440677966 - nodes in this community are weakly interconnected._
- **Should `Auth & Site Shell` be split into smaller, more focused modules?**
  _Cohesion score 0.07087486157253599 - nodes in this community are weakly interconnected._