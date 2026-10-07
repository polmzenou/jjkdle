"use client";

import { useState, useTransition, type ReactNode } from "react";
import { toggleRouletteRiggedAction } from "@/lib/casino/roulette-actions";

/**
 * Enveloppe la roue. Pour un ADMIN (`rigged` défini), un clic bascule la
 * roulette truquée (que du rouge) ↔ normale, sans aucun indicateur visuel.
 * Pour tout le monde d'autre, la roue reste inerte.
 */
export function RigToggle({ rigged: initial, children }: { rigged?: boolean; children: ReactNode }) {
  const [rigged, setRigged] = useState(initial);
  const [pending, startTransition] = useTransition();

  if (rigged === undefined) return <>{children}</>;

  const toggle = () => {
    if (pending) return;
    startTransition(async () => {
      const res = await toggleRouletteRiggedAction();
      if (res.ok) setRigged(res.rigged);
    });
  };

  return (
    <div onClick={toggle} className="cursor-pointer">
      {children}
    </div>
  );
}
