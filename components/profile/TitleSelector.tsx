"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TITLES } from "@/lib/titles/definitions";
import { rarityStyle } from "@/lib/profile/rarity";
import { equipTitleAction } from "@/app/account/actions";

interface TitleSelectorProps {
  /** Clés des titres débloqués (calculées serveur : règle + grants + admin). */
  unlockedKeys: string[];
  /** Clé du titre actuellement équipé (ou null). */
  equippedKey: string | null;
}

/**
 * Sélecteur de TITRE (profil). Liste TOUS les titres du catalogue : débloqués
 * équipables (clic = équipe et remplace le précédent), verrouillés grisés avec
 * la condition de déblocage affichée. Le déblocage est re-vérifié serveur à
 * l'équipement (`equipTitleAction`) — l'UI n'est qu'indicative.
 */
export function TitleSelector({ unlockedKeys, equippedKey }: TitleSelectorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [equipped, setEquipped] = useState<string | null>(equippedKey);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const unlocked = new Set(unlockedKeys);

  const equip = (key: string | null) => {
    setFeedback(null);
    const previous = equipped;
    setEquipped(key);
    startTransition(async () => {
      const res = await equipTitleAction(key);
      if (res.ok) {
        router.refresh();
      } else {
        setEquipped(previous); // rollback optimiste
        setFeedback({ ok: false, msg: res.error ?? "Échec." });
      }
    });
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-void-800/60 p-5 backdrop-blur">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-wider text-white/45">
          Titre affiché sous le pseudo
        </p>
        {equipped && (
          <button
            type="button"
            disabled={pending}
            onClick={() => equip(null)}
            className="text-xs text-white/50 hover:text-cursed-light disabled:opacity-50"
          >
            Retirer le titre
          </button>
        )}
      </div>

      {feedback && (
        <p className={`mb-3 text-sm ${feedback.ok ? "text-emerald-400" : "text-cursed-light"}`}>
          {feedback.msg}
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {TITLES.map((t) => {
          const isUnlocked = unlocked.has(t.key);
          const isEquipped = equipped === t.key;
          const { color, label } = rarityStyle(t.rarity);
          return (
            <button
              key={t.key}
              type="button"
              disabled={pending || !isUnlocked}
              onClick={() => isUnlocked && equip(t.key)}
              aria-pressed={isEquipped}
              title={isUnlocked ? t.description : `Verrouillé — ${t.description}`}
              className={`flex flex-col items-start gap-0.5 rounded-xl border p-3 text-left transition-colors ${
                isEquipped
                  ? "border-domain bg-domain/10"
                  : isUnlocked
                    ? "border-white/10 bg-void-900/40 hover:border-white/30"
                    : "cursor-not-allowed border-white/5 bg-void-900/30 opacity-60"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span
                  className="text-sm font-bold"
                  style={{ color: isUnlocked ? color : "#ffffff70" }}
                >
                  {t.name}
                </span>
                {!isUnlocked && <span aria-hidden className="text-xs">🔒</span>}
                {isEquipped && (
                  <span className="text-[10px] font-bold text-domain-light">✓ équipé</span>
                )}
              </span>
              <span className="text-[11px] leading-snug text-white/45">{t.description}</span>
              <span className="mt-0.5 text-[10px] uppercase tracking-wide" style={{ color }}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
