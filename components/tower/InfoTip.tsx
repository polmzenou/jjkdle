"use client";

import { ULTIMATE, passiveOf } from "@/lib/games/tower/abilities";
import { ACTION_GAUGE } from "@/lib/games/tower/combat";
import type { ItemView, TowerCardView } from "@/lib/games/tower/view";

/**
 * Bulle d'information au survol.
 *
 * Le jeu dérive presque toutes ses données (PV, frappe, célérité, flux,
 * passif, technique) de la fiche du personnage — mais rien de tout cela n'était
 * visible. Le joueur choisissait sa branche, sa recrue et son sacrifice en ne
 * lisant qu'un nom et une barre de vie, alors que ce sont ces chiffres qui
 * décident du combat.
 *
 * Rendue en CSS pur (`group-hover` / `group-focus-within`) : pas d'état, pas de
 * JavaScript, et elle apparaît aussi au clavier. `pointer-events-none` lui
 * interdit d'intercepter le clic de la carte qu'elle surplombe.
 *
 * ⚠️ Le parent DOIT porter `group relative` et ne pas être `overflow-hidden`,
 * sans quoi la bulle est rognée.
 */
export function InfoTip({
  children,
  align = "bottom",
  open = false,
}: {
  children: React.ReactNode;
  /**
   * Côté d'apparition. **En dessous par défaut**, et c'est un choix mesuré :
   * ouverte vers le haut, la bulle se fait rogner par le bord de la fenêtre dès
   * que la carte est en haut de page — ce qui est le cas de presque tous les
   * écrans du jeu. Vers le bas, la page peut défiler.
   */
  align?: "top" | "bottom";
  /**
   * Force l'affichage, sans passer par le survol du parent.
   *
   * Nécessaire là où la bulle ne peut PAS être imbriquée sous l'élément
   * survolé — typiquement des portraits placés dans un `<button>`, où un
   * `<div>` serait du HTML invalide. L'appelant pilote alors la visibilité
   * lui-même (cf. `NodePicker`).
   */
  open?: boolean;
}) {
  return (
    <div
      role="tooltip"
      className={[
        "pointer-events-none absolute left-1/2 z-40 w-64 -translate-x-1/2 rounded-xl border border-white/15",
        "bg-void-900/95 p-3 text-left shadow-xl backdrop-blur",
        "transition-opacity duration-100",
        open
          ? "opacity-100"
          : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
        align === "top" ? "bottom-full mb-2" : "top-full mt-2",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

/**
 * Fiche complète d'un personnage : ce qu'il faut savoir pour décider s'il vaut
 * un slot d'escouade, un sacrifice, ou un détour sur la carte.
 */
export function CharacterTip({
  card,
  hp,
  open = false,
}: {
  card: TowerCardView;
  /** Usure actuelle, quand le personnage est déjà en jeu. */
  hp?: { current: number; max: number };
  /** Cf. `InfoTip.open`. */
  open?: boolean;
}) {
  const passive = passiveOf(card.archetype);
  // La célérité est en points de jauge par seconde et la jauge part à 100 :
  // l'intervalle entre deux frappes est donc bien plus parlant que le nombre.
  const interval = card.stats.speed > 0 ? ACTION_GAUGE / card.stats.speed : 0;

  return (
    <InfoTip open={open}>
      <p className="font-display text-sm font-bold text-white">{card.name}</p>

      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        <Stat
          label="Points de vie"
          value={hp ? `${Math.round(hp.current)} / ${hp.max}` : String(card.stats.maxHp)}
        />
        <Stat label="Frappe" value={String(card.stats.strike)} />
        <Stat label="Cadence" value={`1 coup / ${interval.toFixed(1)} s`} />
        <Stat label="Énergie" value={`${card.stats.flux.toFixed(1)} / s`} />
      </dl>

      <Block label="Passif" title={passive.name}>
        {passive.description}
      </Block>

      {card.technique ? (
        <Block
          label="Technique"
          title={`${card.technique.name} · ${card.technique.cost} énergie`}
        >
          {card.technique.description}
        </Block>
      ) : (
        <Block label="Technique" title="Aucune">
          Ce personnage mise tout sur son Extension de Territoire.
        </Block>
      )}

      {card.hasDomain && (
        <Block label="Ultime" title={ULTIMATE.name} accent="cursed">
          {ULTIMATE.description} La jauge se remplit avec les dégâts subis.
        </Block>
      )}
    </InfoTip>
  );
}

/** Fiche d'un objet maudit : sa rareté, ses effets chiffrés, sa description. */
export function ItemTip({ item }: { item: ItemView }) {
  return (
    <InfoTip>
      <p className="font-display text-sm font-bold" style={{ color: item.color }}>
        {item.name}
      </p>
      <p className="mt-0.5 font-display text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
        Objet maudit · {item.rarityLabel}
      </p>

      <p className="mt-2 rounded-lg bg-white/[0.06] px-2 py-1.5 text-[11px] font-semibold leading-snug text-white/85">
        {item.effect}
      </p>

      {item.description && (
        <p className="mt-2 text-[11px] italic leading-snug text-white/45">
          {item.description}
        </p>
      )}
    </InfoTip>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-display text-[9px] font-bold uppercase tracking-[0.12em] text-white/35">
        {label}
      </dt>
      <dd className="tabular-nums text-white/85">{value}</dd>
    </div>
  );
}

function Block({
  label,
  title,
  accent = "domain",
  children,
}: {
  label: string;
  title: string;
  accent?: "domain" | "cursed";
  children: React.ReactNode;
}) {
  return (
    <div className="mt-2 border-t border-white/10 pt-2">
      <p className="font-display text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">
        {label}
      </p>
      <p
        className={[
          "font-display text-[11px] font-bold",
          accent === "cursed" ? "text-cursed-light" : "text-domain-light",
        ].join(" ")}
      >
        {title}
      </p>
      <p className="text-[11px] leading-snug text-white/60">{children}</p>
    </div>
  );
}
