"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CharacterImage } from "@/components/CharacterImage";
import { UserAvatar } from "@/components/UserAvatar";
import { BANNER_PALETTE, bannerStyle, type BannerKey } from "@/lib/profile/banners";

/** Forme minimale d'un personnage pour le sélecteur d'avatar. */
export interface AvatarChoice {
  id: string;
  name: string;
  image?: string;
}

interface ProfileEditorProps {
  username: string;
  roster: AvatarChoice[];
  initialBannerKey: string;
  initialAvatarId: string | null;
}

const BANNER_KEYS = Object.keys(BANNER_PALETTE) as BannerKey[];

/**
 * Éditeur de profil : bannière (palette fermée) + avatar (personnage du roster).
 * Aucun upload. Chaque choix est envoyé en PATCH /api/profile (validé serveur)
 * puis `router.refresh()` propage l'affichage (header, profil).
 */
export function ProfileEditor({
  username,
  roster,
  initialBannerKey,
  initialAvatarId,
}: ProfileEditorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [bannerKey, setBannerKey] = useState<string>(initialBannerKey);
  const [avatarId, setAvatarId] = useState<string | null>(initialAvatarId);
  const [query, setQuery] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const avatarChar = useMemo(
    () => roster.find((c) => c.id === avatarId) ?? null,
    [roster, avatarId],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter(
      (c) => c.name.toLowerCase().includes(q) || c.id.includes(q),
    );
  }, [roster, query]);

  const save = (patch: { bannerKey?: string; avatarCharacterId?: string | null }) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        setFeedback({ ok: true, msg: "Profil mis à jour." });
        router.refresh();
      } else {
        setFeedback({ ok: false, msg: json.error ?? "Échec de la mise à jour." });
      }
    });
  };

  const pickBanner = (key: string) => {
    setBannerKey(key);
    save({ bannerKey: key });
  };

  const pickAvatar = (id: string | null) => {
    setAvatarId(id);
    save({ avatarCharacterId: id });
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-void-800/60 p-5 backdrop-blur">
      {/* Aperçu live : bannière + avatar */}
      <div
        className="relative flex h-28 items-end overflow-hidden rounded-xl border border-white/10 p-4"
        style={{ background: bannerStyle(bannerKey).gradient }}
      >
        <UserAvatar username={username} image={avatarChar?.image} size={64} />
        <div className="ml-3 pb-1">
          <p className="font-display text-lg font-black text-white drop-shadow">{username}</p>
          <p className="text-xs text-white/70">{bannerStyle(bannerKey).label}</p>
        </div>
      </div>

      {feedback && (
        <p className={`mt-3 text-sm ${feedback.ok ? "text-emerald-400" : "text-cursed-light"}`}>
          {feedback.msg}
        </p>
      )}

      {/* Sélecteur de bannière */}
      <div className="mt-5">
        <p className="mb-2 text-xs uppercase tracking-wider text-white/45">Bannière</p>
        <div className="flex flex-wrap gap-2">
          {BANNER_KEYS.map((key) => {
            const selected = key === bannerKey;
            return (
              <button
                key={key}
                type="button"
                disabled={pending}
                onClick={() => pickBanner(key)}
                title={BANNER_PALETTE[key].label}
                aria-pressed={selected}
                className={`h-10 w-16 rounded-lg border-2 transition-transform disabled:opacity-50 ${
                  selected ? "border-white scale-105" : "border-white/10 hover:border-white/40"
                }`}
                style={{ background: BANNER_PALETTE[key].gradient }}
              />
            );
          })}
        </div>
      </div>

      {/* Sélecteur d'avatar */}
      <div className="mt-5">
        <div className="mb-2 flex items-center gap-3">
          <p className="text-xs uppercase tracking-wider text-white/45">Avatar</p>
          {avatarId && (
            <button
              type="button"
              disabled={pending}
              onClick={() => pickAvatar(null)}
              className="text-xs text-white/50 hover:text-cursed-light disabled:opacity-50"
            >
              Retirer
            </button>
          )}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un perso…"
            className="ml-auto w-44 rounded-lg border border-white/10 bg-void-900 px-3 py-1.5 text-sm text-white outline-none focus:border-domain"
          />
        </div>
        <div className="grid max-h-64 grid-cols-5 gap-2 overflow-y-auto pr-1 sm:grid-cols-7">
          {filtered.map((c) => {
            const selected = c.id === avatarId;
            return (
              <button
                key={c.id}
                type="button"
                disabled={pending}
                onClick={() => pickAvatar(c.id)}
                title={c.name}
                aria-pressed={selected}
                className={`aspect-square overflow-hidden rounded-lg border-2 transition-transform hover:scale-105 disabled:opacity-50 ${
                  selected ? "border-domain shadow-glow" : "border-white/10"
                }`}
              >
                <CharacterImage character={c} />
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="col-span-full py-6 text-center text-sm text-white/30">
              Aucun personnage.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
