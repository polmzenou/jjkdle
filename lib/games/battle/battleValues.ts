import type { Character } from "@/data/roster/characters";

/**
 * Barème de combat pour « JJK Random Battle ». Valeurs ancrées :
 * Yuji Modulo = 100, Momo = 2. La source de vérité au runtime reste la base
 * (`Character.battleValue`, éditable depuis /admin) ; cette table sert de
 * secours si la colonne est nulle (perso ajouté sans battleValue).
 *
 * Les clés sont les `id` exacts du roster builder (vérifiés : 45/45).
 */
export const battleValues: Record<string, number> = {
  // ─── S+ / Apex ───
  "yuji-modulo": 100,
  sukuna: 98,
  gojo: 96,
  dabura: 94,
  mahoraga: 92,

  // ─── S ───
  kenjaku: 86,
  yuta: 85,
  uraume: 78,
  "yuki-tsukumo": 80,
  kashimo: 78,
  higuruma: 76,

  // ─── A ───
  toji: 74,
  maki: 74,
  geto: 70,
  "naoya-fleau": 66,
  mahito: 64,
  hakari: 70,
  jogo: 60,
  megumi: 58,

  // ─── B ───
  hanami: 54,
  dagon: 52,
  choso: 60,
  yuji: 46,
  todo: 58,
  kurourushi: 42,
  reggie: 40,

  // ─── C ───
  "mei-mei": 36,
  nanami: 35,
  "ryu-ishigori": 34,
  naoya: 40,
  nobara: 28,
  kamo: 26,

  // ─── D ───
  inumaki: 22,
  panda: 20,
  mechamaru: 18,
  yaga: 16,
  takaba: 15,
  gakuganji: 14,
  "chien-de-jade": 12,
  rika: 11,

  // ─── E / Bottom ───
  utahime: 9,
  "mai-zenin": 8,
  miwa: 6,
  toad: 4,
  momo: 2,
};

/** Valeur de secours pour tout perso sans battleValue (évite un cumul cassé). */
export const FALLBACK_BATTLE_VALUE = 30;

/**
 * Résout la valeur de combat d'un personnage : colonne DB d'abord, puis table
 * de secours par id, puis fallback 30.
 */
export function battleValueOf(character: Character | undefined | null): number {
  if (!character) return FALLBACK_BATTLE_VALUE;
  if (typeof character.battleValue === "number") return character.battleValue;
  return battleValues[character.id] ?? FALLBACK_BATTLE_VALUE;
}
