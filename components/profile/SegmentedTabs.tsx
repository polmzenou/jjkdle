"use client";

import { useRef, type KeyboardEvent } from "react";

export interface SegmentedTab<K extends string> {
  key: K;
  label: string;
}

interface SegmentedTabsProps<K extends string> {
  tabs: readonly SegmentedTab<K>[];
  active: K;
  onChange: (key: K) => void;
  /** Préfixe des ids tab/tabpanel (liaison aria-controls). */
  idPrefix: string;
  label: string;
}

/**
 * Contrôle segmenté en pilule (« MON COMPTE | PALMARÈS »). Sémantique
 * tablist/tab : ←/→ déplacent le focus ET l'onglet actif, Début/Fin sautent
 * aux extrémités. Les panneaux portent `id={idPrefix}-panel-{key}`.
 */
export function SegmentedTabs<K extends string>({
  tabs,
  active,
  onChange,
  idPrefix,
  label,
}: SegmentedTabsProps<K>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = tabs.findIndex((t) => t.key === active);
    let next = i;
    if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    else return;
    e.preventDefault();
    onChange(tabs[next].key);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="inline-flex w-full max-w-md rounded-full border border-white/10 bg-void-800/60 p-1 backdrop-blur sm:w-auto"
    >
      {tabs.map((t, i) => {
        const selected = t.key === active;
        return (
          <button
            key={t.key}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${t.key}`}
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel-${t.key}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.key)}
            className={`flex-1 rounded-full px-6 py-2.5 font-display text-sm font-bold uppercase tracking-wider transition-colors sm:min-w-[11rem] ${
              selected
                ? "bg-domain text-white shadow-glow"
                : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
