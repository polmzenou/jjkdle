"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { UserAvatar } from "@/components/UserAvatar";
import { CloseIcon } from "@/components/cards/CardIcons";
import { TitleBadge } from "@/components/TitleBadge";
import { useUniverseHref } from "@/components/universe/UniverseProvider";
import {
  AvatarPicker,
  BannerPicker,
  type AvatarChoice,
} from "@/components/profile/BannerPicker";
import { TitlePicker } from "@/components/profile/TitlePicker";
import { FramePicker } from "@/components/profile/FramePicker";
import { NameColorPicker } from "@/components/profile/NameColorPicker";
import { PlayerName } from "@/components/PlayerName";
import { VisibilityPanel } from "@/components/profile/VisibilityPanel";
import { bannerStyle } from "@/lib/profile/banners";
import type { ProfileLayout } from "@/lib/profile/layout";
import { EDIT_TABS, type EditTab } from "@/lib/profile/edit-tabs";
import {
  equipFrameAction,
  equipNameColorAction,
  equipTitleAction,
  updateProfileLayoutAction,
  type ActionResult,
} from "./actions";

export interface ProfileEditData {
  username: string;
  level: number;
  isAdmin: boolean;
  universeSlug: string;
  roster: AvatarChoice[];
  bannerKey: string;
  avatarId: string | null;
  titleKey: string | null;
  frameKey: string | null;
  nameColorKey: string | null;
  /** Complétion de la collection de l'univers (débloque les couleurs de pseudo). */
  collectionPct: number;
  unlockedTitleKeys: string[];
  unlockedFrameKeys: string[];
  layout: ProfileLayout;
}

/**
 * Bouton EDIT (sous l'avatar du hero) + sa modale. `initialTab` non nul ouvre la
 * modale directement sur cet onglet (`/account?edit=visibilite`, cible de
 * l'ancienne page /account/customize).
 */
export function ProfileEditLauncher({
  data,
  initialTab,
}: {
  data: ProfileEditData;
  initialTab: EditTab | null;
}) {
  const [open, setOpen] = useState(initialTab !== null);
  const [tab, setTab] = useState<EditTab>(initialTab ?? "banniere");

  const close = useCallback(() => {
    setOpen(false);
    // Le lien profond `?edit=` ne doit pas rouvrir la modale au prochain refresh.
    const url = new URL(window.location.href);
    if (url.searchParams.has("edit")) {
      url.searchParams.delete("edit");
      window.history.replaceState(window.history.state, "", url);
    }
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="w-[120px] rounded-full border border-domain/50 bg-domain/15 px-4 py-2 font-display text-sm font-black uppercase tracking-[0.2em] text-domain-light transition-colors hover:bg-domain hover:text-white"
      >
        Edit
      </button>
      <ProfileEditModal
        open={open}
        onClose={close}
        tab={tab}
        onTabChange={setTab}
        data={data}
      />
    </>
  );
}

/**
 * Modale d'édition du profil : rail d'onglets à gauche (en haut sur mobile),
 * aperçu live de la bannière, grille de choix, bouton FINIR. Se ferme via
 * Finir, la croix, un clic hors du panneau ou Échap.
 *
 * Chaque choix est ENREGISTRÉ IMMÉDIATEMENT (mise à jour optimiste + rollback si
 * le serveur refuse), puis `router.refresh()` met à jour le hero derrière. La
 * fermeture ne fait donc que fermer : rien ne peut être perdu.
 */
function ProfileEditModal({
  open,
  onClose,
  tab,
  onTabChange,
  data,
}: {
  open: boolean;
  onClose: () => void;
  tab: EditTab;
  onTabChange: (tab: EditTab) => void;
  data: ProfileEditData;
}) {
  const router = useRouter();
  const withUniverse = useUniverseHref();
  const [pending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [bannerKey, setBannerKey] = useState(data.bannerKey);
  const [avatarId, setAvatarId] = useState(data.avatarId);
  const [titleKey, setTitleKey] = useState(data.titleKey);
  const [frameKey, setFrameKey] = useState(data.frameKey);
  const [nameColorKey, setNameColorKey] = useState(data.nameColorKey);
  const [layout, setLayout] = useState(data.layout);
  const [error, setError] = useState<string | null>(null);

  const avatarImage = data.roster.find((c) => c.id === avatarId)?.image ?? null;

  // Échap + verrou du scroll de la page + focus du panneau à l'ouverture.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  /** Applique localement, persiste, et annule si le serveur refuse. */
  function persist<T>(
    next: T,
    previous: T,
    set: (v: T) => void,
    request: () => Promise<ActionResult>,
  ) {
    setError(null);
    set(next);
    startTransition(async () => {
      const res = await request().catch(
        (): ActionResult => ({ ok: false, error: "Erreur réseau." }),
      );
      if (res.ok) router.refresh();
      else {
        set(previous);
        setError(res.error ?? "Échec de la mise à jour.");
      }
    });
  }

  const patchProfile = async (patch: object): Promise<ActionResult> => {
    const res = await fetch(withUniverse("/api/profile"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const json = await res.json().catch(() => ({}));
    return res.ok && json.ok ? { ok: true } : { ok: false, error: json.error };
  };

  const banner = bannerStyle(bannerKey);

  // Monté dans <body> via un portail : un ancêtre avec `backdrop-filter` (la
  // carte du hero est en `backdrop-blur`) devient le bloc conteneur des
  // éléments `position: fixed`, et la modale restait coincée dans la carte.
  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 sm:items-center sm:p-6"
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Personnaliser mon profil"
            tabIndex={-1}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="relative flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-void-900 shadow-[0_24px_80px_-20px_rgb(var(--color-domain)/0.45)] outline-none sm:h-[85vh] sm:flex-row sm:rounded-3xl"
          >
            {/* Rail d'onglets */}
            <nav
              aria-label="Éléments du profil"
              className="flex shrink-0 gap-2 overflow-x-auto border-b border-white/10 bg-void-800/80 p-3 pr-14 sm:w-52 sm:flex-col sm:overflow-visible sm:border-b-0 sm:border-r sm:p-5"
            >
              <p className="hidden px-2 pb-2 font-display text-[10px] font-bold uppercase tracking-[0.25em] text-domain-light/80 sm:block">
                Personnaliser
              </p>
              {EDIT_TABS.map((t) => {
                const active = t.key === tab;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => onTabChange(t.key)}
                    aria-current={active ? "true" : undefined}
                    className={`shrink-0 rounded-full px-5 py-2.5 text-left font-display text-sm font-bold transition-colors ${
                      active
                        ? "bg-domain text-white shadow-glow"
                        : "bg-white/5 text-white/65 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-void-900/80 text-white/70 transition-colors hover:border-domain/60 hover:text-white"
            >
              <CloseIcon />
            </button>

            <div className="flex min-h-0 flex-1 flex-col">
              {/* Aperçu live */}
              <div className="shrink-0 border-b border-white/10 p-4 sm:p-6 sm:pr-16">
                <div
                  className="relative flex h-20 items-center gap-3 overflow-hidden rounded-2xl border border-white/10 px-4"
                  style={{ background: banner.gradient }}
                >
                  <span
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-r from-void-900/70 via-void-900/20 to-transparent"
                  />
                  <UserAvatar
                    username={data.username}
                    image={avatarImage}
                    frameKey={layout.showFrame ? frameKey : null}
                    size={52}
                    className="relative"
                  />
                  <div className="relative min-w-0">
                    <p className="truncate font-display text-base font-black text-white drop-shadow">
                      <PlayerName name={data.username} nameColorKey={nameColorKey} />
                    </p>
                    <p className="flex items-center gap-2 text-xs text-white/70">
                      {banner.label}
                      {layout.showTitle && titleKey && (
                        <TitleBadge titleKey={titleKey} />
                      )}
                    </p>
                  </div>
                </div>
                {error && (
                  <p role="alert" className="mt-2 text-sm text-cursed-light">
                    {error}
                  </p>
                )}
              </div>

              {/* Choix de l'onglet actif */}
              <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                {tab === "banniere" && (
                  <BannerPicker
                    value={bannerKey}
                    level={data.level}
                    isAdmin={data.isAdmin}
                    universeSlug={data.universeSlug}
                    disabled={pending}
                    onSelect={(key) =>
                      persist(key, bannerKey, setBannerKey, () =>
                        patchProfile({ bannerKey: key }),
                      )
                    }
                  />
                )}
                {tab === "avatar" && (
                  <AvatarPicker
                    roster={data.roster}
                    value={avatarId}
                    disabled={pending}
                    onSelect={(id) =>
                      persist(id, avatarId, setAvatarId, () =>
                        patchProfile({ avatarCharacterId: id }),
                      )
                    }
                  />
                )}
                {tab === "titre" && (
                  <TitlePicker
                    unlockedKeys={data.unlockedTitleKeys}
                    value={titleKey}
                    universeSlug={data.universeSlug}
                    disabled={pending}
                    onSelect={(key) =>
                      persist(key, titleKey, setTitleKey, () => equipTitleAction(key))
                    }
                  />
                )}
                {tab === "cadre" && (
                  <FramePicker
                    username={data.username}
                    avatarImage={avatarImage}
                    unlockedKeys={data.unlockedFrameKeys}
                    value={frameKey}
                    universeSlug={data.universeSlug}
                    disabled={pending}
                    onSelect={(key) =>
                      persist(key, frameKey, setFrameKey, () => equipFrameAction(key))
                    }
                  />
                )}
                {tab === "pseudo" && (
                  <NameColorPicker
                    username={data.username}
                    collectionPct={data.collectionPct}
                    isAdmin={data.isAdmin}
                    value={nameColorKey}
                    disabled={pending}
                    onSelect={(key) =>
                      persist(key, nameColorKey, setNameColorKey, () =>
                        equipNameColorAction(key),
                      )
                    }
                  />
                )}
                {tab === "visibilite" && (
                  <VisibilityPanel
                    layout={layout}
                    disabled={pending}
                    onChange={(next) =>
                      persist(next, layout, setLayout, () =>
                        updateProfileLayoutAction(next),
                      )
                    }
                  />
                )}
              </div>

              <div className="flex shrink-0 justify-center border-t border-white/10 p-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-w-[10rem] rounded-full bg-domain px-8 py-2.5 font-display text-sm font-black uppercase tracking-[0.2em] text-white shadow-glow transition-transform hover:scale-105"
                >
                  {pending ? "Enregistrement…" : "Finir"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
