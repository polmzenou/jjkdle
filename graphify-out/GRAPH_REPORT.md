# Graph Report - jjkdle  (2026-06-25)

## Corpus Check
- 69 files · ~207,531 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 346 nodes · 698 edges · 17 communities (13 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c55ecac0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]

## God Nodes (most connected - your core abstractions)
1. `Character` - 22 edges
2. `getCurrentUser` - 16 edges
3. `compilerOptions` - 16 edges
4. `CategoryConfig` - 13 edges
5. `scripts` - 12 edges
6. `getAdminUser()` - 10 edges
7. `CategoryId` - 9 edges
8. `formatScore()` - 9 edges
9. `JJK Arcade — Plateforme de mini-jeux Jujutsu Kaisen` - 9 edges
10. `LeaderboardGame` - 8 edges

## Surprising Connections (you probably didn't know these)
- `LeaderboardRow()` --calls--> `formatScore()`  [EXTRACTED]
  components/leaderboard/Leaderboard.tsx → lib/format.ts
- `LoginPage()` --calls--> `getCurrentUser`  [EXTRACTED]
  app/(auth)/login/page.tsx → lib/auth/session.ts
- `RegisterPage()` --calls--> `getCurrentUser`  [EXTRACTED]
  app/(auth)/register/page.tsx → lib/auth/session.ts
- `FormState` --references--> `CharacterTier`  [EXTRACTED]
  app/admin/AdminDashboard.tsx → data/roster/characters.ts
- `AdminDashboardProps` --references--> `AdminScore`  [EXTRACTED]
  app/admin/AdminDashboard.tsx → lib/leaderboard/store.ts

## Import Cycles
- 1-file cycle: `data/roster/characters.ts -> data/roster/characters.ts`

## Communities (17 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.13
Nodes (29): AdminDashboardProps, BuilderGameProps, CategoryTile(), CategoryTileProps, CharacterImage(), CharacterImageProps, initials(), RankFooter() (+21 more)

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (31): SubmitScore(), formatScore(), AttemptsBar(), AttemptsBarProps, CharacterPool(), CharacterPoolProps, CONDITIONS, RankingCondition (+23 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (27): inter, metadata, RootLayout(), spaceGrotesk, AuthResult, loginAction(), logoutAction(), registerAction() (+19 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (37): dependencies, @dnd-kit/core, @dnd-kit/utilities, framer-motion, next, @prisma/client, react, react-dom (+29 more)

### Community 4 - "Community 4"
Cohesion: 0.15
Nodes (19): AdminPage(), metadata, readRoster(), BuilderGame(), BuilderPage(), metadata, CharacterRow, getCategories() (+11 more)

### Community 6 - "Community 6"
Cohesion: 0.17
Nodes (16): GAMES, SubmitResult, submitScoreAction(), GAME_GLYPH, GAME_LABEL, LeaderboardProps, LeaderboardRow(), MEDALS (+8 more)

### Community 7 - "Community 7"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 8 - "Community 8"
Cohesion: 0.21
Nodes (8): STATS, GameCard(), GameCardProps, FEATURES, metadata, GAMES, Game, GameShowcase()

### Community 9 - "Community 9"
Cohesion: 0.18
Nodes (17): Character SVG Naming Convention, Original-Only Assets Policy, Best Score Persistence (httpOnly cookie), Build the Perfect Sorcerer (tap game), Draw Eligibility & Random Draw (seedable), Grade Tiers (Grade 4- to Grade S), JJK Arcade Platform, JJK Pyramid (ranking game) (+9 more)

### Community 16 - "Community 16"
Cohesion: 0.08
Nodes (30): ActionResult, deleteCharacterAction(), deleteScoreAction(), GAMES, saveCharacterAction(), TIERS, updateScoreAction(), AdminDashboard() (+22 more)

### Community 17 - "Community 17"
Cohesion: 0.22
Nodes (15): Draw, drawAll(), drawAllOne(), drawCategory(), drawOne(), eligibleFor(), redrawUnlocked(), redrawUnlockedOne() (+7 more)

### Community 18 - "Community 18"
Cohesion: 0.14
Nodes (13): Ajouter un jeu (système pluggable), Ajouter un personnage, Ajouter une catégorie, Ajouter une condition (JJK Pyramid), 📁 Architecture, 🚀 Démarrage local, ☁️ Déploiement Vercel, JJK Arcade — Plateforme de mini-jeux Jujutsu Kaisen (+5 more)

## Knowledge Gaps
- **119 isolated node(s):** `metadata`, `metadata`, `TIERS`, `CatField`, `Tab` (+114 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Character` connect `Community 0` to `Community 16`, `Community 17`, `Community 4`, `Community 1`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `Logo()` connect `Community 2` to `Community 8`, `Community 0`, `Community 1`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `getCurrentUser` connect `Community 2` to `Community 16`, `Community 4`, `Community 6`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `metadata`, `metadata`, `TIERS` to the rest of the system?**
  _119 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.1254355400696864 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.08888888888888889 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.08974358974358974 - nodes in this community are weakly interconnected._