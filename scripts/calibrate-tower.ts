/**
 * Calibrage de « The Culling Tower » par SIMULATION.
 *
 *   npx tsx scripts/calibrate-tower.ts          # 200 tours par politique
 *   npx tsx scripts/calibrate-tower.ts 1000     # plus de tours, moins de bruit
 *
 * ── Pourquoi cet outil existe ──
 * Les coefficients d'équilibrage (PV, frappe, multiplicateur de boss, handicap
 * d'escouade, seuil des starters) ont été réglés À LA MAIN quatre fois, et
 * chaque fois APRÈS qu'un joueur ait buté dessus : combats expédiés en quatre
 * secondes, élite ingagnable en solo, boss à cinq fois les PV, défaite
 * automatique à l'étage 2. Un aller-retour par correction, sur des parties de
 * quinze minutes.
 *
 * Le moteur étant PUR et DÉTERMINISTE, on peut jouer des milliers de tours en
 * quelques secondes et LIRE la courbe de difficulté au lieu de la deviner.
 *
 * Ce script ne modifie rien : il lit le roster réel en base et imprime un
 * rapport.
 *
 * ── Les trois politiques ──
 * Un réglage ne se juge pas sur un seul joueur. On simule donc trois
 * comportements, et ce sont leurs ÉCARTS qui portent l'information :
 *
 *   passif  n'appuie jamais. DOIT perdre — sinon l'intervention du joueur ne
 *           sert à rien et le jeu n'en est pas un.
 *   moyen   garde et lance ses techniques régulièrement, sans viser les
 *           fenêtres. Doit monter sans forcément boucler.
 *   expert  contre DANS la fenêtre télégraphiée, garde entre deux. Doit boucler
 *           assez souvent pour que la maîtrise se voie.
 *
 * Si `passif` et `expert` finissent au même étage, ce n'est pas le rapport qui
 * est faux : c'est le jeu.
 */

import { PrismaClient } from "@prisma/client";
import type { Character, CharacterTier } from "../data/roster/characters";
import { mulberry32 } from "../lib/games/battle/rng";
import {
  GUARD_COOLDOWN,
  GUARD_SLOT,
  MAX_TICKS,
  TICKS_PER_SECOND,
  simulateCombat,
  type CombatSetup,
} from "../lib/games/tower/combat";
import { JJK_TOWER_CONFIG } from "../lib/games/tower/config";
import { eventFor } from "../lib/games/tower/events";
import {
  buildTowerRoster,
  isTowerPlayable,
  optionsAt,
  type TowerRoster,
} from "../lib/games/tower/floors";
import { normalizeItem, type TowerItem } from "../lib/games/tower/items";
import { rollRewards } from "../lib/games/tower/rewards";
import {
  buildCombatSetup,
  chooseNode,
  chooseStarter,
  leaveMerchant,
  recruit,
  recruitChoices,
  resolveEvent,
  resolveFloor,
  skipRecruit,
  startRun,
  takeRest,
  takeReward,
  type TowerRunState,
} from "../lib/games/tower/run";
import { dailyStarters } from "../lib/games/tower/starters";
import {
  TOWER_FLOORS,
  type FightKind,
  type Intervention,
} from "../lib/games/tower/types";
import { JJK_EVENTS } from "../lib/universes/jjk-events";
import { jjk } from "../lib/universes/jjk";

const prisma = new PrismaClient();

type Policy = "passif" | "moyen" | "expert";
const POLICIES: readonly Policy[] = ["passif", "moyen", "expert"];

/** Tout ce qu'il faut pour jouer une tour sans retoucher la base. */
interface Context {
  roster: Record<string, Character>;
  list: Character[];
  tower: TowerRoster;
  items: TowerItem[];
  itemsById: Record<string, TowerItem>;
}

// ──────────────────────────────────────────────────────────────────────────
// Le joueur simulé
// ──────────────────────────────────────────────────────────────────────────

/**
 * Gardes posées dès que la garde est rechargée — communes aux deux politiques
 * actives.
 *
 * Elle est GRATUITE : il n'y a jamais de raison de la garder en réserve. Une
 * première version de ce script ne faisait garder l'expert qu'après chaque
 * fenêtre, et il finissait derrière le joueur moyen — sa garde n'était
 * disponible qu'un tick sur 75 au lieu d'un sur 40. Contrer n'est pas une
 * ALTERNATIVE à garder, c'est un supplément.
 */
function guardBeats(): Intervention[] {
  const out: Intervention[] = [];
  for (let tick = 6; tick < MAX_TICKS; tick += GUARD_COOLDOWN) {
    out.push({ tick, slot: GUARD_SLOT, kind: "guard" });
  }
  return out;
}

/**
 * Joue un combat selon une politique, et rend son issue.
 *
 * `moyen` suit un rythme FIXE : il appuie régulièrement sans lire le
 * télégraphe. C'est la baseline honnête du joueur qui a compris les boutons
 * mais pas le tempo.
 *
 * `expert` est ADAPTATIF, et il fallait qu'il le soit. Une version à horaire
 * fixe visait le milieu de fenêtres THÉORIQUES (cadence `TELEGRAPH_PERIOD` +
 * `TELEGRAPH_DURATION`) — et se faisait battre par le joueur moyen. La raison
 * n'était pas le timing mais l'ÉNERGIE : une technique coûte bien plus que ce
 * que le flux rend en un cycle, si bien qu'aucune des deux politiques ne peut
 * réellement tirer à chaque fenêtre. Le joueur moyen, qui essaie plus souvent,
 * tirait donc simplement plus. Or un vrai joueur VOIT sa jauge et ses ennemis :
 * on lui donne la même information en simulant d'abord, en relevant les
 * fenêtres réellement ouvertes (`telegraph-start`), puis en y plaçant ses
 * contres.
 *
 * On itère parce que contrer DÉPLACE les fenêtres suivantes : une charge
 * annulée remet le compteur de l'ennemi à zéro. Trois passes suffisent à
 * converger ; les interventions refusées faute d'énergie ne coûtent rien
 * (`reject`), on les laisse dans le journal.
 */
function fight(setup: CombatSetup, policy: Policy, squadSize: number) {
  const guards = policy === "passif" ? [] : guardBeats();

  if (policy === "passif") return simulateCombat({ ...setup, interventions: [] });

  if (policy === "moyen") {
    const beats: Intervention[] = [];
    for (let i = 0; 40 + i * 45 < MAX_TICKS; i += 1) {
      beats.push({ tick: 40 + i * 45, slot: i % squadSize });
    }
    return simulateCombat({
      ...setup,
      interventions: [...guards, ...beats].sort((a, b) => a.tick - b.tick),
    });
  }

  let result = simulateCombat({ ...setup, interventions: guards });

  for (let pass = 0; pass < 3; pass += 1) {
    const counters: Intervention[] = result.events
      .filter((e) => e.kind === "telegraph-start")
      .map((e, i) => ({
        // Au milieu de la fenêtre : ni au tick d'ouverture (un humain ne réagit
        // pas si vite), ni au dernier (le coup serait déjà parti).
        tick: e.t + Math.max(1, Math.floor((e.endsAt - e.t) / 2)),
        slot: i % squadSize,
      }));

    const next = simulateCombat({
      ...setup,
      interventions: [...guards, ...counters].sort((a, b) => a.tick - b.tick),
    });

    result = next;
  }

  return result;
}

/**
 * Choix de branche : le bonus quand l'escouade est incomplète ou entamée, la
 * voie directe (et sa récompense) sinon.
 *
 * Volontairement IDENTIQUE pour les trois politiques. Elles ne doivent différer
 * que par le combat — sans quoi on ne saurait plus si l'écart mesuré vient des
 * interventions ou de la navigation.
 */
function chooseBranch(
  state: TowerRunState,
  at: NonNullable<ReturnType<typeof optionsAt>>,
): number {
  if (at.options.length <= 1) return 0;

  const needsHelp =
    state.squad.length < 3 || state.squad.some((m) => m.hp < m.maxHp * 0.55);

  const index = at.options.findIndex((o) =>
    needsHelp ? o.prelude !== null : o.prelude === null,
  );
  return index >= 0 ? index : 0;
}

// ──────────────────────────────────────────────────────────────────────────
// Une tour, du premier étage à la chute
// ──────────────────────────────────────────────────────────────────────────

interface RunReport {
  floor: number;
  cleared: boolean;
  /** Durée cumulée des combats, en secondes. */
  seconds: number;
  fights: number;
  /** Étage où le premier membre de l'escouade est tombé. 0 = aucun. */
  firstDeath: number;
  /** Type du combat qui a mis fin à la run. `null` si elle est allée au bout. */
  killedBy: FightKind | null;
  /**
   * PV de l'escouade en entrant dans le combat fatal, en part du maximum.
   *
   * C'est le chiffre qui distingue les deux façons de perdre, et elles
   * n'appellent pas le même correctif : entrer à pleine vie et mourir quand
   * même veut dire que l'ennemi frappe trop fort ; entrer à 30 % veut dire que
   * l'USURE des étages précédents a fait le travail, et c'est le rythme des
   * soins qu'il faut revoir, pas la puissance des ennemis.
   */
  hpAtDeath: number;
}

function playRun(seed: number, policy: Policy, ctx: Context): RunReport {
  const config = JJK_TOWER_CONFIG;
  const rand = mulberry32(seed ^ 0x5f3759df);

  let state = startRun(seed);
  let seconds = 0;
  let fights = 0;
  let firstDeath = 0;
  let killedBy: FightKind | null = null;
  let hpAtDeath = 1;

  const finish = (): RunReport => ({
    floor: state.status === "won" ? TOWER_FLOORS : state.floor,
    cleared: state.status === "won",
    seconds,
    fights,
    firstDeath,
    killedBy: state.status === "won" ? null : killedBy,
    hpAtDeath,
  });

  // Starter : le plus fort des trois. C'est ce que fait tout joueur, et ça rend
  // la mesure comparable d'une graine à l'autre.
  const starters = dailyStarters(dateKeyFor(seed), ctx.list);
  if (starters.length === 0) return finish();

  const best = [...starters].sort(
    (a, b) => (a.battleValue ?? 0) - (b.battleValue ?? 0),
  )[starters.length - 1];

  const started = chooseStarter(state, best, config);
  if (!started.ok) return finish();
  state = started.state;

  // Garde-fou : une run passe par cinq écrans par étage tout au plus. Au-delà,
  // c'est une boucle et non une partie — mieux vaut un rapport tronqué qu'un
  // script figé.
  for (let step = 0; step < TOWER_FLOORS * 12; step += 1) {
    if (state.status === "won" || state.status === "lost") break;

    const at = optionsAt(seed, ctx.tower, state.floor);
    if (!at) break;
    const plan = at.options[state.path[state.floor - 1] ?? 0] ?? at.options[0];
    if (!plan) break;

    switch (state.status) {
      case "map": {
        const next = chooseNode(state, at.options, chooseBranch(state, at));
        if (!next.ok) return finish();
        state = next.state;
        break;
      }

      case "combat": {
        const setup = buildCombatSetup(
          state,
          plan,
          ctx.roster,
          config,
          ctx.itemsById,
        );
        const before = state.squad.length;
        const wholeness =
          state.squad.reduce((s, m) => s + m.hp, 0) /
          Math.max(1, state.squad.reduce((s, m) => s + m.maxHp, 0));

        const result = fight(setup, policy, Math.max(1, setup.squad.length));
        seconds += result.ticks / TICKS_PER_SECOND;
        fights += 1;
        state = resolveFloor(state, plan, result, ctx.itemsById);

        if (firstDeath === 0 && state.squad.length < before) {
          firstDeath = plan.floor;
        }
        if (state.status === "lost") {
          killedBy = plan.kind;
          hpAtDeath = wholeness;
        }
        break;
      }

      case "reward": {
        const rewards = rollRewards(
          seed,
          state.floor,
          plan.kind,
          ctx.items,
          state.items,
        );
        // Soigne quand l'escouade est entamée, prend l'objet sinon : le même
        // arbitrage qu'un joueur qui regarde ses barres de vie.
        const hurt = state.squad.some((m) => m.hp < m.maxHp * 0.6);
        const wanted = hurt ? "heal" : "item";
        const index = Math.max(0, rewards.findIndex((r) => r.kind === wanted));
        const taken = takeReward(state, plan, rewards[index]);
        if (!taken.ok) return finish();
        state = taken.state;
        break;
      }

      case "recruit": {
        const pick = recruitChoices(state, plan)
          .map((id) => ctx.roster[id])
          .filter((c): c is Character => Boolean(c))
          .sort((a, b) => (a.battleValue ?? 0) - (b.battleValue ?? 0))
          .pop();

        if (pick) {
          // Escouade pleine : on cède le plus ABÎMÉ, pas le plus faible — les
          // PV ne reviennent jamais seuls, un blessé est une place perdue.
          const sacrifice =
            state.squad.length >= 3
              ? state.squad.reduce(
                  (worst, m, i, all) => (m.hp < all[worst].hp ? i : worst),
                  0,
                )
              : undefined;

          const done = recruit(state, plan, pick, ctx.tower, config, sacrifice);
          if (done.ok) {
            state = done.state;
            break;
          }
        }

        const skipped = skipRecruit(state);
        if (!skipped.ok) return finish();
        state = skipped.state;
        break;
      }

      case "merchant": {
        // On ne fait pas acheter : l'étal dépend d'un catalogue que l'admin
        // fait varier, et on mesure ici le MOTEUR, pas le catalogue.
        const left = leaveMerchant(state);
        if (!left.ok) return finish();
        state = left.state;
        break;
      }

      case "rest": {
        const rested = takeRest(state);
        if (!rested.ok) return finish();
        state = rested.state;
        break;
      }

      case "event": {
        const event = eventFor(JJK_EVENTS, plan.eventIndex);
        const choice = event?.choices[rand() < 0.5 ? 0 : 1];
        const applied = resolveEvent(state, choice?.outcome ?? { text: "" }, null);
        if (!applied.ok) return finish();
        state = applied.state;
        break;
      }

      default:
        return finish();
    }
  }

  return finish();
}

/**
 * Une date par graine, pour que les starters varient d'une tour à l'autre.
 *
 * Simuler mille tours avec les MÊMES trois starters mesurerait la force de ces
 * trois personnages, pas l'équilibre du jeu.
 */
function dateKeyFor(seed: number): string {
  const day = new Date(Date.UTC(2026, 0, 1) + (seed % 900) * 86_400_000);
  return day.toISOString().slice(0, 10);
}

// ──────────────────────────────────────────────────────────────────────────
// Rapport
// ──────────────────────────────────────────────────────────────────────────

function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

function mean(values: readonly number[]): number {
  return values.length === 0
    ? 0
    : values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Où les runs meurent — c'est là qu'on voit les murs. */
function wallReport(reports: readonly RunReport[]): string {
  const deaths = new Map<number, number>();
  for (const r of reports) {
    if (r.cleared) continue;
    deaths.set(r.floor, (deaths.get(r.floor) ?? 0) + 1);
  }
  return (
    [...deaths.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(
        ([floor, n]) =>
          `étage ${floor} (${((n / reports.length) * 100).toFixed(0)} %)`,
      )
      .join(", ") || "aucun"
  );
}

/**
 * Ce qui tue, et dans quel état.
 *
 * La part par type de combat dit OÙ regarder (`ENEMY_HP_MULT` pour les boss, le
 * tirage des élites dans la strate supérieure pour les élites), et les PV
 * d'entrée disent SI c'est un problème de puissance ou d'usure.
 */
function causeReport(reports: readonly RunReport[]): string {
  const lost = reports.filter((r) => !r.cleared && r.killedBy);
  if (lost.length === 0) return "aucune défaite";

  const byKind = new Map<FightKind, number>();
  for (const r of lost) {
    byKind.set(r.killedBy!, (byKind.get(r.killedBy!) ?? 0) + 1);
  }

  const parts = [...byKind.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([kind, n]) => `${kind} ${((n / lost.length) * 100).toFixed(0)} %`);

  const hp = mean(lost.map((r) => r.hpAtDeath)) * 100;
  return `${parts.join(", ")} · escouade à ${hp.toFixed(0)} % en y entrant`;
}

function verdict(question: string, ok: boolean, detail: string) {
  console.log(`  ${ok ? "OK " : "NON"}  ${question}`);
  console.log(`        ${detail}`);
}

// ──────────────────────────────────────────────────────────────────────────
// Chargement
// ──────────────────────────────────────────────────────────────────────────

/**
 * Charge le contexte SANS passer par `lib/games/tower/queries` : ce module est
 * mémoïsé par le `cache()` de React et résout l'univers via `next/headers`,
 * deux choses qui n'existent pas dans un script.
 */
async function loadContext(universeId: string): Promise<Context> {
  const [rows, itemRows, withImage, arcAttribute] = await Promise.all([
    prisma.character.findMany({
      where: { universeId },
      orderBy: { position: "asc" },
      select: {
        id: true,
        name: true,
        title: true,
        tier: true,
        ratings: true,
        battleValue: true,
        attributeValues: {
          select: {
            numericValue: true,
            attribute: { select: { key: true } },
            option: { select: { value: true } },
          },
        },
      },
    }),
    prisma.item.findMany({
      where: { universeId, enabled: true },
      orderBy: { position: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        image: true,
        rarity: true,
        effectKind: true,
        effectValue: true,
        effectKind2: true,
        effectValue2: true,
        enabled: true,
        position: true,
      },
    }),
    prisma.item.findMany({
      where: { universeId, enabled: true, NOT: { imageData: null } },
      select: { id: true },
    }),
    prisma.attribute.findUnique({
      where: {
        universeId_key: { universeId, key: JJK_TOWER_CONFIG.arcAttributeKey },
      },
      select: {
        options: {
          orderBy: { order: "asc" },
          select: { value: true, order: true },
        },
      },
    }),
  ]);

  const list: Character[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    title: r.title,
    tier: r.tier as CharacterTier,
    ratings: (r.ratings ?? {}) as Character["ratings"],
    ...(r.battleValue != null ? { battleValue: r.battleValue } : {}),
    attributes: Object.fromEntries(
      r.attributeValues
        .map((v) => [v.attribute.key, v.option?.value ?? v.numericValue] as const)
        .filter((pair): pair is readonly [string, string | number] =>
          pair[1] != null,
        ),
    ),
  }));

  const imaged = new Set(withImage.map((r) => r.id));
  const items = itemRows
    .map((r) => normalizeItem({ ...r, imageData: imaged.has(r.id) }))
    .filter((i): i is TowerItem => i !== null);

  // Même règle qu'en jeu : une option d'arc sans rang n'est pas sur l'échelle
  // du récit (cf. `orderedValues` dans queries.ts).
  const arcOrder = (arcAttribute?.options ?? [])
    .filter((o) => typeof o.order === "number")
    .map((o) => o.value);

  return {
    roster: Object.fromEntries(list.map((c) => [c.id, c])),
    list,
    tower: buildTowerRoster(list, arcOrder, JJK_TOWER_CONFIG),
    items,
    itemsById: Object.fromEntries(items.map((i) => [i.id, i])),
  };
}

async function main() {
  const runs = Math.max(20, Number(process.argv[2]) || 200);

  const universe = await prisma.universe.findUnique({
    where: { slug: jjk.slug },
    select: { id: true },
  });
  if (!universe) throw new Error(`Univers "${jjk.slug}" absent en base.`);

  const ctx = await loadContext(universe.id);
  if (!isTowerPlayable(ctx.tower)) {
    throw new Error(
      "Vivier insuffisant : les arcs des personnages sont-ils renseignés en /admin ?",
    );
  }

  console.log(
    `\n${ctx.list.length} personnages · ` +
      `${ctx.tower.byStrate.map((p) => p.length).join("/")} par strate · ` +
      `${ctx.items.length} objets`,
  );
  console.log(`${runs} tours simulées par politique.\n`);

  console.log(
    "politique   clear%   médian   p90   combats   durée/combat   1re perte",
  );
  console.log("─".repeat(72));

  const summary = {} as Record<Policy, { clear: number; median: number }>;

  for (const policy of POLICIES) {
    const reports: RunReport[] = [];
    for (let i = 0; i < runs; i += 1) {
      reports.push(playRun(1_000 + i * 7919, policy, ctx));
    }

    const clearPct =
      (reports.filter((r) => r.cleared).length / reports.length) * 100;
    const floors = reports.map((r) => r.floor);
    const perFight =
      reports.reduce((s, r) => s + r.seconds, 0) /
      Math.max(1, reports.reduce((s, r) => s + r.fights, 0));
    const deaths = reports.filter((r) => r.firstDeath > 0).map((r) => r.firstDeath);

    summary[policy] = { clear: clearPct, median: percentile(floors, 0.5) };

    console.log(
      policy.padEnd(11) +
        `${clearPct.toFixed(1).padStart(6)}%` +
        `${String(percentile(floors, 0.5)).padStart(9)}` +
        `${String(percentile(floors, 0.9)).padStart(6)}` +
        `${mean(reports.map((r) => r.fights)).toFixed(1).padStart(10)}` +
        `${perFight.toFixed(1).padStart(13)} s` +
        `${(deaths.length ? mean(deaths).toFixed(1) : "—").padStart(11)}`,
    );
    console.log(`            murs  : ${wallReport(reports)}`);
    console.log(`            cause : ${causeReport(reports)}`);
  }

  console.log("\nCe que dit le rapport :\n");
  verdict(
    "Intervenir sert-il à quelque chose ?",
    summary.expert.median > summary.passif.median,
    `expert médian ${summary.expert.median} contre ${summary.passif.median} en passif — ` +
      "un écart nul voudrait dire que le joueur regarde un film.",
  );
  verdict(
    "Le joueur passif est-il arrêté ?",
    summary.passif.clear < 5,
    `${summary.passif.clear.toFixed(1)} % de tours bouclées sans jamais appuyer.`,
  );
  verdict(
    "La tour reste-t-elle franchissable ?",
    summary.expert.clear > 5,
    `${summary.expert.clear.toFixed(1)} % de tours bouclées en jouant bien ` +
      "(les essais sont illimités : viser 10–30 %).",
  );
  console.log("");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
