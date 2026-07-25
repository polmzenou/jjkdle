/**
 * Slugification des clés lisibles créées depuis l'admin (catégories du builder,
 * consignes du Pyramid). Module PUR : importable côté client comme serveur.
 *
 * Ces slugs sont des clés STABLES et uniques par univers : une fois posés, ils ne
 * changent plus (des notes de personnages ou des lignes de contenu y font
 * référence), c'est pourquoi ils ne sont calculés qu'à la création.
 */

/** `"Contrat démoniaque"` → `"contrat-demoniaque"` (chaîne vide si rien d'utile). */
export function slugify(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Rend un slug unique au sein d'un ensemble déjà pris, en suffixant `-2`, `-3`…
 * Utile quand le slug dérive d'un libellé libre, que rien n'empêche de répéter.
 */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}
