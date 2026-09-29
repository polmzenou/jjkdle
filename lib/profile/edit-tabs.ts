/**
 * Onglets de la modale d'édition du profil (`/account`, bouton EDIT).
 * Module neutre (ni client ni serveur) : la page lit `?edit=<onglet>` côté
 * serveur pour ouvrir la modale directement, la modale les affiche côté client.
 */
export const EDIT_TABS = [
  { key: "banniere", label: "Bannière" },
  { key: "avatar", label: "Avatar" },
  { key: "titre", label: "Titre" },
  { key: "cadre", label: "Cadre" },
  { key: "visibilite", label: "Visibilité" },
] as const;

export type EditTab = (typeof EDIT_TABS)[number]["key"];

export function isEditTab(value: unknown): value is EditTab {
  return EDIT_TABS.some((t) => t.key === value);
}
