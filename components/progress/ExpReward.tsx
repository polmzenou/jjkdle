"use client";

import { motion } from "framer-motion";
import { BadgeToast } from "@/components/badges/BadgeToast";
import { CoinIcon } from "@/components/progress/CoinWallet";

interface ExpRewardProps {
  /**
   * XP gagnée à la fin de la partie (octroi AUTOMATIQUE, sans enregistrement au
   * classement). `null` = octroi pas encore résolu ; `0` = aucune XP (ex. daily
   * JJKdle déjà validé, ou grade sans récompense) → rien affiché.
   */
  gainedExp: number | null;
  /**
   * Coins gagnés par la même partie (dérivés de l'XP, cf. `coinsForExp`). `0`
   * possible sur une petite partie (< 10 XP) → la mention est alors masquée.
   */
  gainedCoins?: number | null;
  /** Badges nouvellement débloqués par l'octroi (toast). */
  newBadges?: string[];
}

/**
 * Bandeau « +N XP » affiché sur l'écran de fin de partie. L'XP est empochée
 * automatiquement à l'ouverture du modal (si connecté) — indépendamment de
 * l'enregistrement du score au classement.
 */
export function ExpReward({
  gainedExp,
  gainedCoins = 0,
  newBadges = [],
}: ExpRewardProps) {
  if (!gainedExp || gainedExp <= 0) {
    return <BadgeToast badgeKeys={newBadges} />;
  }

  return (
    <>
      <motion.p
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 16 }}
        className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 font-display text-xl font-black text-domain-light"
        style={{ textShadow: "0 0 18px rgba(139,92,246,0.55)" }}
      >
        <span>+{gainedExp} XP ⚡</span>
        {gainedCoins != null && gainedCoins > 0 && (
          <>
            <span aria-hidden className="text-white/25">
              ·
            </span>
            <span
              className="flex items-center gap-1.5 text-amber-300"
              style={{ textShadow: "0 0 18px rgba(251,191,36,0.55)" }}
            >
              +{gainedCoins}
              <CoinIcon className="h-[18px] w-[18px]" />
            </span>
          </>
        )}
      </motion.p>
      <BadgeToast badgeKeys={newBadges} />
    </>
  );
}
