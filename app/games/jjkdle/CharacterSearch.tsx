"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CharacterImage } from "@/components/CharacterImage";
import type { PublicCharacter } from "./JJKdleGame";

/** Normalise une chaîne (minuscules + sans accents) pour la recherche. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

interface CharacterSearchProps {
  roster: PublicCharacter[];
  /** Ids déjà proposés (exclus des suggestions). */
  guessedIds: Set<string>;
  disabled?: boolean;
  onPick: (id: string) => void;
}

/**
 * Champ de recherche avec autocomplétion sur les noms du roster. Sélection au
 * clic ou via clavier (↑/↓/Entrée). Exclut les persos déjà proposés.
 */
export function CharacterSearch({
  roster,
  guessedIds,
  disabled = false,
  onPick,
}: CharacterSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return [];
    return roster
      .filter((c) => !guessedIds.has(c.id) && normalize(c.name).includes(q))
      .slice(0, 8);
  }, [query, roster, guessedIds]);

  useEffect(() => setActive(0), [query]);

  // Ferme la liste au clic extérieur.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const pick = (c: PublicCharacter) => {
    onPick(c.id);
    setQuery("");
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || matches.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + matches.length) % matches.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const c = matches[active];
      if (c) pick(c);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={boxRef} className="relative">
      <input
        value={query}
        disabled={disabled}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Tape un personnage…"
        className="w-full rounded-xl border border-white/10 bg-void-900 px-4 py-3 text-base text-white outline-none placeholder:text-white/30 focus:border-domain focus:shadow-glow disabled:opacity-40"
        autoComplete="off"
      />
      {open && matches.length > 0 && (
        <ul className="absolute z-20 mt-2 max-h-80 w-full overflow-auto rounded-xl border border-white/10 bg-void-800 shadow-glow">
          {matches.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(c)}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                  i === active ? "bg-domain/25" : "hover:bg-white/5"
                }`}
              >
                <span className="h-10 w-8 shrink-0 overflow-hidden rounded-md border border-white/10">
                  <CharacterImage character={c} />
                </span>
                <span className="truncate text-sm font-semibold text-white">
                  {c.name}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
