"use client";

import {
  SECTION_LABELS,
  type ProfileLayout,
  type ProfileSectionKey,
} from "@/lib/profile/layout";
import { DeckIcon } from "@/components/cards/CardIcons";
import {
  FrameIcon,
  MedalIcon,
  TagIcon,
  TrophyIcon,
} from "@/components/icons/UiIcons";

const SECTION_ICONS: Record<ProfileSectionKey, React.ReactNode> = {
  badges: <MedalIcon className="h-5 w-5" />,
  scores: <TrophyIcon className="h-5 w-5" />,
  cards: <DeckIcon className="h-5 w-5" />,
};

/** Interrupteur on/off accessible. */
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

function Row({
  icon,
  title,
  hint,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-domain/10 text-domain-light">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-white">{title}</p>
        <p className="text-xs text-white/45">{hint}</p>
      </div>
      {children}
    </div>
  );
}

/**
 * Ce que le joueur expose sur son profil PUBLIC : titre, cadre, et chacune des
 * sections du palmarès. L'ordre des sections est fixe (badges, puis scores |
 * deck) — seule la visibilité se règle. Composant contrôlé : la modale persiste
 * via `updateProfileLayoutAction`.
 */
export function VisibilityPanel({
  layout,
  onChange,
  disabled,
}: {
  layout: ProfileLayout;
  onChange: (next: ProfileLayout) => void;
  disabled?: boolean;
}) {
  const sectionVisible = (key: ProfileSectionKey) =>
    layout.sections.find((s) => s.key === key)?.visible ?? true;
  const setSection = (key: ProfileSectionKey, visible: boolean) =>
    onChange({
      ...layout,
      sections: layout.sections.map((s) => (s.key === key ? { ...s, visible } : s)),
    });

  return (
    <div className="space-y-5">
      <p className="text-sm text-white/55">
        Choisis ce que les autres joueurs voient sur ton profil public. Le pseudo,
        l'avatar, la bannière et le niveau restent toujours affichés.
      </p>

      <div className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-void-900/40 px-4">
        <Row icon={<TagIcon className="h-5 w-5" />} title="Titre sous le pseudo" hint="Affiche ton titre équipé.">
          <Toggle
            checked={layout.showTitle}
            disabled={disabled}
            onChange={(v) => onChange({ ...layout, showTitle: v })}
            label="Afficher le titre sous le pseudo"
          />
        </Row>
        <Row icon={<FrameIcon className="h-5 w-5" />} title="Cadre autour de la photo" hint="Affiche le cadre équipé autour de ton avatar.">
          <Toggle
            checked={layout.showFrame}
            disabled={disabled}
            onChange={(v) => onChange({ ...layout, showFrame: v })}
            label="Afficher le cadre autour de la photo de profil"
          />
        </Row>
      </div>

      <div className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-void-900/40 px-4">
        {(Object.keys(SECTION_LABELS) as ProfileSectionKey[]).map((key) => (
          <Row key={key} icon={SECTION_ICONS[key]} title={SECTION_LABELS[key]} hint="Section du palmarès.">
            <Toggle
              checked={sectionVisible(key)}
              disabled={disabled}
              onChange={(v) => setSection(key, v)}
              label={`Afficher ${SECTION_LABELS[key]}`}
            />
          </Row>
        ))}
      </div>
    </div>
  );
}
