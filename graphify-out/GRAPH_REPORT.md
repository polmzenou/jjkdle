# Graph Report - .  (2026-06-25)

## Corpus Check
- 67 files · ~217,683 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 314 nodes · 620 edges · 17 communities (13 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.8)
- Token cost: 26,159 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Auth & Site Shell|Auth & Site Shell]]
- [[_COMMUNITY_Dependencies & Tooling|Dependencies & Tooling]]
- [[_COMMUNITY_Pyramid Game UI|Pyramid Game UI]]
- [[_COMMUNITY_Draw & Ranking Logic|Draw & Ranking Logic]]
- [[_COMMUNITY_Builder Game & Scoring|Builder Game & Scoring]]
- [[_COMMUNITY_Content Queries & Pages|Content Queries & Pages]]
- [[_COMMUNITY_Leaderboard|Leaderboard]]
- [[_COMMUNITY_Admin & Roster Editing|Admin & Roster Editing]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Game Registry & Showcase|Game Registry & Showcase]]
- [[_COMMUNITY_Domain Concepts & Rationale|Domain Concepts & Rationale]]
- [[_COMMUNITY_Claude Permissions Config|Claude Permissions Config]]
- [[_COMMUNITY_Next.js Config|Next.js Config]]
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
- `LeaderboardRow()` --calls--> `formatScore()`  [EXTRACTED]
  components/leaderboard/Leaderboard.tsx → lib/format.ts
- `LoginPage()` --calls--> `getCurrentUser`  [EXTRACTED]
  app/(auth)/login/page.tsx → lib/auth/session.ts
- `RegisterPage()` --calls--> `getCurrentUser`  [EXTRACTED]
  app/(auth)/register/page.tsx → lib/auth/session.ts
- `FormState` --references--> `CharacterTier`  [EXTRACTED]
  app/admin/AdminDashboard.tsx → data/roster/characters.ts

## Import Cycles
- 1-file cycle: `data/roster/characters.ts -> data/roster/characters.ts`

## Hyperedges (group relationships)
- **Builder scoring & grading pipeline** — jjkdle_readme_build_the_perfect_sorcerer, jjkdle_readme_draw_eligibility, jjkdle_readme_scoring_logic, jjkdle_readme_grade_tiers [EXTRACTED 1.00]
- **Roster data shared across games and assets** — jjkdle_readme_roster_data, jjkdle_readme_draw_eligibility, jjkdle_readme_ranking_conditions, assets_readme_character_svg_convention [INFERRED 0.85]

## Communities (17 total, 4 thin omitted)

### Community 0 - "Auth & Site Shell"
Cohesion: 0.10
Nodes (26): inter, metadata, RootLayout(), spaceGrotesk, AuthResult, loginAction(), logoutAction(), registerAction() (+18 more)

### Community 1 - "Dependencies & Tooling"
Cohesion: 0.05
Nodes (37): dependencies, @dnd-kit/core, @dnd-kit/utilities, framer-motion, next, @prisma/client, react, react-dom (+29 more)

### Community 2 - "Pyramid Game UI"
Cohesion: 0.11
Nodes (23): formatScore(), AttemptsBar(), AttemptsBarProps, CharacterPool(), CharacterPoolProps, RankingCondition, DraggableCard(), DraggableCardProps (+15 more)

### Community 3 - "Draw & Ranking Logic"
Cohesion: 0.12
Nodes (26): Draw, drawAll(), drawAllOne(), drawCategory(), drawOne(), eligibleFor(), redrawUnlocked(), redrawUnlockedOne() (+18 more)

### Community 4 - "Builder Game & Scoring"
Cohesion: 0.16
Nodes (23): AdminDashboardProps, BuilderGameProps, CategoryTile(), CategoryTileProps, RankFooter(), RankFooterProps, ScoreReveal(), ScoreRevealProps (+15 more)

### Community 5 - "Content Queries & Pages"
Cohesion: 0.15
Nodes (18): AdminDashboard(), AdminPage(), metadata, readRoster(), BuilderGame(), BuilderPage(), metadata, CharacterRow (+10 more)

### Community 6 - "Leaderboard"
Cohesion: 0.15
Nodes (18): GAMES, SubmitResult, submitScoreAction(), GAME_GLYPH, GAME_LABEL, Leaderboard(), LeaderboardProps, LeaderboardRow() (+10 more)

### Community 7 - "Admin & Roster Editing"
Cohesion: 0.15
Nodes (15): ActionResult, deleteCharacterAction(), saveCharacterAction(), TIERS, CatField, FormState, TIERS, deleteCharacter() (+7 more)

### Community 8 - "TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 9 - "Game Registry & Showcase"
Cohesion: 0.18
Nodes (9): HIGHLIGHTS, STATS, GameCard(), GameCardProps, FEATURES, metadata, GAMES, Game (+1 more)

### Community 10 - "Domain Concepts & Rationale"
Cohesion: 0.18
Nodes (17): Character SVG Naming Convention, Original-Only Assets Policy, Best Score Persistence (httpOnly cookie), Build the Perfect Sorcerer (tap game), Draw Eligibility & Random Draw (seedable), Grade Tiers (Grade 4- to Grade S), JJK Arcade Platform, JJK Pyramid (ranking game) (+9 more)

## Knowledge Gaps
- **104 isolated node(s):** `allow`, `metadata`, `metadata`, `TIERS`, `CatField` (+99 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Character` connect `Builder Game & Scoring` to `Pyramid Game UI`, `Draw & Ranking Logic`, `Content Queries & Pages`, `Admin & Roster Editing`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Why does `Logo()` connect `Auth & Site Shell` to `Game Registry & Showcase`, `Pyramid Game UI`, `Builder Game & Scoring`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `getCurrentUser` connect `Auth & Site Shell` to `Content Queries & Pages`, `Leaderboard`, `Admin & Roster Editing`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **What connects `allow`, `metadata`, `metadata` to the rest of the system?**
  _104 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Auth & Site Shell` be split into smaller, more focused modules?**
  _Cohesion score 0.0953058321479374 - nodes in this community are weakly interconnected._
- **Should `Dependencies & Tooling` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._
- **Should `Pyramid Game UI` be split into smaller, more focused modules?**
  _Cohesion score 0.11092436974789915 - nodes in this community are weakly interconnected._