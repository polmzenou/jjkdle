"use client";

import { useState } from "react";
import type { Team } from "@/lib/games/codenames/types";
import { TEAM_STYLES } from "./colors";

interface CodenamesClueInputProps {
  team: Team;
  pending: boolean;
  onGiveClue: (word: string, count: number) => void;
}

/** Saisie d'indice (mot + nombre), visible uniquement par le maître-espion actif. */
export function CodenamesClueInput({ team, pending, onGiveClue }: CodenamesClueInputProps) {
  const [word, setWord] = useState("");
  const [count, setCount] = useState(1);
  const s = TEAM_STYLES[team];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const w = word.trim();
    if (!w) return;
    onGiveClue(w, count);
    setWord("");
    setCount(1);
  }

  return (
    <form
      onSubmit={submit}
      className={`flex items-center gap-2 rounded-2xl border ${s.border} ${s.bgSoft} p-2.5`}
    >
      <input
        value={word}
        onChange={(e) => setWord(e.target.value)}
        maxLength={40}
        placeholder="Ton indice (un mot)…"
        className="min-w-0 flex-1 rounded-xl border border-white/10 bg-void-900 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-domain-light focus:outline-none"
      />
      <select
        value={count}
        onChange={(e) => setCount(Number(e.target.value))}
        className="rounded-xl border border-white/10 bg-void-900 px-2 py-2 text-sm text-white focus:border-domain-light focus:outline-none"
      >
        {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={!word.trim() || pending}
        className={`rounded-xl ${s.bgSolid} px-4 py-2 text-sm font-bold uppercase tracking-wide text-white transition-transform hover:scale-105 active:scale-95 disabled:opacity-40`}
      >
        Donner
      </button>
    </form>
  );
}
