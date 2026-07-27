"use client";

import { motion } from "framer-motion";
import { CharacterImage } from "@/components/CharacterImage";
import type {
  AttributeColumn,
  AttributeHint,
  GuessRow as GuessRowData,
} from "@/lib/games/jjkdle/types";

/**
 * Classes de couleur par statut d'indice.
 *
 * ⚠️ Couleurs EN DUR, jamais celles du thème (`domain` / `cursed`) : ce code
 * vert / orange / rouge est un langage universel façon Wordle — il doit
 * d'ailleurs correspondre aux 🟩🟧🟥 du texte de partage — et non du branding.
 * `bg-cursed` était rouge en JJK mais or en CSM, où les cases fausses
 * devenaient donc indistinguables des cases « proche ».
 */
const STATUS_CLASS: Record<AttributeHint["status"], string> = {
  correct: "bg-emerald-600/80 border-emerald-400/60 text-white",
  close: "bg-amber-500/80 border-amber-300/60 text-void-900",
  wrong: "bg-red-700/70 border-red-500/50 text-white",
};

/**
 * Univers de référence pour les proportions : JJK et ses 8 attributs, dont le
 * rendu carré sert de mètre étalon à tous les autres.
 */
const REFERENCE_COLUMNS = 8;

/**
 * Largeur de la colonne avatar.
 *
 * Elle suit le nombre d'attributs plutôt qu'un identifiant d'univers : moins de
 * colonnes = plus de place horizontale, donc une vignette plus généreuse (CSM et
 * ses 6 attributs). JJK, à la densité de référence, garde ses 3rem d'origine.
 * Coder « si CSM » ici aurait figé la règle sur un anime au lieu de la donnée.
 */
function avatarCol(columnCount: number) {
  return columnCount >= REFERENCE_COLUMNS ? "3rem" : "4.5rem";
}

/**
 * Gabarit de grille : colonne avatar + une colonne par attribut. En style INLINE
 * et non en classe Tailwind, car le nombre de colonnes dépend de l'univers (donc
 * de la donnée) et ne peut pas être connu à la compilation.
 *
 * Les colonnes sont en `1fr` : la ligne occupe TOUJOURS toute la largeur de la
 * section, quel que soit le nombre d'attributs de l'univers.
 */
function gridStyle(columnCount: number) {
  return {
    gridTemplateColumns: `${avatarCol(columnCount)} repeat(${columnCount}, minmax(0, 1fr))`,
  };
}

/**
 * Proportion d'une tuile. C'est ELLE qui absorbe la variation du nombre de
 * colonnes : à largeur de section constante, moins d'attributs = colonnes plus
 * larges, et une tuile carrée deviendrait donc démesurément haute. On aplatit la
 * tuile d'autant, de sorte que sa HAUTEUR reste celle de l'univers de référence.
 *
 * ⚠️ Ne PAS revenir à `aspect-square` + `max-height` : avec un `aspect-ratio`,
 * CSS transfère les contraintes d'un axe à l'autre, donc un plafond de hauteur
 * devient aussi un plafond de LARGEUR. La tuile cesse alors de remplir sa
 * colonne et se colle à gauche, tandis que l'en-tête reste centré sur la
 * colonne — d'où un libellé décalé et des espaces béants entre les tuiles.
 *
 * Le ratio est borné à 1.35 : au-delà, les tuiles s'étireraient en bandeaux.
 */
function tileStyle(columnCount: number) {
  const ratio = Math.min(1.35, Math.max(1, REFERENCE_COLUMNS / columnCount));
  return { aspectRatio: String(ratio) };
}

interface GuessRowProps {
  row: GuessRowData;
  /** Colonnes de l'univers courant (ordre = ordre d'affichage). */
  columns: AttributeColumn[];
  /** Anime la révélation séquentielle (nouvelle ligne) ; sinon affichage direct. */
  animate?: boolean;
}

/**
 * Une proposition = avatar + une tuile par attribut. Les tuiles se révèlent en
 * cascade (stagger) pour une nouvelle ligne, dans l'esthétique violet/néon.
 */
export function GuessRow({ row, columns, animate = false }: GuessRowProps) {
  const labelByKey = new Map(columns.map((c) => [c.key, c.label]));

  return (
    <div className="grid gap-1.5 sm:gap-2" style={gridStyle(columns.length)}>
      {/* Avatar — centré verticalement : il est plus étroit que les tuiles. */}
      <div className="aspect-square self-center overflow-hidden rounded-lg border border-white/10">
        <CharacterImage character={{ name: row.characterName, image: row.image }} />
      </div>

      {row.hints.map((hint, i) => (
        <motion.div
          key={hint.key}
          initial={animate ? { opacity: 0, rotateX: -90, scale: 0.9 } : false}
          animate={{ opacity: 1, rotateX: 0, scale: 1 }}
          transition={{ delay: animate ? i * 0.12 : 0, duration: 0.35, ease: "easeOut" }}
          style={tileStyle(columns.length)}
          className={`flex flex-col items-center justify-center rounded-lg border p-1 text-center ${STATUS_CLASS[hint.status]}`}
          title={labelByKey.get(hint.key) ?? hint.key}
        >
          <span className="break-words text-[10px] font-semibold leading-tight sm:text-xs">
            {hint.display}
          </span>
          {hint.direction && (
            <span className="mt-0.5 text-base font-black leading-none">
              {hint.direction === "up" ? "↑" : "↓"}
            </span>
          )}
        </motion.div>
      ))}
    </div>
  );
}

/** En-tête de colonnes (avatar + libellés des attributs). */
export function GuessHeader({ columns }: { columns: AttributeColumn[] }) {
  return (
    <div className="grid gap-1.5 sm:gap-2" style={gridStyle(columns.length)}>
      <div />
      {columns.map((col) => (
        <div
          key={col.key}
          className="flex items-center justify-center px-0.5 text-center text-[9px] font-bold uppercase tracking-wide text-white/40 sm:text-[10px]"
        >
          {col.label}
        </div>
      ))}
    </div>
  );
}
