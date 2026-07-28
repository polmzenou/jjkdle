"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BoosterPack } from "@/components/cards/BoosterPack";
import { BoosterOpening } from "@/components/cards/BoosterOpening";
import { openBoosterAction } from "@/app/[universe]/account/card-actions";
import { getBooster, type BoosterKind } from "@/lib/cards/boosters";
import type { OpenedBooster } from "@/lib/cards/types";

/**
 * Le DROP de fin de partie : une enveloppe qui apparaît au centre de l'écran de
 * fin, à cliquer pour l'ouvrir.
 *
 * Le booster est DÉJÀ persisté non ouvert quand ce composant s'affiche (créé
 * par `awardExp`) : fermer l'écran de fin sans cliquer ne le perd pas, il
 * reste ouvrable depuis /account/deck. Ce composant n'est donc qu'un raccourci
 * — d'où l'absence de tout avertissement anxiogène.
 */

interface BoosterDropProps {
  /** Booster tombé, ou `null`/`undefined` si la partie n'a rien lâché. */
  booster?: { id: string; kind: BoosterKind } | null;
}

export function BoosterDrop({ booster }: BoosterDropProps) {
  const [opening, setOpening] = useState(false);
  const [skip, setSkip] = useState(false);
  const [result, setResult] = useState<OpenedBooster | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!booster || done) return null;

  const open = async (skipAnimation: boolean) => {
    setSkip(skipAnimation);
    setOpening(true);
    setError(null);
    const res = await openBoosterAction(booster.id);
    if (res.ok && res.result) setResult(res.result);
    else setError(res.error ?? "Impossible d'ouvrir ce booster.");
  };

  const def = getBooster(booster.kind);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.6, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 18, delay: 0.35 }}
        className="mt-8 flex flex-col items-center gap-3"
      >
        <p
          className="text-xs font-black uppercase tracking-[0.3em]"
          style={{ color: def.accent }}
        >
          Un {def.label.toLowerCase()} est tombé !
        </p>

        <BoosterPack
          kind={booster.kind}
          animated
          onClick={() => void open(false)}
          disabled={opening}
          className="w-32 sm:w-36"
        />

        <button
          type="button"
          onClick={() => void open(true)}
          disabled={opening}
          className="text-xs font-medium uppercase tracking-wider text-white/40 underline-offset-4 transition-colors hover:text-white/70 hover:underline disabled:opacity-50"
        >
          Passer l&apos;animation
        </button>
      </motion.div>

      <AnimatePresence>
        {opening && (
          <BoosterOpening
            result={result}
            loading={!result && !error}
            error={error}
            initialSkip={skip}
            onClose={() => {
              setOpening(false);
              // Le booster est consommé : on retire le drop de l'écran de fin.
              if (result) setDone(true);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
