"use server";

import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth/session";
import { randomSeed } from "@/lib/games/battle/rng";
import { todayKey } from "@/lib/games/jjkdle/daily";
import { hashString } from "@/lib/rotation";
import { VIP_MAX_REPLAYS } from "@/lib/games/jjkdle/types";
import { towerRunExp } from "@/lib/progress/exp-rewards";
import { awardExp } from "@/lib/progress/recompute";
import type { ExpResult } from "@/lib/leaderboard/types";
import { simulateCombat } from "@/lib/games/tower/combat";
import { planTower } from "@/lib/games/tower/floors";
import { getTowerContext, type TowerContext } from "@/lib/games/tower/queries";
import {
  buildCombatSetup,
  buyHeal,
  buyItem,
  chooseStarter,
  leaveMerchant,
  isFinished,
  reachedFloor,
  recruit,
  resolveFloor,
  runScore,
  skipRecruit,
  startRun,
  takeReward,
  type TowerRunState,
} from "@/lib/games/tower/run";
import {
  MERCHANT_HEAL_PCT,
  MERCHANT_HEAL_PRICE,
  rollRewards,
  rollShop,
} from "@/lib/games/tower/rewards";
import { dailyStarters, isDailyStarter } from "@/lib/games/tower/starters";
import {
  TOWER_COOKIE,
  TOWER_COOKIE_MAX_AGE,
  countRandomRunsSince,
  createRun,
  dailyProgress,
  deleteRun,
  loadRun,
  recordScore,
  saveRun,
} from "@/lib/games/tower/store";
import { buildView } from "@/lib/games/tower/view";
import type { TowerActionResult, TowerView } from "@/lib/games/tower/view";
import type { FloorPlan, Intervention } from "@/lib/games/tower/types";

/**
 * Server Actions de « The Culling Tower ».
 *
 * C'est ICI que passe la frontière anti-triche (§14 du doc) :
 *  - le client ne reçoit que l'étage courant, jamais la suite de la tour ;
 *  - il ne renvoie qu'un LOG D'INTERVENTIONS `[{ tick, slot }]`, jamais des
 *    dégâts ni un résultat ;
 *  - le serveur RE-SIMULE le combat avec ce log et calcule l'issue lui-même.
 *
 * La simulation étant déterministe, la re-simulation est exacte : aucune
 * tolérance, aucune dérive possible entre ce que le joueur a vu et ce qui est
 * enregistré.
 */

/** Mode d'une run : la tour du jour (classée) ou une tour aléatoire. */
type Mode = "daily" | "random";

/**
 * Minuit du jour courant, dans le fuseau de référence du site — la même
 * définition de « jour » que `todayKey`, pour que le plafond VIP se remette à
 * zéro exactement quand la tour du jour change.
 */
function startOfToday(): Date {
  const [y, m, d] = todayKey().split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fail(error: string): TowerActionResult {
  return { ok: false, error };
}

// ──────────────────────────────────────────────────────────────────────────
// Contexte de session
// ──────────────────────────────────────────────────────────────────────────

async function readRunId(): Promise<string | null> {
  return (await cookies()).get(TOWER_COOKIE)?.value ?? null;
}

async function writeRunId(runId: string): Promise<void> {
  (await cookies()).set(TOWER_COOKIE, runId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TOWER_COOKIE_MAX_AGE,
  });
}

async function clearRunId(): Promise<void> {
  (await cookies()).delete(TOWER_COOKIE);
}

/** L'étage courant, régénéré depuis la graine — jamais lu en base. */
function planFor(context: TowerContext, seed: number, floor: number): FloorPlan | null {
  return planTower(seed, context.tower)[floor - 1] ?? null;
}

async function viewOf(params: {
  context: TowerContext;
  state: TowerRunState;
  seed: number;
  mode: Mode;
  attempt: number;
  isAuthed: boolean;
}): Promise<TowerView | null> {
  const plan = planFor(params.context, params.seed, params.state.floor);
  if (!plan) return null;

  return buildView({
    state: params.state,
    plan,
    roster: params.context.roster,
    config: params.context.config,
    mode: params.mode,
    attempt: params.attempt,
    isAuthed: params.isAuthed,
    starters:
      params.state.status === "starter"
        ? dailyStarters(todayKey(), params.context.list)
        : undefined,
    items: params.context.items,
    itemsById: params.context.itemsById,
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Démarrage
// ──────────────────────────────────────────────────────────────────────────

/**
 * Combien de tours aléatoires ce joueur peut-il encore lancer aujourd'hui ?
 *
 * Réutilise `VIP_MAX_REPLAYS`, la constante déjà en place pour les parties
 * bonus de JJKdle, plutôt que d'en inventer une seconde : un seul curseur pour
 * tous les rejouages du site, et le comportement ADMIN (illimité) est déjà
 * celui qu'appliquent les autres jeux.
 */
function randomAllowance(role: string | undefined): number {
  if (role === "ADMIN") return Infinity;
  if (role === "VIP") return VIP_MAX_REPLAYS;
  return 0;
}

/**
 * Démarre une run, ou reprend celle qui est en cours.
 *
 * Règle des essais (§11 du doc) : **la tour du jour est rejouable à l'infini
 * jusqu'à la réussite**, pour tout le monde, compte ou pas. Une fois bouclée,
 * seuls VIP et ADMIN peuvent enchaîner sur des tours aléatoires — hors
 * classement et à XP réduite.
 */
export async function startTowerAction(
  forceNew = false,
): Promise<TowerActionResult> {
  const [user, context] = await Promise.all([getCurrentUser(), getTowerContext()]);

  if (!context.playable) {
    return fail(
      "Le contenu de cet univers ne permet pas encore de dresser la tour (arcs de personnages à renseigner en admin).",
    );
  }

  // Reprise : une run en cours prime toujours, sauf demande explicite.
  const existingId = await readRunId();
  if (existingId && !forceNew) {
    const existing = await loadRun(existingId);
    if (existing && existing.universeId === context.universeId) {
      const view = await viewOf({
        context,
        state: existing.state,
        seed: existing.seed,
        mode: existing.dateKey ? "daily" : "random",
        attempt: existing.attempt,
        isAuthed: Boolean(user),
      });
      if (view) return { ok: true, view };
    }
    await clearRunId();
  }

  const dateKey = todayKey();
  let mode: Mode = "daily";
  let attempt = 1;

  if (user) {
    const progress = await dailyProgress(user.id, context.universeId, dateKey);

    if (progress.cleared) {
      const allowance = randomAllowance(user.role);
      if (allowance <= 0) {
        return fail(
          "Tu as déjà franchi la tour du jour. Reviens demain pour la prochaine.",
        );
      }
      // Les tours aléatoires n'ont pas de `dateKey` : elles se comptent à part
      // des essais du jour, sinon le plafond VIP ne s'appliquerait jamais.
      const used = await countRandomRunsSince(
        user.id,
        context.universeId,
        startOfToday(),
      );
      if (used >= allowance) {
        return fail(
          `Limite de ${allowance} tours bonus atteinte pour aujourd'hui.`,
        );
      }
      mode = "random";
    } else {
      attempt = progress.attempts + 1;
    }
  }

  // La tour du jour est la MÊME pour tout le monde : sa graine ne dépend que
  // de la date. Une tour aléatoire tire la sienne.
  const seed = mode === "daily" ? hashString(dateKey) : randomSeed();
  const state = startRun(seed);

  const runId = await createRun({
    userId: user?.id ?? null,
    universeId: context.universeId,
    seed,
    dateKey: mode === "daily" ? dateKey : null,
    attempt,
    state,
  });
  await writeRunId(runId);

  const view = await viewOf({
    context,
    state,
    seed,
    mode,
    attempt,
    isAuthed: Boolean(user),
  });
  return view ? { ok: true, view } : fail("Impossible de dresser la tour.");
}

// ──────────────────────────────────────────────────────────────────────────
// Choix du starter
// ──────────────────────────────────────────────────────────────────────────

export async function chooseStarterAction(
  characterId: string,
): Promise<TowerActionResult> {
  const loaded = await requireRun();
  if ("error" in loaded) return fail(loaded.error);
  const { run, context, user } = loaded;

  // Garde serveur : le client envoie un id, rien ne l'empêche d'y glisser
  // celui de Gojo. C'est ce contrôle qui rend le plafond des starters réel.
  if (!isDailyStarter(todayKey(), context.list, characterId)) {
    return fail("Ce personnage n'est pas proposé aujourd'hui.");
  }

  const character = context.roster[characterId];
  if (!character) return fail("Personnage introuvable.");

  const outcome = chooseStarter(run.state, character, context.config);
  if (!outcome.ok) return fail("Ce choix n'est plus possible.");

  await saveRun(run.id, run.state.floor, outcome.state);

  const view = await viewOf({
    context,
    state: outcome.state,
    seed: run.seed,
    mode: run.dateKey ? "daily" : "random",
    attempt: run.attempt,
    isAuthed: Boolean(user),
  });
  return view ? { ok: true, view } : fail("Étage introuvable.");
}

// ──────────────────────────────────────────────────────────────────────────
// Combat
// ──────────────────────────────────────────────────────────────────────────

/**
 * Résout le combat de l'étage courant.
 *
 * `interventions` est le SEUL apport du client. Le serveur régénère l'étage,
 * remonte le combat depuis l'état de run et rejoue la simulation : le résultat
 * renvoyé est le sien, pas celui que le client a animé.
 */
export async function resolveCombatAction(
  interventions: Intervention[],
): Promise<TowerActionResult> {
  const loaded = await requireRun();
  if ("error" in loaded) return fail(loaded.error);
  const { run, context, user } = loaded;

  if (run.state.status !== "combat") return fail("Aucun combat en cours.");

  const plan = planFor(context, run.seed, run.state.floor);
  if (!plan) return fail("Étage introuvable.");

  const setup = buildCombatSetup(
    run.state,
    plan,
    context.roster,
    context.config,
    context.itemsById,
  );
  const result = simulateCombat({ ...setup, interventions: sanitize(interventions) });
  const next = resolveFloor(run.state, plan, result, context.itemsById);

  // Garde d'idempotence : si la run n'est plus à cet étage, un double envoi est
  // déjà passé. On ne rejoue pas le combat une seconde fois.
  const saved = await saveRun(run.id, run.state.floor, next);
  if (!saved) return fail("Cet étage a déjà été résolu.");

  let exp: ExpResult | undefined;
  if (isFinished(next)) {
    exp = await finishRun({ run, context, state: next, userId: user?.id ?? null });
  }

  const view = await viewOf({
    context,
    state: next,
    seed: run.seed,
    mode: run.dateKey ? "daily" : "random",
    attempt: run.attempt,
    isAuthed: Boolean(user),
  });
  return view ? { ok: true, view, combat: result, exp } : fail("Étage introuvable.");
}

/**
 * Nettoie le log d'interventions AVANT la simulation.
 *
 * Le moteur sait déjà écarter une intervention invalide, mais un tableau de
 * 100 000 entrées le ferait tourner pour rien : on borne ici la quantité, lui
 * borne la légalité.
 */
function sanitize(interventions: unknown): Intervention[] {
  if (!Array.isArray(interventions)) return [];
  return interventions
    .slice(0, 200)
    .filter(
      (i): i is Intervention =>
        typeof i === "object" &&
        i !== null &&
        Number.isFinite((i as Intervention).tick) &&
        Number.isFinite((i as Intervention).slot),
    )
    .map((i) => ({
      tick: Math.trunc(i.tick),
      slot: Math.trunc(i.slot),
      // Toute valeur inconnue retombe sur "technique" : le moteur validera
      // ensuite la légalité de l'action elle-même.
      kind: i.kind === "guard" ? ("guard" as const) : ("technique" as const),
    }));
}

// ──────────────────────────────────────────────────────────────────────────
// Récompense
// ──────────────────────────────────────────────────────────────────────────

/**
 * Prend une des trois récompenses de fin d'étage.
 *
 * Le client n'envoie qu'un INDEX, jamais l'objet lui-même : le serveur
 * régénère les trois options depuis la graine et l'étage, exactement comme il
 * régénère la tour. Sans cela, il suffirait de réécrire la requête pour
 * s'offrir l'épique de son choix.
 */
export async function takeRewardAction(index: number): Promise<TowerActionResult> {
  const loaded = await requireRun();
  if ("error" in loaded) return fail(loaded.error);
  const { run, context, user } = loaded;

  if (run.state.status !== "reward") return fail("Aucune récompense en attente.");

  const plan = planFor(context, run.seed, run.state.floor);
  if (!plan) return fail("Étage introuvable.");

  const rewards = rollRewards(
    run.seed,
    run.state.floor,
    plan.kind,
    context.items,
    run.state.items,
  );
  const reward = rewards[Math.trunc(index)];
  if (!reward) return fail("Cette récompense n'existe pas.");

  const outcome = takeReward(run.state, plan, reward);
  if (!outcome.ok) return fail("Cette récompense n'est plus disponible.");

  await saveRun(run.id, run.state.floor, outcome.state);
  return viewResult(context, outcome.state, run, user);
}

// ──────────────────────────────────────────────────────────────────────────
// Marchand
// ──────────────────────────────────────────────────────────────────────────

/** Achète un objet à l'étal. Le PRIX vient du serveur, jamais du client. */
export async function buyItemAction(itemId: string): Promise<TowerActionResult> {
  const loaded = await requireRun();
  if ("error" in loaded) return fail(loaded.error);
  const { run, context, user } = loaded;

  if (run.state.status !== "merchant") return fail("Tu n'es pas chez le marchand.");

  const offer = rollShop(
    run.seed,
    run.state.floor,
    context.items,
    run.state.items,
  ).find((o) => o.item.id === itemId);
  if (!offer) return fail("Cet objet n'est pas en vente ici.");

  const outcome = buyItem(run.state, offer.item.id, offer.price);
  if (!outcome.ok) {
    return fail(
      outcome.error === "too-expensive"
        ? "Pas assez de fragments."
        : "Tu possèdes déjà cet objet.",
    );
  }

  await saveRun(run.id, run.state.floor, outcome.state);
  return viewResult(context, outcome.state, run, user);
}

/** Achète le soin d'escouade vendu à l'étal. */
export async function buyHealAction(): Promise<TowerActionResult> {
  const loaded = await requireRun();
  if ("error" in loaded) return fail(loaded.error);
  const { run, context, user } = loaded;

  const outcome = buyHeal(run.state, MERCHANT_HEAL_PRICE, MERCHANT_HEAL_PCT);
  if (!outcome.ok) {
    return fail(
      outcome.error === "too-expensive"
        ? "Pas assez de fragments."
        : "Tu n'es pas chez le marchand.",
    );
  }

  await saveRun(run.id, run.state.floor, outcome.state);
  return viewResult(context, outcome.state, run, user);
}

/** Quitte l'étal et monte d'un étage. */
export async function leaveMerchantAction(): Promise<TowerActionResult> {
  const loaded = await requireRun();
  if ("error" in loaded) return fail(loaded.error);
  const { run, context, user } = loaded;

  const outcome = leaveMerchant(run.state);
  if (!outcome.ok) return fail("Tu n'es pas chez le marchand.");

  await saveRun(run.id, run.state.floor, outcome.state);
  return viewResult(context, outcome.state, run, user);
}

// ──────────────────────────────────────────────────────────────────────────
// Recrutement
// ──────────────────────────────────────────────────────────────────────────

export async function recruitAction(
  characterId: string,
  sacrificeSlot?: number,
): Promise<TowerActionResult> {
  const loaded = await requireRun();
  if ("error" in loaded) return fail(loaded.error);
  const { run, context, user } = loaded;

  const plan = planFor(context, run.seed, run.state.floor);
  if (!plan) return fail("Étage introuvable.");

  const character = context.roster[characterId];
  if (!character) return fail("Personnage introuvable.");

  const outcome = recruit(
    run.state,
    plan,
    character,
    context.tower,
    context.config,
    sacrificeSlot,
  );
  if (!outcome.ok) return fail(recruitError(outcome.error));

  await saveRun(run.id, run.state.floor, outcome.state);

  const view = await viewOf({
    context,
    state: outcome.state,
    seed: run.seed,
    mode: run.dateKey ? "daily" : "random",
    attempt: run.attempt,
    isAuthed: Boolean(user),
  });
  return view ? { ok: true, view } : fail("Étage introuvable.");
}

export async function skipRecruitAction(): Promise<TowerActionResult> {
  const loaded = await requireRun();
  if ("error" in loaded) return fail(loaded.error);
  const { run, context, user } = loaded;

  const outcome = skipRecruit(run.state);
  if (!outcome.ok) return fail("Aucun recrutement en attente.");

  await saveRun(run.id, run.state.floor, outcome.state);

  const view = await viewOf({
    context,
    state: outcome.state,
    seed: run.seed,
    mode: run.dateKey ? "daily" : "random",
    attempt: run.attempt,
    isAuthed: Boolean(user),
  });
  return view ? { ok: true, view } : fail("Étage introuvable.");
}

function recruitError(error: string): string {
  switch (error) {
    case "recruit-capped":
      return "Ce personnage est encore hors de portée à cette strate.";
    case "bad-slot":
      return "Choisis le personnage à sacrifier.";
    case "already-in-squad":
      return "Il est déjà dans ton escouade.";
    default:
      return "Ce recrutement n'est plus possible.";
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Fin de run
// ──────────────────────────────────────────────────────────────────────────

export async function abandonRunAction(): Promise<{ ok: true }> {
  const runId = await readRunId();
  if (runId) await deleteRun(runId);
  await clearRunId();
  return { ok: true };
}

/**
 * Enregistre une run terminée et crédite l'XP.
 *
 * L'XP est payée AU PLUS-HAUT-ATTEINT DU JOUR (`towerRunExp`) : les essais
 * étant illimités, la payer par essai ferait de la Tour la ferme à XP du site.
 * Les coins et le drop de booster restent entièrement gérés par `awardExp` —
 * la Tour ne crédite jamais rien elle-même, comme les huit autres jeux.
 */
async function finishRun(params: {
  run: { id: string; dateKey: string | null; attempt: number };
  context: TowerContext;
  state: TowerRunState;
  userId: string | null;
}): Promise<ExpResult | undefined> {
  const { run, context, state, userId } = params;

  await deleteRun(run.id);
  await clearRunId();

  // Jouable déconnecté : la run se joue jusqu'au bout, mais rien n'est
  // enregistré. L'écran de récap invite alors à créer un compte.
  if (!userId) return { ok: false, needsAuth: true };

  const daily = Boolean(run.dateKey);
  const floor = reachedFloor(state);

  const progress = daily
    ? await dailyProgress(userId, context.universeId, run.dateKey!)
    : { attempts: 0, cleared: false, bestFloor: 0 };

  const gained = towerRunExp({
    floorReached: floor,
    bestFloorBefore: progress.bestFloor,
    daily,
  });

  await recordScore({
    userId,
    universeId: context.universeId,
    score: runScore(state),
    floor,
    enemiesKilled: state.enemiesKilled,
    bossesKilled: state.bossesKilled,
    cleared: state.status === "won",
    attempt: run.attempt,
    dateKey: run.dateKey,
    xpEarned: gained,
  });

  const { gained: gainedExp, gainedCoins, newBadges, droppedBooster } =
    await awardExp(userId, gained, "tower");

  return { ok: true, gainedExp, gainedCoins, newBadges, droppedBooster };
}

// ──────────────────────────────────────────────────────────────────────────
// Chargement commun
// ──────────────────────────────────────────────────────────────────────────

/** Réponse standard d'une action : la vue de l'état qui vient d'être écrit. */
async function viewResult(
  context: TowerContext,
  state: TowerRunState,
  run: { seed: number; dateKey: string | null; attempt: number },
  user: { id: string } | null,
): Promise<TowerActionResult> {
  const view = await viewOf({
    context,
    state,
    seed: run.seed,
    mode: run.dateKey ? "daily" : "random",
    attempt: run.attempt,
    isAuthed: Boolean(user),
  });
  return view ? { ok: true, view } : fail("Étage introuvable.");
}

async function requireRun(): Promise<
  | { error: string }
  | {
      run: NonNullable<Awaited<ReturnType<typeof loadRun>>>;
      context: TowerContext;
      user: Awaited<ReturnType<typeof getCurrentUser>>;
    }
> {
  const runId = await readRunId();
  if (!runId) return { error: "Aucune ascension en cours." };

  const [run, context, user] = await Promise.all([
    loadRun(runId),
    getTowerContext(),
    getCurrentUser(),
  ]);

  if (!run) {
    await clearRunId();
    return { error: "Aucune ascension en cours." };
  }
  // Une run démarrée sur un univers ne se reprend pas depuis un autre.
  if (run.universeId !== context.universeId) {
    return { error: "Cette ascension appartient à un autre univers." };
  }

  return { run, context, user };
}
