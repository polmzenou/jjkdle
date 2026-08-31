"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  GUARD_COOLDOWN,
  GUARD_DURATION,
  GUARD_REDUCTION,
  TICKS_PER_SECOND,
} from "@/lib/games/tower/combat";
import { SQUAD_SIZE, TOWER_FLOORS } from "@/lib/games/tower/types";

/**
 * Règles du jeu.
 *
 * La Tour est le seul jeu du site dont les règles ne se devinent pas en
 * regardant l'écran : le combat se résout tout seul, et rien n'indique
 * spontanément que le moment d'appuyer compte plus que le fait d'appuyer. Un
 * joueur qui l'ignore croit assister à une animation pendant que son
 * personnage meurt.
 *
 * D'où deux niveaux : un résumé toujours visible sur l'écran d'entrée
 * (`TowerRulesSummary`), et cette modale complète accessible à tout moment.
 *
 * Les durées affichées sont DÉRIVÉES des constantes du moteur, jamais écrites
 * en dur : un réglage d'équilibrage ne doit pas laisser une règle mensongère à
 * l'écran.
 */

const seconds = (ticks: number) =>
  (ticks / TICKS_PER_SECOND).toFixed(1).replace(".0", "").replace(".", ",");

export function TowerRulesButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-white/15 px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wide text-white/60 transition hover:border-domain/60 hover:text-domain-light"
      >
        Règles
      </button>
      <TowerRulesModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function TowerRulesModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Règles de The Culling Tower"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-white/10 bg-void-900 p-6 sm:rounded-2xl"
          >
            <header className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-domain">
                  Comment on joue
                </p>
                <h2 className="font-display text-xl font-bold text-white">
                  The Culling Tower
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer"
                className="rounded-lg border border-white/15 px-2.5 py-1 text-white/60 transition hover:text-white"
              >
                ✕
              </button>
            </header>

            <div className="flex flex-col gap-5 text-sm leading-relaxed text-white/70">
              <Rule n="1" title="Le combat se joue tout seul">
                Tes personnages et les ennemis frappent d&apos;eux-mêmes, chacun
                à son rythme. Tu ne pilotes aucune de ces frappes — et c&apos;est
                normal.
              </Rule>

              <Rule n="2" title="Ce qui compte, c'est le moment">
                Régulièrement, un ennemi <strong>charge une attaque</strong> : une
                barre rouge se remplit au-dessus de lui. C&apos;est la{" "}
                <em className="not-italic font-semibold text-cursed">fenêtre</em>,
                et c&apos;est le seul instant où tes actions valent cher.
              </Rule>

              <Rule n="3" title="Frappe dans la fenêtre = contre">
                Déclencher une technique pendant qu&apos;un ennemi charge :
                <strong> dégâts doublés</strong> et son attaque chargée est
                annulée. La même technique jouée deux secondes plus tôt ne fait
                que ses dégâts normaux. Laisse passer la fenêtre, et le coup
                tombe à <strong>triple puissance</strong>.
              </Rule>

              <Rule n="4" title="La garde, pour tout le reste">
                Entre deux fenêtres, tu encaisses des coups ordinaires. Le bouton{" "}
                <strong>Garde</strong> absorbe{" "}
                {Math.round(GUARD_REDUCTION * 100)} % des dégâts pendant{" "}
                {seconds(GUARD_DURATION)} s. Il est <strong>gratuit</strong>,
                mais il faut {seconds(GUARD_COOLDOWN)} s pour le relever : la
                garde dépensée sur des coups ordinaires ne sera pas là pour
                l&apos;attaque chargée qui arrive.
              </Rule>

              <Rule n="5" title="L'énergie occulte">
                Elle monte toute seule pendant le combat. Chaque technique en
                coûte ; l&apos;Extension de Territoire, elle, se charge avec les
                dégâts que tu <strong>subis</strong> — elle arrive donc quand ça
                va mal, et remplace alors le bouton du personnage.
              </Rule>

              <Rule n="6" title="Une escouade qui se construit">
                Tu entres avec <strong>un seul</strong> personnage sur{" "}
                {SQUAD_SIZE} places. Les autres se recrutent en montant. Une fois
                l&apos;escouade pleine, recruter oblige à en{" "}
                <strong>sacrifier un — définitivement</strong>. Les plus grands
                noms ne se croisent que dans les étages élevés.
              </Rule>

              <Rule n="7" title="Un mort reste mort">
                Les points de vie ne se régénèrent pas d&apos;un étage à
                l&apos;autre, et un personnage tombé ne revient pas. L&apos;usure
                est une ressource : c&apos;est elle qui rend le sacrifice d&apos;un
                vétéran blessé pour une recrue fraîche intéressant.
              </Rule>

              <Rule n="8" title="La tour du jour">
                Les {TOWER_FLOORS} étages sont les mêmes pour tout le monde
                jusqu&apos;à minuit. Tu peux <strong>réessayer autant de fois
                que tu veux</strong> jusqu&apos;à la franchir — le classement
                compte le nombre d&apos;essais qu&apos;il t&apos;a fallu, pas ton
                score seul.
              </Rule>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-6 w-full rounded-lg bg-domain px-4 py-2.5 font-display font-bold text-white"
            >
              Compris
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Rule({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex gap-3">
      <span
        aria-hidden
        className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded bg-domain/20 font-display text-xs font-bold text-domain-light"
      >
        {n}
      </span>
      <div>
        <h3 className="font-display text-sm font-bold text-white">{title}</h3>
        <p className="mt-0.5">{children}</p>
      </div>
    </section>
  );
}

/**
 * Résumé permanent de l'écran d'entrée : les trois choses qu'il faut savoir
 * avant le premier combat, pour qu'on n'ait pas à ouvrir la modale pour
 * comprendre ce qui se passe.
 */
export function TowerRulesSummary() {
  return (
    <div className="rounded-xl border border-white/10 bg-void-800/50 p-4 text-sm leading-relaxed text-white/65">
      <p>
        <strong className="text-white">Le combat se joue tout seul.</strong> Ton
        rôle est de choisir <em className="not-italic text-domain-light">quand</em>{" "}
        agir : quand un ennemi <span className="text-cursed">charge une attaque</span>,
        une technique déclenchée à cet instant fait le double de dégâts et annule
        sa charge. Entre deux, la <strong className="text-white">Garde</strong>{" "}
        te protège des coups ordinaires — gratuite, mais avec un temps de
        recharge.
      </p>
    </div>
  );
}
