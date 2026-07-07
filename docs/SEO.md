# SEO — JJK Arcade

Guide de référencement du site. La partie **technique** est déjà implémentée dans
le code ; la partie **contenu / netlinking / suivi** dépend d'actions récurrentes
côté équipe. Objectif : être **le** site le mieux référencé sur le thème des jeux
Jujutsu Kaisen / anime, en français d'abord.

---

## 1. Ce qui est déjà en place (technique)

| Levier | Où | Détail |
|---|---|---|
| Config SEO centralisée | `lib/seo/config.ts` | `SITE_URL`, `SITE_NAME`, mots-clés, helpers `absoluteUrl()`, `gameMetadata()`. Source unique. |
| `metadataBase` + métadonnées racine | `app/layout.tsx` | Titre avec template `%s · JJK Arcade`, description, Open Graph, Twitter Card, robots, canonical. |
| Métadonnées par jeu | `app/games/*/page.tsx` via `gameMetadata(id)` | Titre + description + canonical + OG image (screenshot du jeu), générés depuis `lib/games/registry.ts`. |
| Sitemap | `app/sitemap.ts` → `/sitemap.xml` | Home, hub et jeux « live ». JJKdle en priorité/fraîcheur max. |
| Robots | `app/robots.ts` → `/robots.txt` | Autorise le public, bloque privé/API/profils, pointe le sitemap. |
| Manifest PWA | `app/manifest.ts` → `/manifest.webmanifest` | Installable, thème violet. |
| Données structurées | `components/seo/JsonLd.tsx` | `WebSite` + `Organization` (global), `VideoGame` (par jeu), `BreadcrumbList` + `ItemList` (hub). |
| Aperçu social par défaut | `app/og/route.tsx` → `/og` | Image OG 1200×630 générée (branding). |
| Apple touch icon | `app/apple-icon.tsx` | Icône iOS générée. |
| H1 textuel | `app/page.tsx` | Texte `sr-only` riche en mots-clés dans le H1 (le visuel reste le logo). |
| Analytics + Web Vitals | `app/layout.tsx` | `@vercel/analytics` + `@vercel/speed-insights`. |

### Variable d'environnement à définir
```
NEXT_PUBLIC_SITE_URL="https://<ton-domaine-ou-url-vercel>"   # sans slash final
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION="..."                    # optionnel (Search Console)
```
> Tant que `NEXT_PUBLIC_SITE_URL` n'est pas défini, les URLs canoniques/OG
> retombent sur un fallback → **à renseigner sur Vercel** (Project → Settings →
> Environment Variables) pour que les aperçus et le sitemap soient corrects.

---

## 2. Actions manuelles à faire (une fois)

1. **Google Search Console** (https://search.google.com/search-console) : ajouter
   la propriété (domaine ou URL), vérifier (balise HTML → `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`,
   ou via DNS), puis **soumettre `/sitemap.xml`**.
2. **Bing Webmaster Tools** (https://www.bing.com/webmasters) : importer depuis
   Search Console (1 clic) + soumettre le sitemap.
3. Vérifier l'aperçu social : coller l'URL du site dans https://www.opengraph.xyz
   ou dans un message Discord/Twitter → image + titre + description doivent apparaître.
4. Valider les données structurées : https://search.google.com/test/rich-results
   sur la home, `/games` et une page de jeu.

---

## 3. Stratégie de mots-clés (FR d'abord)

Une page = une intention de recherche. Cibles principales :

| Mot-clé | Page cible | Concurrence | Note |
|---|---|---|---|
| `jjkdle` | `/games/jjkdle` | faible | **Priorité #1** : niche, fort potentiel de 1re position. |
| `wordle jujutsu kaisen` / `jjk wordle` | `/games/jjkdle` | faible | Variante EN/FR, même page. |
| `qui est-ce jujutsu kaisen` | `/games/guesswho` | faible | Requête très spécifique. |
| `quiz jujutsu kaisen` / `quiz jjk` | `/games/jjkdle`, `/games/higher-lower` | moyenne | Gros volume. |
| `jeux jujutsu kaisen` / `jeux jjk` | `/games` (hub) | moyenne | Requête « tête ». |
| `tier list jjk` / `classement personnages jjk` | `/games/ranking` | moyenne | Aligner le vocabulaire. |
| `personnage jjk le plus fort` | `/games/higher-lower` | moyenne | Intention comparaison. |

**Longue traîne** : noms de persos (Gojo, Sukuna, Itadori, Megumi, Nobara…),
« jeu anime gratuit sans compte », « jeu anime navigateur ».

---

## 4. Contenu crawlable (le plus gros levier restant)

Le site est très interactif (JS) → il faut donner **du texte** au crawler.

- **Enrichir chaque page de jeu** avec un court bloc éditorial rendu côté serveur :
  un `<h2>` « Comment jouer à … » + 1-2 paragraphes (règles, ce qu'on apprend,
  pourquoi c'est fun). 80-150 mots suffisent. Utiliser le vocabulaire cible.
- **FAQ** en bas des pages populaires (JJKdle, Qui est-ce ?) avec balisage
  `FAQPage` (schema.org) → éligible aux rich results « questions/réponses ».
  Ex. « Le perso de JJKdle change quand ? », « C'est gratuit ? », « Faut-il un compte ? ».
- **Page hub `/games`** : ajouter un paragraphe d'intro descriptif (déjà fait via
  la meta description ; le dupliquer en texte visible aide).
- Garder les **descriptions du registre** riches et à jour — elles alimentent à la
  fois l'UI, le SEO et le JSON-LD.

## 5. JJKdle = moteur de trafic récurrent

Le jeu quotidien est l'atout SEO majeur : il génère des **recherches et visites
répétées** (« jjkdle du jour », partages de résultats). À exploiter :
- Mettre JJKdle en avant sur la home et dans la nav.
- Ajouter un **bouton de partage du résultat** (façon Wordle : grille d'emojis +
  lien) → génère des backlinks et de la viralité sur Discord/Twitter.
- Priorité `daily` déjà posée dans le sitemap.

## 6. Netlinking & acquisition

Le trafic de ce type de site vient surtout du **partage communautaire** :
- **Reddit** : r/JujutsuKaisen, r/anime, r/AnimeGames, r/dailygames (poster le jeu,
  pas du spam — apporter de la valeur).
- **Discord** : serveurs JJK/anime (les aperçus OG soignés sont décisifs ici).
- **Annuaires de « -dle games »** : plusieurs sites listent les clones de Wordle
  (ex. « wordle unlimited », « framed-like games ») → demander l'ajout de JJKdle.
- **Agrégateurs de jeux anime** / listes de fan-games.
- Échanges avec d'autres créateurs de fan-games anime (liens croisés).

## 7. Performance / Core Web Vitals (signal de ranking)

- `public/logo.png` (~730 Ko) : compresser / convertir en WebP, ou le servir via
  `next/image`. Il est dans le LCP de la home.
- Vidéos hero (`public/Hero_video_background.mp4`) : `preload="none"` + `poster`,
  ne pas bloquer le rendu initial.
- Vérifier que les screenshots passent par `next/image` (AVIF/WebP déjà activés
  dans `next.config.ts`).
- Suivre les Web Vitals via Vercel Speed Insights (déjà branché).

## 8. Internationalisation (phase suivante — gros multiplicateur)

L'audience JJK/anime est **mondiale et majoritairement anglophone**. Ajouter
l'anglais peut multiplier le trafic. Plan :
- Sélecteur FR/EN dans `components/SiteNav.tsx`.
- Routing localisé (`next-intl` ou segment `[locale]`).
- Balises `hreflang` via `alternates.languages` dans les métadonnées.
- `lib/seo/config.ts` est déjà pensé pour accepter une locale ultérieurement.
- Cibler alors « jujutsu kaisen wordle », « jjk guessing game », « anime games ».

## 9. Conformité

Garder la mention **« Fan-projet non officiel · aucun asset copyrighté »**
visible (déjà en footer). Évite les problèmes de marque et rassure sur la nature
du site. Ne pas revendiquer d'affiliation officielle à Jujutsu Kaisen / Shueisha.

---

## 10. Checklist de suivi (mensuel)

- [ ] Search Console : couverture (pages indexées), requêtes, CTR, position moyenne.
- [ ] Corriger les pages non indexées / erreurs de crawl.
- [ ] Vérifier que les nouveaux jeux ajoutés au registre apparaissent dans le sitemap.
- [ ] Surveiller les Core Web Vitals (Speed Insights).
- [ ] Publier / partager le contenu (JJKdle du jour, nouveaux jeux) sur les communautés.
