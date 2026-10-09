import type { Archetype } from "@/lib/games/tower/types";

/**
 * Pictogrammes de la Tour — un par technique, par type de nœud et par
 * ressource.
 *
 * Pourquoi : les boutons d'action et la carte ne parlaient que par des mots
 * (« Encaisse », « Décharge »…) et quelques glyphes Unicode dont le rendu varie
 * d'un système à l'autre. Une icône se lit avant le texte, ce qui compte quand
 * une fenêtre de contre dure une seconde.
 *
 * Tous en SVG inline, trait `currentColor` : la couleur suit le contexte
 * (bouton prêt, désactivé, fenêtre ouverte) sans une ligne de plus, et rien
 * n'est chargé sur le réseau.
 */

export type TowerIconName =
  // Techniques (une par effet, cf. `TECHNIQUES` dans abilities.ts)
  | "burst"
  | "multi"
  | "summon"
  | "mark"
  | "shove"
  | "sweep"
  | "mimic"
  | "shield"
  | "ultimate"
  // Défense d'escouade
  | "barrier"
  // Nœuds de la carte
  | "combat"
  | "elite"
  | "boss"
  | "recruit"
  | "merchant"
  | "rest"
  | "event"
  // Ressources et repères
  | "fragments"
  | "heart"
  | "heal"
  | "energy"
  | "clock"
  | "gift"
  | "target"
  | "warning"
  | "star"
  | "arrow"
  | "skull";

/** Contenu SVG de chaque icône (viewBox 24×24, trait de 2). */
const PATHS: Record<TowerIconName, React.ReactNode> = {
  // Sort inné — un éclat qui explose.
  burst: (
    <path d="M12 2l2.1 5.6L19.8 5l-2.6 5.4L22 13l-5.6 1 .9 6-5.3-3.5L6.7 20l.9-6L2 13l4.8-2.6L4.2 5l5.7 2.6z" />
  ),
  // Fauchage — trois entailles.
  multi: (
    <>
      <path d="M4 15L13 4" />
      <path d="M7.5 18.5L17 7" />
      <path d="M11 22L20 11" />
    </>
  ),
  // Invocation — une empreinte de bête.
  summon: (
    <>
      <ellipse cx="8" cy="6.5" rx="1.6" ry="2.2" />
      <ellipse cx="16" cy="6.5" rx="1.6" ry="2.2" />
      <ellipse cx="4.5" cy="11.5" rx="1.5" ry="2" />
      <ellipse cx="19.5" cy="11.5" rx="1.5" ry="2" />
      <path d="M12 11.5c-3 0-6 3.6-6 6.2 0 1.9 1.6 3 3.2 2.5 1.1-.3 1.8-.8 2.8-.8s1.7.5 2.8.8c1.6.5 3.2-.6 3.2-2.5 0-2.6-3-6.2-6-6.2z" />
    </>
  ),
  // Point faible — une mire.
  mark: (
    <>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4" />
    </>
  ),
  // Charge — un élan qui percute.
  shove: (
    <>
      <path d="M2 12h12" />
      <path d="M10 6l6 6-6 6" />
      <path d="M20 4v16" />
      <path d="M2 7h5M2 17h5" />
    </>
  ),
  // Décharge — un éclair qui frappe tout le monde.
  sweep: <path d="M13 2L4 14h7l-1 8 9-12h-7z" />,
  // Adaptation — le cycle qui rejoue.
  mimic: (
    <>
      <path d="M20 11a8 8 0 0 0-14.6-4.5" />
      <path d="M4 3v4h4" />
      <path d="M4 13a8 8 0 0 0 14.6 4.5" />
      <path d="M20 21v-4h-4" />
    </>
  ),
  // Encaisse — le bouclier.
  shield: (
    <>
      <path d="M12 2.5l8 3v6.2c0 5-3.4 8.4-8 9.8-4.6-1.4-8-4.8-8-9.8V5.5z" />
      <path d="M12 7v9" />
    </>
  ),
  // Ultime — un éclat à quatre branches.
  ultimate: (
    <>
      <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </>
  ),
  // Garde — un dôme qui couvre toute l'escouade.
  barrier: (
    <>
      <path d="M2 20h20" />
      <path d="M4 20a8 8 0 0 1 16 0" />
      <path d="M8.5 20a3.5 3.5 0 0 1 7 0" />
      <path d="M12 4v2M5.6 6.6l1.4 1.4M18.4 6.6L17 8" />
    </>
  ),
  // Combat — deux lames croisées.
  combat: (
    <>
      <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
      <path d="M13 19l6-6M16 16l4 4M19 21l2-2" />
      <path d="M9.5 17.5L21 6V3h-3L6.5 14.5" />
      <path d="M11 19l-6-6M8 16l-4 4M5 21l-2-2" />
    </>
  ),
  // Élite — un crâne.
  elite: (
    <>
      <path d="M12 3a8 8 0 0 0-8 8c0 2.6 1.2 4.5 3 5.6V21h10v-4.4c1.8-1.1 3-3 3-5.6a8 8 0 0 0-8-8z" />
      <circle cx="9" cy="11.5" r="1.6" fill="currentColor" />
      <circle cx="15" cy="11.5" r="1.6" fill="currentColor" />
      <path d="M10.5 21v-2.5M13.5 21v-2.5" />
    </>
  ),
  skull: (
    <>
      <path d="M12 3a8 8 0 0 0-8 8c0 2.6 1.2 4.5 3 5.6V21h10v-4.4c1.8-1.1 3-3 3-5.6a8 8 0 0 0-8-8z" />
      <circle cx="9" cy="11.5" r="1.6" fill="currentColor" />
      <circle cx="15" cy="11.5" r="1.6" fill="currentColor" />
    </>
  ),
  // Boss — une couronne.
  boss: (
    <>
      <path d="M3 18L4 7l5 4 3-6 3 6 5-4 1 11z" />
      <path d="M3 21h18" />
    </>
  ),
  // Renfort — un allié qui rejoint.
  recruit: (
    <>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21a7 7 0 0 1 14 0" />
      <path d="M19 8v6M16 11h6" />
    </>
  ),
  // Marchand — une bourse.
  merchant: (
    <>
      <path d="M5 8h14l-1.2 13H6.2z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      <path d="M10 14h4" />
    </>
  ),
  // Repos — un croissant de lune.
  rest: <path d="M20.5 13.5A8.5 8.5 0 1 1 10.5 3.5a6.5 6.5 0 0 0 10 10z" />,
  // Rencontre — un losange interrogatif.
  event: (
    <>
      <path d="M12 2l10 10-10 10L2 12z" />
      <path d="M10 9.6a2 2 0 1 1 2.9 1.8c-.6.3-.9.8-.9 1.5" />
      <path d="M12 16h.01" />
    </>
  ),
  // Fragments — une gemme.
  fragments: (
    <>
      <path d="M6 3h12l4 6-10 12L2 9z" />
      <path d="M2 9h20M9.5 3L8 9l4 12 4-12-1.5-6" />
    </>
  ),
  heart: (
    <path d="M12 20.5s-8-5-8-11a4.5 4.5 0 0 1 8-2.8 4.5 4.5 0 0 1 8 2.8c0 6-8 11-8 11z" />
  ),
  heal: (
    <>
      <path d="M12 20.5s-8-5-8-11a4.5 4.5 0 0 1 8-2.8 4.5 4.5 0 0 1 8 2.8c0 6-8 11-8 11z" />
      <path d="M12 9v6M9 12h6" />
    </>
  ),
  // Énergie occulte — une flamme.
  energy: (
    <path d="M12 2c.8 3.6 6 5.6 6 11.5a6 6 0 0 1-12 0c0-2.8 1.6-4.8 2.8-6.6.9 1.8 1.9 2.8 3 3 .2-2.8-.8-4.7.2-7.9z" />
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  // Récompense — un coffre ouvert / cadeau.
  gift: (
    <>
      <path d="M3 8h18v4H3z" />
      <path d="M5 12v9h14v-9M12 8v13" />
      <path d="M12 8C10.5 4.5 6.5 4 6.5 6.5S12 8 12 8s5.5.5 5.5-1.5S13.5 4.5 12 8z" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  warning: (
    <>
      <path d="M12 3L2 21h20z" />
      <path d="M12 10v5M12 18h.01" />
    </>
  ),
  star: (
    <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z" />
  ),
  arrow: <path d="M4 12h15M13 6l6 6-6 6" />,
};

export function TowerIcon({
  name,
  className = "h-5 w-5",
  title,
}: {
  name: TowerIconName;
  className?: string;
  /** Libellé accessible. Absent = icône décorative (le texte voisin suffit). */
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={["shrink-0", className].join(" ")}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title && <title>{title}</title>}
      {PATHS[name]}
    </svg>
  );
}

/**
 * Icône de la technique d'un archétype. `domain` n'a pas de technique : il
 * porte celle de l'ultime, seule action de ces personnages.
 */
const TECHNIQUE_ICONS: Record<Archetype, TowerIconName> = {
  technique: "burst",
  swift: "multi",
  beast: "summon",
  tactician: "mark",
  brute: "shove",
  channeler: "sweep",
  domain: "ultimate",
  adaptive: "mimic",
  stalwart: "shield",
};

export function techniqueIcon(archetype: Archetype): TowerIconName {
  return TECHNIQUE_ICONS[archetype] ?? "burst";
}

/** Icône d'un nœud de carte (combat, élite, boss ou prélude). */
export function nodeIcon(kind: string): TowerIconName {
  switch (kind) {
    case "elite":
    case "boss":
    case "recruit":
    case "merchant":
    case "rest":
    case "event":
      return kind;
    default:
      return "combat";
  }
}

/**
 * Couleur d'accent de chaque type de nœud — partagée par la carte, les écrans
 * de prélude et l'en-tête de combat, pour qu'une couleur veuille toujours dire
 * la même chose.
 */
export const NODE_TONES: Record<
  string,
  { text: string; ring: string; soft: string; border: string }
> = {
  combat: {
    text: "text-white/80",
    ring: "bg-white/10 text-white",
    soft: "bg-void-800/60",
    border: "border-white/15 hover:border-domain/60",
  },
  elite: {
    text: "text-cursed-light",
    ring: "bg-cursed/20 text-cursed-light",
    soft: "bg-cursed/[0.06]",
    border: "border-cursed/40 hover:border-cursed",
  },
  boss: {
    text: "text-cursed-light",
    ring: "bg-cursed/30 text-white",
    soft: "bg-cursed/10",
    border: "border-cursed hover:border-cursed-light",
  },
  recruit: {
    text: "text-domain-light",
    ring: "bg-domain/25 text-domain-light",
    soft: "bg-domain/[0.08]",
    border: "border-domain/40 hover:border-domain",
  },
  merchant: {
    text: "text-amber-300",
    ring: "bg-amber-400/20 text-amber-300",
    soft: "bg-amber-400/[0.06]",
    border: "border-amber-400/40 hover:border-amber-400",
  },
  rest: {
    text: "text-emerald-300",
    ring: "bg-emerald-400/20 text-emerald-300",
    soft: "bg-emerald-400/[0.06]",
    border: "border-emerald-400/40 hover:border-emerald-400",
  },
  event: {
    text: "text-sky-300",
    ring: "bg-sky-400/20 text-sky-300",
    soft: "bg-sky-400/[0.06]",
    border: "border-sky-400/40 hover:border-sky-400",
  },
};

export function nodeTone(kind: string) {
  return NODE_TONES[kind] ?? NODE_TONES.combat;
}
