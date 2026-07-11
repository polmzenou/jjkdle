/**
 * Logique pure du jeu « JJK Codenames » — aucune dépendance DB/serveur, testable
 * en isolation (cf. logic.test.ts). Les Server Actions (actions.ts) appellent ces
 * fonctions puis persistent/diffusent le résultat.
 */
import {
  CODENAMES_ASSASSINS,
  CODENAMES_PURPLE,
  CODENAMES_RED,
  CODENAMES_WIN_SCORE,
  type CardColor,
  type ColorKey,
  type Team,
  type TeamAssignment,
} from "./types";

/** Générateur de nombre aléatoire dans [0, 1) — injectable pour les tests. */
export type Rng = () => number;

/** Mélange de Fisher-Yates (copie, ne mute pas). RNG injectable. */
export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Construit la carte-clé : 8 rouges, 8 violettes, 1 assassin, le reste neutre,
 * assignés aléatoirement aux IDs de la grille (Fisher-Yates).
 */
export function buildColorKey(gridIds: string[], rng: Rng = Math.random): ColorKey {
  const colors: CardColor[] = [
    ...Array<CardColor>(CODENAMES_RED).fill("RED"),
    ...Array<CardColor>(CODENAMES_PURPLE).fill("PURPLE"),
    ...Array<CardColor>(CODENAMES_ASSASSINS).fill("ASSASSIN"),
  ];
  while (colors.length < gridIds.length) colors.push("NEUTRAL");
  const shuffled = shuffle(colors, rng);
  const key: ColorKey = {};
  gridIds.forEach((id, i) => {
    key[id] = shuffled[i];
  });
  return key;
}

/** L'autre équipe. */
export function otherTeam(team: Team): Team {
  return team === "RED" ? "PURPLE" : "RED";
}

/** Résultat de la révélation d'une carte par l'équipe active. */
export interface RevealOutcome {
  /** Équipe qui marque le point (couleur de la carte, sauf neutre/assassin). */
  pointTo: Team | null;
  /** Vrai si le tour se termine (carte adverse, neutre, ou assassin). */
  endsTurn: boolean;
  /** Vrai si l'assassin a été révélé → défaite immédiate de l'équipe active. */
  assassin: boolean;
}

/**
 * Résout l'effet d'une carte révélée selon sa couleur et l'équipe active :
 * - couleur de l'équipe active → +1 pour elle, le tour continue.
 * - couleur adverse → +1 pour l'adversaire, fin de tour.
 * - neutre → fin de tour (aucun point).
 * - assassin → défaite immédiate de l'équipe active.
 */
export function resolveReveal(color: CardColor, currentTeam: Team): RevealOutcome {
  if (color === "ASSASSIN") {
    return { pointTo: null, endsTurn: true, assassin: true };
  }
  if (color === "NEUTRAL") {
    return { pointTo: null, endsTurn: true, assassin: false };
  }
  // color est RED ou PURPLE
  if (color === currentTeam) {
    return { pointTo: currentTeam, endsTurn: false, assassin: false };
  }
  return { pointTo: otherTeam(currentTeam), endsTurn: true, assassin: false };
}

/** Équipe gagnante par score (8 cartes révélées), ou null. */
export function checkWin(redScore: number, purpleScore: number): Team | null {
  if (redScore >= CODENAMES_WIN_SCORE) return "RED";
  if (purpleScore >= CODENAMES_WIN_SCORE) return "PURPLE";
  return null;
}

// ──────────────────────────────────────────────────────────────────────────
// Contraintes d'équité de la sélection d'équipe
// ──────────────────────────────────────────────────────────────────────────

/** Compte des effectifs / maîtres-espions par équipe à partir des assignations. */
export interface TeamCounts {
  red: number;
  purple: number;
  unassigned: number;
  redSpymaster: boolean;
  purpleSpymaster: boolean;
}

/** Agrège les assignations en effectifs par équipe (parmi les joueurs présents). */
export function countTeams(
  assignments: Record<string, TeamAssignment>,
  playerIds: string[],
): TeamCounts {
  const counts: TeamCounts = {
    red: 0,
    purple: 0,
    unassigned: 0,
    redSpymaster: false,
    purpleSpymaster: false,
  };
  for (const id of playerIds) {
    const a = assignments[id];
    if (!a || a.team === null) {
      counts.unassigned++;
      continue;
    }
    if (a.team === "RED") {
      counts.red++;
      if (a.spymaster) counts.redSpymaster = true;
    } else {
      counts.purple++;
      if (a.spymaster) counts.purpleSpymaster = true;
    }
  }
  return counts;
}

/**
 * Liste des contraintes non satisfaites (messages FR). Vide = la partie peut
 * démarrer. Contraintes : tous assignés, écart d'effectifs ≤ 1, chaque équipe a
 * exactement 1 maître-espion + ≥ 1 agent.
 */
export function balanceViolations(
  assignments: Record<string, TeamAssignment>,
  playerIds: string[],
): string[] {
  const errors: string[] = [];
  const c = countTeams(assignments, playerIds);

  if (c.unassigned > 0) {
    errors.push(
      `${c.unassigned} joueur${c.unassigned > 1 ? "s" : ""} sans équipe.`,
    );
  }
  if (c.red < 2) errors.push("L'équipe rouge doit avoir au moins 2 joueurs.");
  if (c.purple < 2)
    errors.push("L'équipe violette doit avoir au moins 2 joueurs.");
  if (Math.abs(c.red - c.purple) > 1) {
    errors.push("Les équipes doivent être équilibrées (écart de 1 max).");
  }
  if (!c.redSpymaster)
    errors.push("L'équipe rouge doit avoir un maître-espion.");
  if (!c.purpleSpymaster)
    errors.push("L'équipe violette doit avoir un maître-espion.");
  // Chaque équipe : 1 maître-espion + ≥ 1 agent → au moins 2 joueurs (déjà vérifié).

  return errors;
}

/** Vrai si toutes les contraintes d'équité sont satisfaites. */
export function isTeamBalanced(
  assignments: Record<string, TeamAssignment>,
  playerIds: string[],
): boolean {
  return balanceViolations(assignments, playerIds).length === 0;
}

/**
 * Vrai si un joueur peut rejoindre `team` sans casser l'équilibre (écart ≤ 1).
 * On simule l'ajout (en retirant d'abord le joueur de son équipe actuelle).
 */
export function canJoinTeam(
  assignments: Record<string, TeamAssignment>,
  playerIds: string[],
  userId: string,
  team: Team,
): boolean {
  const next: Record<string, TeamAssignment> = {
    ...assignments,
    [userId]: { team, spymaster: false },
  };
  const c = countTeams(next, playerIds);
  return Math.abs(c.red - c.purple) <= 1;
}

/**
 * Répartition automatique équilibrée + un maître-espion tiré par équipe.
 * Respecte l'écart ≤ 1 (moitié/moitié, le joueur en trop va au rouge sur impair).
 */
export function autoBalance(
  playerIds: string[],
  rng: Rng = Math.random,
): Record<string, TeamAssignment> {
  const shuffled = shuffle(playerIds, rng);
  const half = Math.ceil(shuffled.length / 2);
  const redIds = shuffled.slice(0, half);
  const purpleIds = shuffled.slice(half);

  const assignments: Record<string, TeamAssignment> = {};
  redIds.forEach((id, i) => {
    assignments[id] = { team: "RED", spymaster: i === 0 };
  });
  purpleIds.forEach((id, i) => {
    assignments[id] = { team: "PURPLE", spymaster: i === 0 };
  });
  return assignments;
}

/** Ids des agents (non maître-espion) d'une équipe, d'après `teams`/spymasters. */
export function agentIdsOf(
  teams: Record<string, Team>,
  team: Team,
  redSpymasterId: string,
  purpleSpymasterId: string,
): string[] {
  const spymaster = team === "RED" ? redSpymasterId : purpleSpymasterId;
  return Object.entries(teams)
    .filter(([userId, t]) => t === team && userId !== spymaster)
    .map(([userId]) => userId);
}
