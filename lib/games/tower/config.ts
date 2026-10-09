import type { Archetype } from "./types";

/**
 * Une condition d'accès à l'ultime : un attribut, et les valeurs qui l'ouvrent.
 * `values` absent ⇒ l'attribut est lu comme un BOOLEAN (`"true"`).
 */
export interface UltimateRule {
  attributeKey: string;
  values?: readonly string[];
}

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
  /**
   * NOM de l'ultime dans cet univers.
   *
   * « Extension de Territoire » est du vocabulaire Jujutsu Kaisen, et il était
   * écrit en dur dans `abilities.ts` — un module qui ne connaît par ailleurs
   * aucun univers. Il se serait affiché tel quel sur Demon Slayer et sur
   * Attack on Titan, à l'écran de combat comme dans les bulles d'info.
   */
  ultimateName: string;
  /**
   * Nom de l'ultime PAR VALEUR de `ultimateAttributeKey`, quand l'univers en a
   * plusieurs sortes. Bleach : un capitaine déclenche son « Bankai », un Espada
   * sa « Resurrección », un Quincy son « Vollständig ». Une valeur absente de
   * la table — ou un ultime ouvert par `ultimateExtraRules` — prend
   * `ultimateName`.
   */
  ultimateNamesByValue?: Readonly<Record<string, string>>;
  /**
   * Conditions SUPPLÉMENTAIRES ouvrant l'ultime, en OU avec l'attribut
   * principal. Demon Slayer en a besoin : ses Piliers se lisent sur le GRADE,
   * mais ses Lunes démoniaques sur l'AFFILIATION — deux hiérarchies que l'œuvre
   * ne mélange jamais, donc deux attributs distincts.
   */
  ultimateExtraRules?: readonly UltimateRule[];
  /**
   * Marque affichée sur la carte d'un personnage qui a l'ultime (`領域` en JJK).
   * Un ou deux caractères : elle tient dans le coin d'un portrait.
   */
  ultimateBadge: string;
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
  /**
   * Noms des 4 strates (du bas vers le haut), d'après les arcs MAJEURS qu'elles
   * couvrent — le découpage des arcs en strates est proportionnel (cf.
   * `strateOfArc`), les noms doivent donc suivre le même découpage.
   *
   * Absent ⇒ chaque strate prend le libellé de son premier arc en base (cf.
   * `strateNamesFor`). Jamais hérité de JJK : « Shibuya » n'a rien à faire dans
   * la tour de Demon Slayer.
   */
  strateNames?: readonly string[];
}

/**
 * Configuration JJK. Les neuf catégories du builder correspondent une à une aux
 * neuf archétypes — c'est ce qui a fixé la liste des archétypes au départ.
 */
export const JJK_TOWER_CONFIG: TowerConfig = {
  arcAttributeKey: "appearanceArc",
  ultimateName: "Extension de Territoire",
  ultimateBadge: "領域",
  ultimateAttributeKey: "hasDomain",
  energyAttributeKey: "cursedEnergy",
  // Arcs 1-3 (JJK 0 → Vs Mahito), 4-6 (Tournoi → passé de Gojo),
  // 7-9 (Shibuya → Culling Game), 10-12 (Shinjuku → Modulo).
  strateNames: [
    "Les premiers fléaux",
    "Le tournoi Tokyo-Kyoto",
    "L'incident de Shibuya",
    "Le dénouement",
  ],
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
    ultimateName: override.ultimateName ?? JJK_TOWER_CONFIG.ultimateName,
    ultimateBadge: override.ultimateBadge ?? JJK_TOWER_CONFIG.ultimateBadge,
    // Pas de repli sur JJK : des noms d'arcs ne s'héritent pas d'un anime à
    // l'autre (cf. `strateNamesFor`).
    strateNames: override.strateNames,
    // Même règle que les valeurs : ces deux clés décrivent l'attribut d'ultime,
    // elles ne s'héritent pas d'un univers à l'autre une fois celui-ci redéfini.
    ...(override.ultimateAttributeKey
      ? {
          ultimateNamesByValue: override.ultimateNamesByValue,
          ultimateExtraRules: override.ultimateExtraRules,
        }
      : {
          ultimateNamesByValue:
            override.ultimateNamesByValue ??
            JJK_TOWER_CONFIG.ultimateNamesByValue,
          ultimateExtraRules:
            override.ultimateExtraRules ?? JJK_TOWER_CONFIG.ultimateExtraRules,
        }),
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
