"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  SECTION_LABELS,
  type ProfileLayout,
  type ProfileSectionPref,
} from "@/lib/profile/layout";
import { updateProfileLayoutAction } from "@/app/account/actions";

interface ProfileLayoutEditorProps {
  username: string;
  initialLayout: ProfileLayout;
}

/** Interrupteur on/off accessible (réutilisé pour chaque option). */
function Toggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
        checked ? "bg-domain" : "bg-white/15"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

/**
 * Éditeur de la mise en page du profil public. Toggles d'en-tête (titre, cadre),
 * puis les sections de corps (badges, scores) avec visibilité + réordonnancement
 * (↑/↓). Chaque modification est persistée immédiatement via
 * `updateProfileLayoutAction`, puis `router.refresh()` propage l'aperçu.
 */
export function ProfileLayoutEditor({
  username,
  initialLayout,
}: ProfileLayoutEditorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [layout, setLayout] = useState<ProfileLayout>(initialLayout);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  /** Applique un nouveau layout en local, persiste, et rollback si échec. */
  const commit = (next: ProfileLayout) => {
    const previous = layout;
    setLayout(next);
    setFeedback(null);
    startTransition(async () => {
      const res = await updateProfileLayoutAction(next);
      if (res.ok) {
        setFeedback({ ok: true, msg: "Profil mis à jour." });
        router.refresh();
      } else {
        setLayout(previous); // rollback optimiste
        setFeedback({ ok: false, msg: res.error ?? "Échec de la mise à jour." });
      }
    });
  };

  const setShowTitle = (visible: boolean) => commit({ ...layout, showTitle: visible });
  const setShowFrame = (visible: boolean) => commit({ ...layout, showFrame: visible });

  const setSectionVisible = (key: ProfileSectionPref["key"], visible: boolean) =>
    commit({
      ...layout,
      sections: layout.sections.map((s) => (s.key === key ? { ...s, visible } : s)),
    });

  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= layout.sections.length) return;
    const sections = [...layout.sections];
    [sections[index], sections[target]] = [sections[target], sections[index]];
    commit({ ...layout, sections });
  };

  return (
    <div className="space-y-6">
      {feedback && (
        <p className={`text-sm ${feedback.ok ? "text-emerald-400" : "text-cursed-light"}`}>
          {feedback.msg}
        </p>
      )}

      {/* En-tête : titre + cadre (visibilité seule, ancrés sous le pseudo / autour de l'avatar) */}
      <section className="rounded-2xl border border-white/10 bg-void-800/60 p-5 backdrop-blur">
        <h2 className="mb-1 font-display text-lg font-bold uppercase tracking-wider text-white/80">
          Sous le pseudo
        </h2>
        <p className="mb-4 text-xs text-white/45">
          Le pseudo, l'avatar et la bannière de {username} restent toujours tout
          en haut. Tu choisis seulement si le titre et le cadre s'affichent.
        </p>

        <div className="divide-y divide-white/5">
          <div className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-white">Titre sous le pseudo</p>
              <p className="text-xs text-white/45">Affiche ton titre équipé.</p>
            </div>
            <Toggle
              checked={layout.showTitle}
              disabled={pending}
              onChange={setShowTitle}
              label="Afficher le titre sous le pseudo"
            />
          </div>
          <div className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-white">Cadre autour de la photo</p>
              <p className="text-xs text-white/45">Affiche le cadre équipé autour de ton avatar.</p>
            </div>
            <Toggle
              checked={layout.showFrame}
              disabled={pending}
              onChange={setShowFrame}
              label="Afficher le cadre autour de la photo de profil"
            />
          </div>
        </div>
      </section>

      {/* Sections de corps : badges + scores (visibilité + ordre) */}
      <section className="rounded-2xl border border-white/10 bg-void-800/60 p-5 backdrop-blur">
        <h2 className="mb-1 font-display text-lg font-bold uppercase tracking-wider text-white/80">
          Sections du profil
        </h2>
        <p className="mb-4 text-xs text-white/45">
          Choisis ce que tu exposes et réordonne avec les flèches. L'ordre ici est
          celui qui s'affiche sur ton profil public.
        </p>

        <ul className="space-y-2">
          {layout.sections.map((s, i) => (
            <li
              key={s.key}
              className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                s.visible ? "border-white/10 bg-void-900/40" : "border-white/5 bg-void-900/20 opacity-70"
              }`}
            >
              <div className="flex flex-col">
                <button
                  type="button"
                  disabled={pending || i === 0}
                  onClick={() => move(i, -1)}
                  aria-label={`Monter ${SECTION_LABELS[s.key]}`}
                  className="px-1 text-white/50 hover:text-white disabled:opacity-25"
                >
                  ▲
                </button>
                <button
                  type="button"
                  disabled={pending || i === layout.sections.length - 1}
                  onClick={() => move(i, 1)}
                  aria-label={`Descendre ${SECTION_LABELS[s.key]}`}
                  className="px-1 text-white/50 hover:text-white disabled:opacity-25"
                >
                  ▼
                </button>
              </div>

              <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">
                {SECTION_LABELS[s.key]}
              </span>

              <Toggle
                checked={s.visible}
                disabled={pending}
                onChange={(v) => setSectionVisible(s.key, v)}
                label={`Afficher ${SECTION_LABELS[s.key]}`}
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
