import type { Archetype } from "./types";

/**
 * Configuration d'univers de « The Culling Tower » — module PUR.
 *
 * Le jeu sort sur JJK, mais aucune règle n'est écrite pour JJK : tout ce qui
 * est propre à un anime passe par cet objet. La consigne d'architecture est
 * simple et vérifiable : **aucun `if (universe === "jjk")` ne doit exister sous
 * `lib/games/tower/`**. Si l'envie s'en présente, c'est qu'une clé manque ici.
 *
 * Même motif que `UniverseHigherLower`, qui rend déjà l'attribut comparé du jeu
 * Higher/Lower configurable par univers.
 */
export interface TowerConfig {
  /**
   * Attribut ORDINAL découpant le récit en arcs. Sert d'échelle de puissance
   * ET de fil narratif : l'étage N puise dans les arcs de sa strate.
   */
  arcAttributeKey: string;
  /** Attribut ouvrant l'ultime (JJK : l'Extension de Territoire). */
  ultimateAttributeKey: string;
  /**
   * Valeurs de `ultimateAttributeKey` qui OUVRENT l'ultime.
   *
   * Absent ⇒ l'attribut est lu comme un BOOLEAN (`"true"`), ce qui est le cas
   * JJK (`hasDomain`) et AOT (`aottitan`).
   *
   * ⚠️ Cette clé existe parce que la première version supposait qu'un univers
   * aurait forcément un attribut booléen pour son ultime — hypothèse tirée du
   * seul JJK, et fausse : ni Demon Slayer ni Tokyo Ghoul n'en ont un. Sans
   * elle, l'ultime — une mécanique centrale, avec sa jauge et son bouton —
   * n'aurait jamais pu se déclencher dans ces deux univers, en silence. Le
   * palier se lit donc sur n'importe quel attribut à liste fermée : un GRADE
   * suffit (Pilier, Classe Spéciale).
   */
  ultimateAttributeValues?: readonly string[];
  /** Attribut NUMERIC alimentant le Flux (énergie occulte par tick). */
  energyAttributeKey: string;
  /**
   * Table catégorie de builder → archétype de capacité.
   *
   * C'est la seule pièce qu'un nouvel univers doit vraiment écrire, et elle n'a
   * pas besoin d'être exhaustive : une catégorie non mappée retombe sur
   * `DEFAULT_ARCHETYPE`. Plusieurs catégories peuvent viser le même archétype —
   * un anime dont les catégories sont des castings plutôt que des statistiques
   * (« Division 4 », « Piliers ») en aura besoin.
   */
  categoryArchetypes: Readonly<Record<string, Archetype>>;
}

/**
 * Configuration JJK. Les neuf catégories du builder correspondent une à une aux
 * neuf archétypes — c'est ce qui a fixé la liste des archétypes au départ.
 */
export const JJK_TOWER_CONFIG: TowerConfig = {
  arcAttributeKey: "appearanceArc",
  ultimateAttributeKey: "hasDomain",
  energyAttributeKey: "cursedEnergy",
  categoryArchetypes: {
    "innate-technique": "technique",
    speed: "swift",
    "curse-status": "beast",
    "battle-iq": "tactician",
    "physical-strength": "brute",
    "cursed-energy": "channeler",
    "domain-expansion": "domain",
    versatility: "adaptive",
    endurance: "stalwart",
  },
};

/**
 * Surcharge partielle déclarée par un univers dans `UniverseConfig.tower`.
 * Tout champ absent garde la valeur JJK, qui fait donc office de défaut — même
 * convention que `UniverseGameCopy`.
 */
export type TowerConfigOverride = Partial<TowerConfig>;

/** Config effective d'un univers. */
export function resolveTowerConfig(
  override?: TowerConfigOverride,
): TowerConfig {
  if (!override) return JJK_TOWER_CONFIG;
  return {
    arcAttributeKey: override.arcAttributeKey ?? JJK_TOWER_CONFIG.arcAttributeKey,
    ultimateAttributeKey:
      override.ultimateAttributeKey ?? JJK_TOWER_CONFIG.ultimateAttributeKey,
    // Pas de `??` ici : une surcharge qui redéfinit l'attribut d'ultime SANS
    // lister de valeurs veut dire « lis-le comme un booléen », et non « garde
    // les valeurs de JJK », qui ne voudraient rien dire sur son attribut.
    ...(override.ultimateAttributeKey
      ? { ultimateAttributeValues: override.ultimateAttributeValues }
      : {
          ultimateAttributeValues:
            override.ultimateAttributeValues ??
            JJK_TOWER_CONFIG.ultimateAttributeValues,
        }),
    energyAttributeKey:
      override.energyAttributeKey ?? JJK_TOWER_CONFIG.energyAttributeKey,
    categoryArchetypes:
      override.categoryArchetypes ?? JJK_TOWER_CONFIG.categoryArchetypes,
  };
}

/**
 * Catégorie dont l'archétype est `archetype`, ou `null`.
 *
 * Sert à trouver la catégorie de VITESSE sans ajouter une clé de config : la
 * célérité se lit dans la catégorie qui mappe sur `swift`, quel que soit son
 * slug (`speed` en JJK, `csm-speed` ailleurs). Une clé de moins à remplir pour
 * chaque futur univers, et une incohérence de moins possible entre les deux.
 *
 * Les clés sont parcourues triées : si deux catégories mappent le même
 * archétype, le résultat reste STABLE d'une exécution à l'autre.
 */
export function categoryForArchetype(
  config: TowerConfig,
  archetype: Archetype,
): string | null {
  const keys = Object.keys(config.categoryArchetypes).sort();
  for (const key of keys) {
    if (config.categoryArchetypes[key] === archetype) return key;
  }
  return null;
}
