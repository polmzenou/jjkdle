"use client";

import { motion } from "framer-motion";
import { BadgeToast } from "@/components/badges/BadgeToast";

interface ExpRewardProps {
  /**
   * XP gagnée à la fin de la partie (octroi AUTOMATIQUE, sans enregistrement au
   * classement). `null` = octroi pas encore résolu ; `0` = aucune XP (ex. daily
   * JJKdle déjà validé, ou grade sans récompense) → rien affiché.
   */
  gainedExp: number | null;
  /** Badges nouvellement débloqués par l'octroi (toast). */
  newBadges?: string[];
}

/**
 * Bandeau « +N XP » affiché sur l'écran de fin de partie. L'XP est empochée
 * automatiquement à l'ouverture du modal (si connecté) — indépendamment de
 * l'enregistrement du score au classement.
 */
export function ExpReward({ gainedExp, newBadges = [] }: ExpRewardProps) {
  if (!gainedExp || gainedExp <= 0) {
    return <BadgeToast badgeKeys={newBadges} />;
  }

  return (
    <>
      <motion.p
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 16 }}
        className="mt-3 font-display text-xl font-black text-domain-light"
        style={{ textShadow: "0 0 18px rgba(139,92,246,0.55)" }}
      >
        +{gainedExp} XP ⚡
      </motion.p>
      <BadgeToast badgeKeys={newBadges} />
    </>
  );
}
