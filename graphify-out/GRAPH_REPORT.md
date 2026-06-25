# Graph Report - jjkdle  (2026-06-25)

## Corpus Check
- 72 files · ~208,523 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 362 nodes · 716 edges · 18 communities (13 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c07be2b3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Builder, Draw & Scoring|Builder, Draw & Scoring]]
- [[_COMMUNITY_Pyramid Game & Ranking Logic|Pyramid Game & Ranking Logic]]
- [[_COMMUNITY_Auth & Site Shell|Auth & Site Shell]]
- [[_COMMUNITY_Dependencies & Tooling|Dependencies & Tooling]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Leaderboard|Leaderboard]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Game Registry & Showcase|Game Registry & Showcase]]
- [[_COMMUNITY_Domain Concepts & Rationale|Domain Concepts & Rationale]]
- [[_COMMUNITY_Claude Permissions Config|Claude Permissions Config]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]
- [[_COMMUNITY_Tailwind Config|Tailwind Config]]
- [[_COMMUNITY_Next.js Config|Next.js Config]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]

## God Nodes (most connected - your core abstractions)
1. `Character` - 22 edges
2. `getCurrentUser` - 16 edges
3. `compilerOptions` - 16 edges
4. `CategoryConfig` - 13 edges
5. `getAdminUser()` - 12 edges
6. `scripts` - 12 edges
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
- `AdminDashboardProps` --references--> `CategoryConfig`  [EXTRACTED]
  app/admin/AdminDashboard.tsx → data/roster/categories.ts

## Import Cycles
- 1-file cycle: `data/roster/characters.ts -> data/roster/characters.ts`

## Communities (18 total, 5 thin omitted)

### Community 0 - "Builder, Draw & Scoring"
Cohesion: 0.09
Nodes (42): BuilderGameProps, CategoryTile(), CategoryTileProps, CharacterImage(), CharacterImageProps, initials(), RankFooter(), RankFooterProps (+34 more)

### Community 1 - "Pyramid Game & Ranking Logic"
Cohesion: 0.08
Nodes (33): Rng, shuffle(), formatScore(), prisma, AttemptsBar(), AttemptsBarProps, CharacterPool(), CharacterPoolProps (+25 more)

### Community 2 - "Auth & Site Shell"
Cohesion: 0.09
Nodes (27): inter, metadata, RootLayout(), spaceGrotesk, AuthResult, loginAction(), logoutAction(), registerAction() (+19 more)

### Community 3 - "Dependencies & Tooling"
Cohesion: 0.05
Nodes (37): dependencies, @dnd-kit/core, @dnd-kit/utilities, framer-motion, next, @prisma/client, react, react-dom (+29 more)

### Community 4 - "Community 4"
Cohesion: 0.15
Nodes (19): AdminDashboard(), AdminPage(), metadata, readRoster(), listUsers(), BuilderGame(), BuilderPage(), metadata (+11 more)

### Community 6 - "Leaderboard"
Cohesion: 0.16
Nodes (17): GAMES, SubmitResult, submitScoreAction(), GAME_GLYPH, GAME_LABEL, Leaderboard(), LeaderboardProps, LeaderboardRow() (+9 more)

### Community 7 - "TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 8 - "Game Registry & Showcase"
Cohesion: 0.21
Nodes (8): STATS, GameCard(), GameCardProps, FEATURES, metadata, GAMES, Game, GameShowcase()

### Community 9 - "Domain Concepts & Rationale"
Cohesion: 0.18
Nodes (17): Character SVG Naming Convention, Original-Only Assets Policy, Best Score Persistence (httpOnly cookie), Build the Perfect Sorcerer (tap game), Draw Eligibility & Random Draw (seedable), Grade Tiers (Grade 4- to Grade S), JJK Arcade Platform, JJK Pyramid (ranking game) (+9 more)

### Community 16 - "Community 16"
Cohesion: 0.07
Nodes (39): ActionResult, deleteCharacterAction(), deleteScoreAction(), deleteUserAction(), GAMES, ROLES, saveCharacterAction(), setUserRoleAction() (+31 more)

### Community 18 - "Community 18"
Cohesion: 0.14
Nodes (13): Ajouter un jeu (système pluggable), Ajouter un personnage, Ajouter une catégorie, Ajouter une condition (JJK Pyramid), 📁 Architecture, 🚀 Démarrage local, ☁️ Déploiement Vercel, JJK Arcade — Plateforme de mini-jeux Jujutsu Kaisen (+5 more)

## Knowledge Gaps
- **122 isolated node(s):** `allow`, `metadata`, `metadata`, `TIERS`, `CatField` (+117 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Character` connect `Builder, Draw & Scoring` to `Community 16`, `Pyramid Game & Ranking Logic`, `Community 4`?**
  _High betweenness centrality (0.095) - this node is a cross-community bridge._
- **Why does `Logo()` connect `Auth & Site Shell` to `Game Registry & Showcase`, `Builder, Draw & Scoring`, `Pyramid Game & Ranking Logic`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `getCurrentUser` connect `Auth & Site Shell` to `Community 16`, `Community 4`, `Leaderboard`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `allow`, `metadata`, `metadata` to the rest of the system?**
  _122 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Builder, Draw & Scoring` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `Pyramid Game & Ranking Logic` be split into smaller, more focused modules?**
  _Cohesion score 0.08244897959183674 - nodes in this community are weakly interconnected._
- **Should `Auth & Site Shell` be split into smaller, more focused modules?**
  _Cohesion score 0.08974358974358974 - nodes in this community are weakly interconnected._