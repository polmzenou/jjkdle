/**
 * Onglets du dashboard admin — module PUR.
 *
 * Extrait de `app/admin/AdminDashboard.tsx` pour une raison précise : la barre
 * de navigation se rend depuis `TAB_GROUPS`, une liste explicite, alors que le
 * reste du dashboard (libellés, sous-titres, montage du panneau) se branche sur
 * le type `Tab`. Un onglet ajouté partout SAUF dans les groupes existe donc
 * bel et bien, mais n'a aucun bouton pour l'atteindre — c'est exactement ce qui
 * est arrivé à l'onglet « Objets ».
 *
 * TypeScript ne peut pas l'attraper : un tableau incomplet reste un `Tab[]`
 * parfaitement valide. Seul un test peut vérifier l'exhaustivité, d'où ce
 * module et son `tabs.test.ts`.
 */

export type Tab =
  | "overview"
  | "roster"
  | "content"
  | "jjkdle"
  | "attributes"
  | "categories"
  | "pyramid"
  | "draft"
  | "items"
  | "leaderboard"
  | "users"
  | "cards"
  | "casino"
  | "config";

/**
 * Libellés des onglets. Trois d'entre eux nomment un JEU : leur libellé dépend
 * de l'univers administré (« Analytics JJKdle » / « Analytics CSMdle »), d'où
 * le `useTabLabels()` du dashboard plutôt qu'une constante figée.
 */
export const TAB_LABELS: Record<Tab, string> = {
  overview: "Vue d'ensemble",
  roster: "Roster",
  content: "Santé contenu",
  jjkdle: "Analytics JJKdle",
  attributes: "Attributs",
  categories: "Catégories",
  pyramid: "Pyramid",
  draft: "Jujutsu Draft",
  items: "Objets",
  leaderboard: "Leaderboard",
  users: "Utilisateurs",
  cards: "Cartes",
  casino: "Casino",
  config: "Configuration",
};

/**
 * Onglets regroupés par NATURE, et non alignés sur une seule rangée : à une
 * douzaine d'onglets la barre débordait de l'écran à droite. Deux familles, qui
 * ne se consultent pas dans les mêmes moments — on écrit du contenu de jeu, ou
 * on regarde tourner la plateforme.
 *
 * ⚠️ C'est CETTE liste qui rend les boutons. Tout onglet ajouté au type `Tab`
 * doit y figurer, sans quoi il est inatteignable (`tabs.test.ts` le vérifie).
 */
export const TAB_GROUPS: { label: string; tabs: Tab[] }[] = [
  {
    label: "Contenu des jeux",
    tabs: ["roster", "categories", "pyramid", "draft", "items", "attributes"],
  },
  {
    label: "Pilotage",
    tabs: [
      "overview",
      "content",
      "jjkdle",
      "leaderboard",
      "users",
      "cards",
      "casino",
      "config",
    ],
  },
];

/** Tous les onglets, dans l'ordre d'affichage. */
export const ALL_TABS: Tab[] = TAB_GROUPS.flatMap((g) => g.tabs);
