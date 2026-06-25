# Graph Report - .  (2026-06-25)

## Corpus Check
- 5 files · ~218,584 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 319 nodes · 625 edges · 16 communities (13 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Builder, Draw & Scoring|Builder, Draw & Scoring]]
- [[_COMMUNITY_Pyramid Game & Ranking Logic|Pyramid Game & Ranking Logic]]
- [[_COMMUNITY_Auth & Site Shell|Auth & Site Shell]]
- [[_COMMUNITY_Dependencies & Tooling|Dependencies & Tooling]]
- [[_COMMUNITY_Content Queries & Pages|Content Queries & Pages]]
- [[_COMMUNITY_Admin & Roster Editing|Admin & Roster Editing]]
- [[_COMMUNITY_Leaderboard|Leaderboard]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Game Registry & Showcase|Game Registry & Showcase]]
- [[_COMMUNITY_Domain Concepts & Rationale|Domain Concepts & Rationale]]
- [[_COMMUNITY_Claude Permissions Config|Claude Permissions Config]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]
- [[_COMMUNITY_Tailwind Config|Tailwind Config]]

## God Nodes (most connected - your core abstractions)
1. `Character` - 22 edges
2. `getCurrentUser` - 16 edges
3. `compilerOptions` - 16 edges
4. `CategoryConfig` - 13 edges
5. `scripts` - 12 edges
6. `CategoryId` - 9 edges
7. `formatScore()` - 9 edges
8. `Logo()` - 7 edges
9. `RankingCard()` - 7 edges
10. `getBestScore()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `CharacterImageProps` --references--> `Character`  [EXTRACTED]
  components/CharacterImage.tsx → data/roster/characters.ts
- `LoginPage()` --calls--> `getCurrentUser`  [EXTRACTED]
  app/(auth)/login/page.tsx → lib/auth/session.ts
- `RegisterPage()` --calls--> `getCurrentUser`  [EXTRACTED]
  app/(auth)/register/page.tsx → lib/auth/session.ts
- `FormState` --references--> `CharacterTier`  [EXTRACTED]
  app/admin/AdminDashboard.tsx → data/roster/characters.ts
- `saveCharacterAction()` --calls--> `getAdminUser()`  [EXTRACTED]
  app/admin/actions.ts → lib/auth/session.ts

## Import Cycles
- None detected.

## Communities (16 total, 3 thin omitted)

### Community 0 - "Builder, Draw & Scoring"
Cohesion: 0.10
Nodes (38): AdminDashboardProps, BuilderGameProps, CategoryTile(), CategoryTileProps, RankFooter(), RankFooterProps, ScoreReveal(), ScoreRevealProps (+30 more)

### Community 1 - "Pyramid Game & Ranking Logic"
Cohesion: 0.08
Nodes (36): Rng, seededRng(), shuffle(), LeaderboardRow(), SubmitScore(), formatScore(), AttemptsBar(), AttemptsBarProps (+28 more)

### Community 2 - "Auth & Site Shell"
Cohesion: 0.08
Nodes (28): inter, metadata, RootLayout(), spaceGrotesk, AuthResult, loginAction(), logoutAction(), registerAction() (+20 more)

### Community 3 - "Dependencies & Tooling"
Cohesion: 0.06
Nodes (36): dependencies, @dnd-kit/core, @dnd-kit/utilities, framer-motion, next, @prisma/client, react, react-dom (+28 more)

### Community 4 - "Content Queries & Pages"
Cohesion: 0.15
Nodes (18): AdminDashboard(), AdminPage(), metadata, readRoster(), BuilderGame(), BuilderPage(), metadata, CharacterRow (+10 more)

### Community 5 - "Admin & Roster Editing"
Cohesion: 0.14
Nodes (15): ActionResult, deleteCharacterAction(), saveCharacterAction(), TIERS, CatField, FormState, TIERS, ImageDropzone() (+7 more)

### Community 6 - "Leaderboard"
Cohesion: 0.17
Nodes (16): GAMES, SubmitResult, submitScoreAction(), GAME_GLYPH, GAME_LABEL, Leaderboard(), LeaderboardProps, MEDALS (+8 more)

### Community 7 - "TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 8 - "Game Registry & Showcase"
Cohesion: 0.18
Nodes (9): HIGHLIGHTS, STATS, GameCard(), GameCardProps, FEATURES, metadata, GAMES, Game (+1 more)

### Community 9 - "Domain Concepts & Rationale"
Cohesion: 0.18
Nodes (17): Character SVG Naming Convention, Original-Only Assets Policy, Best Score Persistence (httpOnly cookie), Build the Perfect Sorcerer (tap game), Draw Eligibility & Random Draw (seedable), Grade Tiers (Grade 4- to Grade S), JJK Arcade Platform, JJK Pyramid (ranking game) (+9 more)

## Knowledge Gaps
- **104 isolated node(s):** `allow`, `metadata`, `metadata`, `TIERS`, `CatField` (+99 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Character` connect `Builder, Draw & Scoring` to `Pyramid Game & Ranking Logic`, `Content Queries & Pages`, `Admin & Roster Editing`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **Why does `Logo()` connect `Auth & Site Shell` to `Game Registry & Showcase`, `Builder, Draw & Scoring`, `Pyramid Game & Ranking Logic`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `getCurrentUser` connect `Auth & Site Shell` to `Content Queries & Pages`, `Leaderboard`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **What connects `allow`, `metadata`, `metadata` to the rest of the system?**
  _104 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Builder, Draw & Scoring` be split into smaller, more focused modules?**
  _Cohesion score 0.09724238026124818 - nodes in this community are weakly interconnected._
- **Should `Pyramid Game & Ranking Logic` be split into smaller, more focused modules?**
  _Cohesion score 0.0792156862745098 - nodes in this community are weakly interconnected._
- **Should `Auth & Site Shell` be split into smaller, more focused modules?**
  _Cohesion score 0.07716701902748414 - nodes in this community are weakly interconnected._