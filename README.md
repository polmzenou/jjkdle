# JJK Arcade — Plateforme de mini-jeux Jujutsu Kaisen

Plateforme web **modulaire** de mini-jeux autour de l'univers Jujutsu Kaisen.
Jeux disponibles : **Build the Perfect Sorcerer** (tap game) et **JJK Pyramid**
(jeu de classement).

> ⚠️ Fan-projet non officiel. **Aucun asset officiel copyrighté** : tous les
> visuels sont des silhouettes/placeholders originaux.

## ✨ Le jeu : Build the Perfect Sorcerer

- Une ligne par **catégorie de stat** (Sort inné, Vitesse, Maîtrise du Domaine…).
- Chaque catégorie propose des personnages **éligibles** tirés aléatoirement
  (un personnage n'apparaît que dans les catégories où il a une note — tous
  n'ont pas, p. ex., d'Extension du Territoire).
- Choisir un personnage **verrouille** la catégorie et **re-mélange** les autres.
- Un personnage peut être **réutilisé** dans plusieurs catégories.
- Score final = somme pondérée des notes, **normalisée sur 1000**.
- Grades : Grade 4− → Grade S.

| Score      | Grade    |
| ---------- | -------- |
| < 500      | Grade 4− |
| ≥ 500      | Grade 4  |
| ≥ 600      | Grade 3  |
| ≥ 700      | Grade 2  |
| ≥ 850      | Grade 1  |
| 980–1000   | Grade S  |

Le **meilleur score** est conservé localement dans un cookie `httpOnly`
(aucun compte requis).

## 🧱 Stack

- **Next.js (App Router) + TypeScript** — UI + Server Actions.
- **Tailwind CSS** — thème sombre/néon "cursed energy".
- **Framer Motion** — animations de shuffle / reveal.
- **Vitest** — tests unitaires de la logique de score et de tirage.
- **Vercel** — hébergement (aucune écriture filesystem).

## 🚀 Démarrage local

```bash
npm install
npm run dev          # http://localhost:3000
```

Aucune variable d'environnement n'est nécessaire pour le MVP.

```bash
npm run test         # tests unitaires (scoring + tirage)
npm run build        # build de production
```

## 📁 Architecture

```
app/
  layout.tsx              # shell global + fond cursed-energy
  page.tsx                # hub : liste des jeux (registre)
  games/builder/
    page.tsx              # page serveur (best score cookie + data)
    BuilderGame.tsx       # client : boucle de jeu (tirage, verrouillage)
  api/leaderboard/route.ts# stub MVP (local-only) + guide d'activation
components/
  CategoryRow / CharacterCard / ScoreReveal / GameCard / CursedBackground
lib/
  games/{types,registry}  # interface Game + registre pluggable
  scoring/{grades,scoring} # logique de score (testée) + paliers de grade
  draw/draw.ts            # éligibilité + tirage aléatoire (seedable, testé)
  bestScore.ts            # Server Actions cookie httpOnly
data/roster/
  categories.ts           # catégories {id,label,weight,drawCount}
  characters.ts           # roster + ratings partiels (= éligibilité)
prisma/schema.prisma      # modèle leaderboard (optionnel, futur)
public/assets/            # SVG originaux / placeholders
```

### Ajouter un personnage

Éditer `data/roster/characters.ts` : ajouter une entrée `Character`. Les clés
présentes dans `ratings` déterminent les catégories où il peut apparaître.

### Ajouter une catégorie

Éditer `data/roster/categories.ts` : ajouter un `CategoryConfig`
(`weight` = importance dans le score, `drawCount` = cartes max par ligne).

### Ajouter un jeu (système pluggable)

1. Ajouter une entrée `Game` dans `lib/games/registry.ts`.
2. Créer la route `app/games/<id>/page.tsx`.

## 🔺 Le jeu : JJK Pyramid

Jeu de **classement**. Une consigne est tirée au hasard à chaque chargement
(« Classe ces sorciers du plus fort au plus faible »…). Place les 8 personnages
dans les slots 1→8 (**drag & drop** ou **tap-to-place**), puis **CHECK ORDER** :

- Les bonnes positions se **verrouillent** (vert + 🔒).
- Les mauvaises (flash rouge) **retournent** dans la zone « Available ».
- **4 tentatives**. Points selon la tentative gagnante : 10 000 / 7 500 / 5 000 /
  2 500. Épuiser les 4 tentatives = **Game Over**.

Best score persistant en cookie (clé `ranking`).

### Ajouter une condition (JJK Pyramid)

Éditer `data/ranking/conditions.ts` : ajouter un objet `RankingCondition` avec
`category`, `prompt` et `order` = **8 `id` de personnages**, du plus fort (rang 1)
au plus faible (rang 8). Les `id` doivent exister dans le roster
(`data/roster/characters.ts`) ; sinon, créer d'abord le personnage (un perso avec
`ratings: {}` n'apparaît pas dans le builder mais reste utilisable ici).

## ☁️ Déploiement Vercel

1. Pousser le repo sur GitHub.
2. Importer le projet sur [vercel.com](https://vercel.com) (preset **Next.js**,
   détecté automatiquement).
3. Aucune variable requise pour le MVP → **Deploy**.

> SQLite est volontairement **évité** : le filesystem Vercel est éphémère. Le
> best score passe par un cookie, pas par un fichier.

## 🗄️ (Optionnel) Leaderboard global — Neon + Prisma

Le MVP fonctionne sans base. Pour un classement global anonyme :

1. Créer une base sur [neon.tech](https://neon.tech) et copier la connection
   string dans `DATABASE_URL` (voir `.env.example`). Sur Vercel, ajouter la
   variable dans **Project Settings → Environment Variables**.
2. Installer Prisma : `npm install @prisma/client && npm install -D prisma`.
3. Décommenter `model LeaderboardEntry` dans `prisma/schema.prisma`, puis :
   ```bash
   npx prisma generate
   npx prisma migrate deploy
   ```
4. Renommer `lib/prisma.ts.example` → `lib/prisma.ts`.
5. Câbler `app/api/leaderboard/route.ts` (les handlers de référence sont en
   commentaire dans le fichier).

## ✅ Tests

La logique métier est isolée de l'UI et testée :

- `lib/scoring/scoring.test.ts` — score 0→1000, pondérations, paliers de grade.
- `lib/draw/draw.test.ts` — éligibilité, plafond de tirage, déterminisme (seed).
