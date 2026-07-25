"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  AdminRankingCondition,
  AdminRankingSlot,
  ImportReport,
} from "@/lib/admin/ranking-store";
import type { Character } from "@/data/roster/characters";
import { SLOT_COUNT } from "@/data/ranking/conditions";
import { useGameTitle } from "@/components/universe/UniverseProvider";
import {
  saveRankingConditionAction,
  deleteRankingConditionAction,
  moveRankingConditionAction,
  importCategoryConditionsAction,
  saveRankingTiebreakAction,
} from "./ranking-actions";

/**
 * Onglet des CONSIGNES du Pyramid de l'univers administré.
 *
 * Deux natures de consignes cohabitent, et l'écran doit rendre la différence
 * évidente sans quoi l'admin croit pouvoir éditer ce qui est calculé :
 *
 *  • DÉRIVÉE (bouton « Importer les catégories ») — son classement vient des
 *    notes du roster et se met à jour tout seul. Il est donc en lecture seule ;
 *    seuls le libellé et la consigne s'éditent. Quand des notes sont à égalité,
 *    la note ne suffit plus à classer : le modal « Arbitrer » laisse l'admin
 *    trancher, mais UNIQUEMENT entre ex æquo — c'est ce qui fait que sa décision
 *    survit aux modifications de notes au lieu d'être écrasée.
 *
 *  • MANUELLE — les 8 personnages sont choisis un par un, l'ordre fait foi.
 */

const inputCls =
  "w-full rounded-md border border-white/10 bg-void-900 px-2.5 py-1.5 text-sm text-white outline-none focus:border-domain";

type Feedback = { ok: boolean; msg: string } | null;

interface CondForm {
  id?: string;
  pool: string;
  category: string;
  prompt: string;
  /** SLOT_COUNT ids, rang 1 → 8 ("" = rang vide). Manuelles uniquement. */
  order: string[];
  /** Édition d'une dérivée : le classement n'est pas éditable ici. */
  derived: boolean;
}

const emptyCond = (): CondForm => ({
  pool: "",
  category: "",
  prompt: "",
  order: Array.from({ length: SLOT_COUNT }, () => ""),
  derived: false,
});

/** Rangs regroupés par note IDENTIQUE (les groupes de +1 membre sont à arbitrer). */
function groupByRating(slots: AdminRankingSlot[]): AdminRankingSlot[][] {
  const groups: AdminRankingSlot[][] = [];
  for (const slot of slots) {
    const last = groups[groups.length - 1];
    // Les ex æquo sont forcément adjacents : le classement est trié par note.
    if (last && last[0].rating === slot.rating && slot.rating !== null) {
      last.push(slot);
    } else {
      groups.push([slot]);
    }
  }
  return groups;
}

export function PyramidAdmin({
  conditions,
  roster,
  universeName,
}: {
  conditions: AdminRankingCondition[];
  /** Roster de l'univers administré : seule source des 8 personnages classables. */
  roster: Character[];
  universeName: string;
}) {
  const router = useRouter();
  const gameTitle = useGameTitle("ranking");
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [form, setForm] = useState<CondForm>(emptyCond());
  const [report, setReport] = useState<ImportReport | null>(null);
  /** Consigne dont le modal d'arbitrage est ouvert. */
  const [arbitrating, setArbitrating] = useState<AdminRankingCondition | null>(
    null,
  );

  const sortedRoster = useMemo(
    () => [...roster].sort((a, b) => a.name.localeCompare(b.name, "fr")),
    [roster],
  );

  const filled = form.order.filter((id) => id !== "");
  const duplicates = filled.length !== new Set(filled).size;

  const run = (
    fn: () => Promise<{ ok: boolean; error?: string }>,
    okMsg: string,
  ) =>
    startTransition(async () => {
      const res = await fn();
      setFeedback(
        res.ok
          ? { ok: true, msg: okMsg }
          : { ok: false, msg: res.error ?? "Échec." },
      );
      if (res.ok) router.refresh();
    });

  const runImport = () =>
    startTransition(async () => {
      setReport(null);
      const res = await importCategoryConditionsAction();
      if (!res.ok || !res.report) {
        setFeedback({ ok: false, msg: res.error ?? "Échec." });
        return;
      }
      setReport(res.report);
      setFeedback(null);
      router.refresh();
    });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = Boolean(form.id);
    run(
      () =>
        saveRankingConditionAction({
          ...(form.id ? { id: form.id } : {}),
          pool: form.pool,
          category: form.category,
          prompt: form.prompt,
          // Une dérivée n'envoie pas de classement : le serveur l'ignorerait de
          // toute façon, mais l'omettre évite de faire croire l'inverse.
          order: form.derived ? [] : form.order,
        }),
      isEdit ? "Consigne mise à jour." : "Consigne créée.",
    );
    if (!isEdit) setForm(emptyCond());
  };

  const edit = (c: AdminRankingCondition) => {
    setFeedback(null);
    setForm({
      id: c.id,
      pool: c.pool,
      category: c.category,
      prompt: c.prompt,
      derived: c.criterion !== null,
      // Un id hors roster est vidé pour forcer un choix valide plutôt que d'être
      // renvoyé tel quel et rejeté à l'enregistrement.
      order: Array.from({ length: SLOT_COUNT }, (_, i) => c.order[i] ?? "").map(
        (id) => (roster.some((r) => r.id === id) ? id : ""),
      ),
    });
    if (typeof window !== "undefined")
      window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = (c: AdminRankingCondition) => {
    const extra = c.criterion
      ? "\n\n(Consigne automatique : elle reviendra au prochain « Importer les catégories ».)"
      : "";
    if (!window.confirm(`Supprimer la consigne « ${c.category} » ?${extra}`))
      return;
    run(() => deleteRankingConditionAction(c.id), "Consigne supprimée.");
    if (form.id === c.id) setForm(emptyCond());
  };

  const setRank = (index: number, id: string) =>
    setForm((f) => {
      const order = [...f.order];
      // Un perso déjà placé ailleurs migre : évite les doublons à la souris.
      if (id !== "") {
        const previous = order.indexOf(id);
        if (previous !== -1 && previous !== index) order[previous] = "";
      }
      order[index] = id;
      return { ...f, order };
    });

  const derivedCount = conditions.filter((c) => c.criterion).length;
  const tiedCount = conditions.filter((c) => c.ties.length > 0).length;

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-domain/30 bg-domain/5 p-4">
        <p className="text-sm text-white/70">
          Consignes de{" "}
          <span className="font-bold text-domain-light">{gameTitle}</span> pour{" "}
          <span className="font-bold text-domain-light">{universeName}</span> — le
          jeu en tire une au hasard par partie. Chacune classe {SLOT_COUNT}{" "}
          personnages, rang 1 = le plus fort.
        </p>
        {conditions.length === 0 && (
          <p className="mt-2 text-sm text-cursed-light">
            Aucune consigne : le jeu répond « Aucune condition disponible ».
            Importez les catégories, ou créez-en à la main.
          </p>
        )}
        {conditions.length === 1 && (
          <p className="mt-2 text-sm text-amber-300/90">
            Une seule consigne : le joueur rejouera toujours la même. Le tirage
            évite de répéter la précédente à partir de deux.
          </p>
        )}
      </div>

      {/* ── Import depuis les catégories du builder ── */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-domain/30 bg-domain/5 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">
            Pyramids automatiques
          </p>
          <p className="text-xs text-white/50">
            Une consigne par catégorie du builder (top {SLOT_COUNT} en Speed, en
            Coéquipier…). Leur classement suit ensuite les notes du roster tout
            seul — inutile de réimporter après avoir modifié une note.
          </p>
        </div>
        <button
          type="button"
          onClick={runImport}
          disabled={pending}
          className="rounded-xl bg-domain px-6 py-2.5 font-display font-black uppercase tracking-wide text-white shadow-glow transition-transform enabled:hover:scale-[1.03] disabled:opacity-40"
        >
          Importer les catégories
        </button>
      </div>

      {report && (
        <div className="space-y-1.5 rounded-xl border border-white/10 bg-void-800/40 px-4 py-3 text-sm">
          <p className="text-white/80">
            <span className="font-bold text-emerald-400">
              {report.created} créée(s)
            </span>{" "}
            · {report.updated} mise(s) à jour
          </p>
          {report.ties.length > 0 && (
            <p className="text-amber-300/90">
              À arbitrer :{" "}
              {report.ties
                .map((t) => `${t.label} (${t.count} ex æquo)`)
                .join(" · ")}
            </p>
          )}
          {report.skipped.length > 0 && (
            <div className="text-white/50">
              <p className="text-xs uppercase tracking-wider text-white/30">
                Catégories écartées
              </p>
              <ul className="mt-0.5 space-y-0.5">
                {report.skipped.map((s) => (
                  <li key={s.label} className="text-xs">
                    <span className="text-white/70">{s.label}</span> — {s.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {feedback && (
        <p
          className={`text-sm ${feedback.ok ? "text-emerald-400" : "text-cursed-light"}`}
        >
          {feedback.msg}
        </p>
      )}

      {/* ── Formulaire ── */}
      <form
        onSubmit={submit}
        className="space-y-4 rounded-2xl border border-white/10 bg-void-800/40 p-4"
      >
        <p className="text-xs uppercase tracking-wider text-white/40">
          {form.id
            ? `Modifier « ${form.category} »${form.derived ? " — automatique" : ""}`
            : "Nouvelle consigne manuelle"}
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-white/60">
            Titre / critère
            <input
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({ ...f, category: e.target.value }))
              }
              placeholder="ex. Puissance"
              className={`${inputCls} mt-1`}
            />
            <span className="mt-1 block text-[11px] text-white/35">
              Affiché en chip et comme titre du récap de fin.
            </span>
          </label>

          <label className="text-sm text-white/60">
            Pool (optionnel)
            <input
              value={form.pool}
              onChange={(e) => setForm((f) => ({ ...f, pool: e.target.value }))}
              placeholder="ex. Division 4"
              className={`${inputCls} mt-1`}
            />
            <span className="mt-1 block text-[11px] text-white/35">
              Qui on classe. Laisser vide si la consigne prend tout le roster.
            </span>
          </label>
        </div>

        <label className="block text-sm text-white/60">
          Consigne affichée au joueur
          <input
            value={form.prompt}
            onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
            placeholder="ex. Classe ces personnages du plus fort au plus faible."
            className={`${inputCls} mt-1`}
          />
        </label>

        {/* Aperçu : l'en-tête exact du jeu. */}
        <div className="rounded-xl border border-white/10 bg-void-900/60 p-3">
          <p className="mb-2 text-[11px] uppercase tracking-wider text-white/30">
            Aperçu en jeu
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {form.pool.trim() !== "" && (
              <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-white/60">
                {form.pool}
              </span>
            )}
            <span className="rounded-full bg-domain/15 px-2.5 py-1 text-xs font-bold text-domain-light">
              {form.category || "Titre / critère"}
            </span>
          </div>
          <p className="mt-1.5 text-sm text-white/65">
            {form.prompt || "La consigne apparaîtra ici."}
          </p>
        </div>

        {form.derived ? (
          <p className="rounded-xl border border-domain/20 bg-domain/5 px-3 py-2 text-xs text-white/55">
            Classement automatique : il est calculé depuis les notes du roster, on
            ne l&apos;édite pas ici. Pour départager des ex æquo, utilisez
            « Arbitrer » dans la liste.
          </p>
        ) : (
          <div>
            <p className="mb-2 text-sm text-white/60">
              Classement — rang 1 = le plus fort
              <span
                className={`ml-2 text-[11px] ${
                  filled.length === SLOT_COUNT && !duplicates
                    ? "text-emerald-400"
                    : "text-white/35"
                }`}
              >
                {filled.length}/{SLOT_COUNT}
                {duplicates && " · doublon"}
              </span>
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {form.order.map((id, i) => (
                <label key={i} className="flex items-center gap-2">
                  <span className="w-10 shrink-0 text-center text-xs font-bold text-white/40">
                    #{i + 1}
                  </span>
                  <select
                    value={id}
                    onChange={(e) => setRank(i, e.target.value)}
                    className={inputCls}
                  >
                    <option value="">— choisir —</option>
                    {sortedRoster.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={
              pending ||
              (!form.derived && (filled.length !== SLOT_COUNT || duplicates))
            }
            className="rounded-xl bg-domain px-4 py-2 font-display text-sm font-bold uppercase tracking-wide text-white disabled:opacity-40"
          >
            {form.id ? "Mettre à jour" : "Ajouter"}
          </button>
          {form.id && (
            <button
              type="button"
              onClick={() => setForm(emptyCond())}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/60 hover:text-white"
            >
              Annuler
            </button>
          )}
        </div>
      </form>

      {conditions.length > 0 && (
        <p className="text-xs text-white/35">
          {conditions.length} consigne(s) · {derivedCount} automatique(s)
          {tiedCount > 0 && ` · ${tiedCount} avec des ex æquo à arbitrer`}
        </p>
      )}

      {/* ── Liste ── */}
      <ul className="space-y-2">
        {conditions.map((c, i) => (
          <li
            key={c.id}
            className="rounded-xl border border-white/10 bg-void-800/40 px-3 py-2.5"
          >
            <div className="flex flex-wrap items-center gap-2">
              {c.pool && (
                <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-white/60">
                  {c.pool}
                </span>
              )}
              <span className="rounded-full bg-domain/15 px-2.5 py-1 text-[11px] font-bold text-domain-light">
                {c.category}
              </span>
              {c.criterion && (
                <span
                  className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-white/50"
                  title="Classement dérivé des notes du roster, tenu à jour automatiquement"
                >
                  auto · {c.criterionLabel}
                </span>
              )}
              {c.ties.length > 0 && (
                <button
                  type="button"
                  onClick={() => setArbitrating(c)}
                  className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold text-amber-300 hover:bg-amber-400/20"
                >
                  ⚠ {c.ties.reduce((n, g) => n + g.length, 0)} ex æquo — arbitrer
                </button>
              )}
              {c.missing.length > 0 && (
                <span
                  className="rounded-full bg-cursed/15 px-2.5 py-1 text-[11px] text-cursed-light"
                  title={`Hors roster : ${c.missing.join(", ")}`}
                >
                  injouable · {c.missing.length} perso(s) hors roster
                </span>
              )}
              {c.ratedCount != null && c.ratedCount < SLOT_COUNT && (
                <span className="rounded-full bg-cursed/15 px-2.5 py-1 text-[11px] text-cursed-light">
                  injouable · {c.ratedCount}/{SLOT_COUNT} personnages notés
                </span>
              )}
              <span className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  disabled={pending || i === 0}
                  onClick={() =>
                    run(
                      () => moveRankingConditionAction(c.id, "up"),
                      "Ordre mis à jour.",
                    )
                  }
                  className="rounded-md border border-white/10 px-2 py-1 text-xs text-white/60 hover:text-white disabled:opacity-20"
                  aria-label={`Monter ${c.category}`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={pending || i === conditions.length - 1}
                  onClick={() =>
                    run(
                      () => moveRankingConditionAction(c.id, "down"),
                      "Ordre mis à jour.",
                    )
                  }
                  className="rounded-md border border-white/10 px-2 py-1 text-xs text-white/60 hover:text-white disabled:opacity-20"
                  aria-label={`Descendre ${c.category}`}
                >
                  ↓
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => edit(c)}
                  className="rounded-md border border-white/10 px-2 py-1 text-xs text-white/70 hover:text-white disabled:opacity-40"
                >
                  Modifier
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => remove(c)}
                  className="rounded-md border border-cursed/40 px-2 py-1 text-xs text-cursed-light hover:bg-cursed/10 disabled:opacity-40"
                >
                  Supprimer
                </button>
              </span>
            </div>
            <p className="mt-1.5 text-xs text-white/45">{c.prompt}</p>
            <p className="mt-1 text-xs text-white/60">
              {c.slots.map((slot, rank) => (
                <span key={rank}>
                  {rank > 0 && <span className="text-white/20"> › </span>}
                  <span className="text-white/30">{rank + 1}.</span>{" "}
                  <span className={slot.tied ? "text-amber-300/90" : ""}>
                    {slot.name}
                  </span>
                  {slot.rating != null && (
                    <span className="text-white/25"> ({slot.rating})</span>
                  )}
                </span>
              ))}
            </p>
          </li>
        ))}
      </ul>

      {arbitrating && (
        <TiebreakModal
          condition={arbitrating}
          pending={pending}
          onClose={() => setArbitrating(null)}
          onSave={(order) => {
            setArbitrating(null);
            run(
              () => saveRankingTiebreakAction(arbitrating.id, order),
              "Arbitrage enregistré.",
            );
          }}
        />
      )}
    </section>
  );
}

/**
 * Modal d'ARBITRAGE des ex æquo.
 *
 * Les ↑/↓ ne déplacent un personnage qu'à l'intérieur de son groupe de note
 * identique. Ce n'est pas une limitation cosmétique : un ordre qui contredirait
 * les notes serait recalculé — donc effacé — à la lecture suivante. En
 * n'autorisant que les échanges entre ex æquo, l'arbitrage devient une donnée qui
 * survit à tous les rééquilibrages du roster.
 */
function TiebreakModal({
  condition,
  pending,
  onClose,
  onSave,
}: {
  condition: AdminRankingCondition;
  pending: boolean;
  onClose: () => void;
  onSave: (order: string[]) => void;
}) {
  const [slots, setSlots] = useState<AdminRankingSlot[]>(condition.slots);
  const groups = groupByRating(slots);

  /** Échange avec le voisin, si et seulement s'il a la MÊME note. */
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= slots.length) return;
    if (slots[target].rating !== slots[index].rating) return;
    setSlots((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  // Index absolu de chaque rang, pour que `move` raisonne sur le classement
  // complet alors que l'affichage est découpé en groupes.
  let cursor = 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-void-900 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-lg font-black uppercase tracking-wide text-white">
          Arbitrer « {condition.category} »
        </h2>
        <p className="mt-1 text-sm text-white/55">
          Les personnages à note identique sont regroupés : à vous de décider de
          leur ordre. Les autres rangs sont fixés par les notes et ne bougent pas.
        </p>

        {condition.ties.length === 0 ? (
          <p className="mt-4 rounded-xl border border-white/10 bg-void-800/40 px-3 py-3 text-sm text-white/60">
            Aucune égalité : ce classement est entièrement déterminé par les
            notes, il n&apos;y a rien à arbitrer.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {groups.map((group, gi) => {
              const arbitrable = group.length > 1;
              const start = cursor;
              cursor += group.length;
              return (
                <li
                  key={gi}
                  className={
                    arbitrable
                      ? "rounded-xl border border-amber-400/40 bg-amber-400/5 p-2"
                      : ""
                  }
                >
                  {arbitrable && (
                    <p className="mb-1 px-1 text-[11px] uppercase tracking-wider text-amber-300/80">
                      {group.length} ex æquo à {group[0].rating}
                    </p>
                  )}
                  <ul className="space-y-1">
                    {group.map((slot, gj) => {
                      const index = start + gj;
                      return (
                        <li
                          key={slot.characterId}
                          className="flex items-center gap-2 rounded-lg bg-void-800/60 px-2 py-1.5"
                        >
                          <span className="w-6 text-center text-xs font-bold text-white/35">
                            {index + 1}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm text-white">
                            {slot.name}
                          </span>
                          {!arbitrable && slot.rating != null && (
                            <span className="text-xs text-white/25">
                              {slot.rating}
                            </span>
                          )}
                          {arbitrable && (
                            <span className="flex gap-1">
                              <button
                                type="button"
                                disabled={gj === 0}
                                onClick={() => move(index, -1)}
                                className="rounded border border-white/10 px-1.5 text-xs text-white/60 hover:text-white disabled:opacity-20"
                                aria-label={`Monter ${slot.name}`}
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                disabled={gj === group.length - 1}
                                onClick={() => move(index, 1)}
                                className="rounded border border-white/10 px-1.5 text-xs text-white/60 hover:text-white disabled:opacity-20"
                                aria-label={`Descendre ${slot.name}`}
                              >
                                ↓
                              </button>
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/60 hover:text-white"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={pending || condition.ties.length === 0}
            onClick={() => onSave(slots.map((s) => s.characterId))}
            className="rounded-xl bg-domain px-4 py-2 font-display text-sm font-bold uppercase tracking-wide text-white disabled:opacity-40"
          >
            Enregistrer l&apos;arbitrage
          </button>
        </div>
      </div>
    </div>
  );
}
