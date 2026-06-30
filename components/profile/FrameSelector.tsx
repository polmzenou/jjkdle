"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FRAMES, DEFAULT_FRAME_KEY } from "@/lib/frames/definitions";
import { rarityStyle } from "@/lib/profile/rarity";
import { UserAvatar } from "@/components/UserAvatar";
import { equipFrameAction } from "@/app/account/actions";

interface FrameSelectorProps {
  username: string;
  avatarImage?: string | null;
  /** Clés des cadres débloqués (calculées serveur : règle + grants + admin). */
  unlockedKeys: string[];
  /** Clé du cadre actuellement équipé (ou null = cadre par défaut). */
  equippedKey: string | null;
}

/**
 * Sélecteur de CADRE (profil) : aperçu live du cadre autour de la pp, débloqués
 * équipables, verrouillés grisés + condition affichée + rareté. Le déblocage est
 * re-vérifié serveur à l'équipement (`equipFrameAction`).
 */
export function FrameSelector({
  username,
  avatarImage,
  unlockedKeys,
  equippedKey,
}: FrameSelectorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [equipped, setEquipped] = useState<string | null>(equippedKey);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const unlocked = new Set(unlockedKeys);

  // Équiper le cadre par défaut = retirer (null) côté serveur.
  const equip = (key: string) => {
    setFeedback(null);
    const previous = equipped;
    const next = key === DEFAULT_FRAME_KEY ? null : key;
    setEquipped(next);
    startTransition(async () => {
      const res = await equipFrameAction(next);
      if (res.ok) {
        router.refresh();
      } else {
        setEquipped(previous);
        setFeedback({ ok: false, msg: res.error ?? "Échec." });
      }
    });
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-void-800/60 p-5 backdrop-blur">
      <p className="mb-3 text-xs uppercase tracking-wider text-white/45">
        Cadre autour de la photo de profil
      </p>

      {feedback && (
        <p className={`mb-3 text-sm ${feedback.ok ? "text-emerald-400" : "text-cursed-light"}`}>
          {feedback.msg}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {FRAMES.map((f) => {
          const isUnlocked = unlocked.has(f.key);
          const isEquipped =
            (equipped ?? DEFAULT_FRAME_KEY) === f.key;
          const { color, label } = rarityStyle(f.rarity);
          return (
            <button
              key={f.key}
              type="button"
              disabled={pending || !isUnlocked}
              onClick={() => isUnlocked && equip(f.key)}
              aria-pressed={isEquipped}
              title={isUnlocked ? f.description : `Verrouillé — ${f.description}`}
              className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-colors ${
                isEquipped
                  ? "border-domain bg-domain/10"
                  : isUnlocked
                    ? "border-white/10 bg-void-900/40 hover:border-white/30"
                    : "cursor-not-allowed border-white/5 bg-void-900/30 opacity-60"
              }`}
            >
              <UserAvatar
                username={username}
                image={avatarImage}
                frameKey={f.key}
                size={52}
              />
              <span className="flex items-center gap-1 text-xs font-bold text-white/85">
                {f.name}
                {!isUnlocked && <span aria-hidden>🔒</span>}
              </span>
              <span className="text-[9px] uppercase tracking-wide" style={{ color }}>
                {label}
              </span>
              {isEquipped && (
                <span className="text-[10px] font-bold text-domain-light">✓ équipé</span>
              )}
              {!isUnlocked && (
                <span className="text-[10px] leading-snug text-white/40">{f.description}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
