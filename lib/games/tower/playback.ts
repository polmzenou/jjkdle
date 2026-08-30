import type { CombatEvent, CombatResult, FighterSpec } from "./types";

/**
 * Relecture d'un combat — module PUR.
 *
 * Le moteur (`combat.ts`) résout un combat d'un bloc ; l'interface, elle, doit
 * l'afficher tick par tick. Plutôt que de faire ré-implémenter les règles à
 * l'interface — qui finirait fatalement par diverger du moteur — on REJOUE ici
 * le journal d'évènements jusqu'au tick voulu.
 *
 * Conséquence pratique pour l'écran de combat : quand le joueur intervient, on
 * relance simplement `simulateCombat` avec la nouvelle liste d'interventions et
 * on repart de ce journal. Une simulation coûte moins d'une milliseconde, et
 * cette approche garantit que ce qui est affiché est EXACTEMENT ce que le
 * serveur validera.
 */

export interface FighterSnapshot {
  uid: string;
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  alive: boolean;
  /** L'ennemi charge une attaque : c'est LA fenêtre d'intervention. */
  charging: boolean;
  /** Avancement de la charge, 0 → 1. */
  chargeProgress: number;
  /** Dégâts subis à ce tick précis (pour le nombre flottant et le flash). */
  damageTaken: number;
  /** Soin reçu à ce tick. */
  healed: number;
  /** Jauge d'ultime pleine : le bouton du slot bascule sur l'Extension. */
  domainReady: boolean;
}

export interface CombatSnapshot {
  tick: number;
  energy: number;
  squad: FighterSnapshot[];
  enemies: FighterSnapshot[];
  /** Shikigami actuellement en jeu. */
  summons: FighterSnapshot[];
  /** Évènements de CE tick, pour les effets ponctuels. */
  events: CombatEvent[];
  /** Une fenêtre est-elle ouverte ? Pilote la mise en avant des boutons. */
  windowOpen: boolean;
  /** Le combat est-il terminé à ce tick ? */
  finished: boolean;
}

/** Vrai si `tick` dépasse la fin du combat. */
export function isOver(result: CombatResult, tick: number): boolean {
  return tick >= result.ticks;
}

/**
 * État visuel du combat au tick demandé.
 *
 * Replie le journal depuis le début à chaque appel. C'est volontairement naïf :
 * un combat compte quelques centaines d'évènements, l'appel a lieu dix fois par
 * seconde, et un repli complet ne peut pas se désynchroniser d'un état
 * incrémental — ce qui serait le vrai risque ici.
 */
export function snapshotAt(
  result: CombatResult,
  setup: { squad: FighterSpec[]; enemies: FighterSpec[]; squadHp?: (number | undefined)[] },
  tick: number,
): CombatSnapshot {
  const clamped = Math.max(0, Math.min(result.ticks, Math.trunc(tick)));

  const squad = setup.squad.map((spec, i) =>
    initial(`s${i}`, spec, setup.squadHp?.[i]),
  );
  const enemies = setup.enemies.map((spec, i) => initial(`e${i}`, spec));
  const summons: FighterSnapshot[] = [];

  const byUid = new Map<string, FighterSnapshot>();
  for (const f of [...squad, ...enemies]) byUid.set(f.uid, f);

  /** Charges en cours : uid → [début, fin]. */
  const charges = new Map<string, [number, number]>();
  const current: CombatEvent[] = [];

  for (const event of result.events) {
    if (event.t > clamped) break;
    const atTick = event.t === clamped;
    if (atTick) current.push(event);

    switch (event.kind) {
      case "strike":
      case "telegraph-hit": {
        const target = byUid.get(event.to);
        if (target) {
          target.hp = Math.max(0, target.hp - event.damage);
          if (atTick) target.damageTaken += event.damage;
        }
        break;
      }
      case "heal": {
        const target = byUid.get(event.to);
        if (target) {
          target.hp = Math.min(target.maxHp, target.hp + event.amount);
          if (atTick) target.healed += event.amount;
        }
        break;
      }
      case "survive": {
        const who = byUid.get(event.who);
        if (who) who.hp = 1;
        break;
      }
      case "death": {
        const who = byUid.get(event.who);
        if (who) {
          who.alive = false;
          who.hp = 0;
        }
        charges.delete(event.who);
        break;
      }
      case "telegraph-start":
        charges.set(event.from, [event.t, event.endsAt]);
        break;
      case "telegraph-cancel":
        charges.delete(event.from);
        break;
      case "domain-ready": {
        const who = byUid.get(event.who);
        if (who) who.domainReady = true;
        break;
      }
      case "ultimate": {
        const who = byUid.get(event.from);
        if (who) who.domainReady = false;
        break;
      }
      case "summon": {
        // Le shikigami n'a pas de fiche d'entrée : on la fabrique à la volée
        // pour qu'il apparaisse dans l'escouade comme les autres.
        const caster = byUid.get(event.from);
        const snapshot: FighterSnapshot = {
          uid: event.summonId,
          id: `${caster?.id ?? "?"}-shikigami`,
          name: caster ? `Shikigami de ${caster.name}` : "Shikigami",
          hp: 1,
          maxHp: 1,
          alive: true,
          charging: false,
          chargeProgress: 0,
          damageTaken: 0,
          healed: 0,
          domainReady: false,
        };
        summons.push(snapshot);
        byUid.set(snapshot.uid, snapshot);
        break;
      }
      default:
        break;
    }
  }

  // Une charge encore ouverte au tick courant : c'est ce qui allume la fenêtre.
  for (const [uid, [start, end]] of charges) {
    const fighter = byUid.get(uid);
    if (!fighter || !fighter.alive) continue;
    fighter.charging = true;
    fighter.chargeProgress =
      end > start ? Math.min(1, (clamped - start) / (end - start)) : 1;
  }

  return {
    tick: clamped,
    // `energyByTick[t]` est l'énergie à la FIN du tick t : au tick courant,
    // le joueur a donc devant lui ce qu'il avait à la fin du précédent.
    energy: result.energyByTick[clamped - 1] ?? 0,
    squad,
    enemies,
    summons: summons.filter((s) => s.alive),
    events: current,
    windowOpen: enemies.some((e) => e.alive && e.charging),
    finished: clamped >= result.ticks,
  };
}

function initial(
  uid: string,
  spec: FighterSpec,
  startHp?: number,
): FighterSnapshot {
  const maxHp = spec.stats.maxHp;
  const hp =
    typeof startHp === "number" && Number.isFinite(startHp)
      ? Math.max(0, Math.min(maxHp, Math.round(startHp)))
      : maxHp;

  return {
    uid,
    id: spec.id,
    name: spec.name,
    hp,
    maxHp,
    alive: hp > 0,
    charging: false,
    chargeProgress: 0,
    damageTaken: 0,
    healed: 0,
    domainReady: false,
  };
}
