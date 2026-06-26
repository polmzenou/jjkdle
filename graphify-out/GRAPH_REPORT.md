# Graph Report - jjkdle  (2026-06-26)

## Corpus Check
- 131 files · ~324,054 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 658 nodes · 1720 edges · 23 communities (19 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `941aca35`
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

## God Nodes (most connected - your core abstractions)
1. `getCurrentUser` - 51 edges
2. `Character` - 33 edges
3. `CategoryConfig` - 25 edges
4. `SerializedLobby` - 24 edges
5. `DraftCharacter` - 23 edges
6. `findLobby()` - 23 edges
7. `RosterMap` - 19 edges
8. `getAdminUser()` - 17 edges
9. `getRoster()` - 17 edges
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

## Communities (23 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (55): GauntletCardLog, GauntletDeck(), GauntletDeckProps, CharacterImage(), CharacterImageProps, initials(), Draw, drawAll() (+47 more)

### Community 1 - "Community 1"
Cohesion: 0.16
Nodes (10): AdminDashboard(), CatField, FormState, Tab, TAB_LABELS, TAB_ORDER, TIERS, ImageDropzone() (+2 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (27): AccountForms(), inter, metadata, RootLayout(), spaceGrotesk, AuthResult, loginAction(), logoutAction() (+19 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (39): dependencies, @dnd-kit/core, @dnd-kit/utilities, framer-motion, next, @prisma/client, pusher, pusher-js (+31 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (64): PageProps, PageProps, POST(), getCurrentUser, SessionUser, applyLeave(), broadcastBattle(), createBattleLobbyAction() (+56 more)

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (67): DRAFT_TIERS, DraftRosterAdmin(), DraftRosterAdminProps, EMPTY_FORM, FormState, TIER_COLOR, GET(), canSelect() (+59 more)

### Community 6 - "Community 6"
Cohesion: 0.10
Nodes (28): AccountPage(), metadata, GET(), getCharacterMap(), getConditions(), getUserDraftScore(), GAMES, SubmitResult (+20 more)

### Community 7 - "Community 7"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 8 - "Community 8"
Cohesion: 0.14
Nodes (9): STATS, GameCard(), GameCardProps, FEATURES, metadata, GAMES, Game, GameShowcase() (+1 more)

### Community 9 - "Community 9"
Cohesion: 0.18
Nodes (17): Character SVG Naming Convention, Original-Only Assets Policy, Best Score Persistence (httpOnly cookie), Build the Perfect Sorcerer (tap game), Draw Eligibility & Random Draw (seedable), Grade Tiers (Grade 4- to Grade S), JJK Arcade Platform, JJK Pyramid (ranking game) (+9 more)

### Community 10 - "Community 10"
Cohesion: 0.05
Nodes (85): BattleCombat(), BattleCombatProps, BattleLobby(), BattleLobbyProps, BattleResult(), BattleResultProps, battleValueOf(), battleValues (+77 more)

### Community 13 - "Community 13"
Cohesion: 0.22
Nodes (4): byCat, CATEGORIES, prisma, scores

### Community 16 - "Community 16"
Cohesion: 0.14
Nodes (19): ActionResult, deleteCharacterAction(), deleteDraftCharacterAction(), deleteScoreAction(), DRAFT_TIERS, GAMES, saveCharacterAction(), saveDraftCharacterAction() (+11 more)

### Community 17 - "Community 17"
Cohesion: 0.21
Nodes (9): ALLOWED_MIME, DELETE(), Params, POST(), ALLOWED_MIME, DELETE(), Params, POST() (+1 more)

### Community 18 - "Community 18"
Cohesion: 0.14
Nodes (13): Ajouter un jeu (système pluggable), Ajouter un personnage, Ajouter une catégorie, Ajouter une condition (JJK Pyramid), 📁 Architecture, 🚀 Démarrage local, ☁️ Déploiement Vercel, JJK Arcade — Plateforme de mini-jeux Jujutsu Kaisen (+5 more)

### Community 20 - "Community 20"
Cohesion: 0.26
Nodes (10): deleteUserAction(), setUserRoleAction(), AdminDashboardProps, Feedback, UserAdmin(), UserAdminProps, AdminUser, deleteUser() (+2 more)

### Community 21 - "Community 21"
Cohesion: 0.33
Nodes (7): AdminPage(), metadata, readRoster(), listUsers(), listDraftCharacters(), listAllDraftScores(), listAllScores()

### Community 22 - "Community 22"
Cohesion: 0.40
Nodes (5): Feedback, LeaderboardAdmin(), LeaderboardAdminProps, getGame(), AdminScore

## Knowledge Gaps
- **159 isolated node(s):** `metadata`, `metadata`, `metadata`, `TIERS`, `CatField` (+154 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getCurrentUser` connect `Community 4` to `Community 2`, `Community 5`, `Community 6`, `Community 17`, `Community 21`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **Why does `Character` connect `Community 10` to `Community 0`, `Community 1`, `Community 16`, `Community 20`, `Community 21`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `DraftCharacter` connect `Community 5` to `Community 16`, `Community 1`, `Community 20`, `Community 21`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `getCurrentUser` (e.g. with `BattleLobbyPage()` and `LobbyPage()`) actually correct?**
  _`getCurrentUser` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `metadata`, `metadata`, `metadata` to the rest of the system?**
  _159 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05297334244702666 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06976744186046512 - nodes in this community are weakly interconnected._