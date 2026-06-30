"use client";

import { useEffect, useState } from "react";
import { getBadge } from "@/lib/badges/definitions";

interface BadgeToastProps {
  /** Clés nouvellement débloquées (renvoyées par le hook de fin de partie). */
  badgeKeys: string[];
  /** Durée d'affichage avant disparition auto (ms). */
  duration?: number;
}

/**
 * Toast de déblocage de badge, monté en fin de partie quand le hook renvoie de
 * nouvelles clés. S'auto-réinitialise à chaque nouveau lot et disparaît seul.
 */
export function BadgeToast({ badgeKeys, duration = 5000 }: BadgeToastProps) {
  const [visible, setVisible] = useState<string[]>([]);

  useEffect(() => {
    if (badgeKeys.length === 0) return;
    setVisible(badgeKeys);
    const t = setTimeout(() => setVisible([]), duration);
    return () => clearTimeout(t);
  }, [badgeKeys, duration]);

  if (visible.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[120] flex flex-col gap-2">
      {visible.map((key) => {
        const b = getBadge(key);
        if (!b) return null;
        return (
          <div
            key={key}
            className="pointer-events-auto flex items-center gap-3 rounded-xl border bg-void-800/95 px-4 py-3 shadow-2xl backdrop-blur animate-float"
            style={{ borderColor: `${b.color}66` }}
          >
            <span className="text-2xl" aria-hidden style={{ filter: `drop-shadow(0 0 6px ${b.color})` }}>
              {b.iconKey}
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">
                Badge débloqué
              </p>
              <p className="font-display text-sm font-black" style={{ color: b.color }}>
                {b.name}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
