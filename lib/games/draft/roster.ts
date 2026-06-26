import type { DraftCharacter, DraftCategoryId, DraftTier } from "./types";

/**
 * Liste maître du draft : 48 personnages (6 par catégorie d'excellence,
 * répartis [S, A, B, B, C, C]). Les valeurs `cost`/`statValue` respectent les
 * barèmes par tier :
 *   S : statValue 22–25, coût 22–28
 *   A : statValue 16–19, coût 14–18
 *   B : statValue 11–14, coût  8–12
 *   C : statValue  6–9,  coût  3–6
 *
 * Un personnage peut être proposé dans une catégorie qui n'est PAS la sienne
 * (cf. tirage) : le bonus de placement n'est obtenu que s'il est draftÉ dans sa
 * catégorie d'excellence. Les images réutilisent `public/assets/characters/*` ;
 * faute d'asset, `CharacterImage` retombe sur les initiales.
 */

const ASSET = (file: string) => `/assets/characters/${file}`;

function ch(
  id: string,
  name: string,
  excellenceCategory: DraftCategoryId,
  tier: DraftTier,
  statValue: number,
  cost: number,
  imageFile?: string,
): DraftCharacter {
  return {
    id,
    name,
    excellenceCategory,
    tier,
    statValue,
    cost,
    image: imageFile ? ASSET(imageFile) : undefined,
  };
}

export const DRAFT_ROSTER: DraftCharacter[] = [
  // ── Stock d'énergie occulte ──
  ch("yuta", "Yuta Okkotsu", "occult-energy", "S", 25, 28, "Yuta_Portrait_Anime.webp"),
  ch("choso", "Choso", "occult-energy", "A", 18, 16, "Choso_Portrait_Anime.webp"),
  ch("mei-mei", "Mei Mei", "occult-energy", "B", 13, 10, "Mei_Mei_recieves_the_payment_from_Gojo_29.webp"),
  ch("noritoshi", "Noritoshi Kamo", "occult-energy", "B", 12, 9, "Noritoshi_Portrait_Anime.webp"),
  ch("momo", "Momo Nishimiya", "occult-energy", "C", 8, 5, "Momo_Portrait_Anime.webp"),
  ch("miwa", "Kasumi Miwa", "occult-energy", "C", 7, 4, "Kasumi_Portrait_Anime.webp"),

  // ── Force physique ──
  ch("todo", "Aoi Todo", "physical-strength", "S", 24, 26, "Aoi_Portrait_Anime.webp"),
  ch("maki", "Maki Zen'in", "physical-strength", "A", 19, 17, "Maki_Portrait_Anime_2.webp"),
  ch("reggie", "Reggie Star", "physical-strength", "B", 14, 12, "Reggie_Star_first_appearance_(Anime).webp"),
  ch("ryu", "Ryu Ishigori", "physical-strength", "B", 13, 10, "Ryu_Ishigori_29.webp"),
  ch("mai", "Mai Zen'in", "physical-strength", "C", 6, 3, "Mai_Portrait_Anime.webp"),
  ch("ogi", "Ogi Zen'in", "physical-strength", "C", 9, 6),

  // ── Vitesse ──
  ch("naoya", "Naoya Zen'in", "speed", "S", 23, 24, "Naoya_Portrait_Anime.webp"),
  ch("nanami", "Kento Nanami", "speed", "A", 18, 16, "Kento_Portrait_Anime.webp"),
  ch("divine-dog", "Divine Dog", "speed", "B", 11, 8, "Divine_Dog_Totality_29.webp"),
  ch("kashimo", "Hajime Kashimo", "speed", "B", 14, 12, "Hajime_Portrait_Anime.webp"),
  ch("utahime", "Utahime Iori", "speed", "C", 7, 4, "Utahime_Portrait_Anime.webp"),
  ch("kusakabe", "Atsuya Kusakabe", "speed", "C", 8, 5),

  // ── Battle IQ ──
  ch("higuruma", "Hiromi Higuruma", "battle-iq", "S", 24, 25, "Hiromi_Portrait_Anime.webp"),
  ch("mechamaru", "Kokichi Muta", "battle-iq", "A", 17, 15, "Kokichi_Portrait_Anime.webp"),
  ch("kenjaku", "Kenjaku", "battle-iq", "B", 13, 10, "Faux_Suguru_Portrait_Anime.webp"),
  ch("naobito", "Naobito Zen'in", "battle-iq", "B", 12, 9),
  ch("shoko", "Shoko Ieiri", "battle-iq", "C", 6, 3),
  ch("kirara", "Kirara Hoshi", "battle-iq", "C", 9, 6),

  // ── Sort inné (avatar de combat) ──
  ch("hakari", "Kinji Hakari", "innate-technique", "S", 25, 26, "Hakari_asking_Megumi_to_be_buds_29.webp"),
  ch("hanami", "Hanami", "innate-technique", "A", 18, 16, "Hanami_Portrait_Anime.webp"),
  ch("dagon", "Dagon", "innate-technique", "B", 12, 9, "Dagon_Portrait_Anime_2.webp"),
  ch("jogo", "Jogo", "innate-technique", "B", 14, 12, "Jogo_Portrait_Anime.webp"),
  ch("kurourushi", "Kurourushi", "innate-technique", "C", 8, 5, "Kurourushi.webp"),
  ch("charles", "Charles Bernard", "innate-technique", "C", 7, 4),

  // ── Extension du territoire ──
  ch("uraume", "Uraume", "domain-expansion", "S", 23, 26, "Uraume_Portrait_Anime.webp"),
  ch("uro", "Takako Uro", "domain-expansion", "A", 17, 16),
  ch("yaga", "Masamichi Yaga", "domain-expansion", "B", 11, 8, "Masamichi_Portrait_Anime.webp"),
  ch("angel", "Hana Kurusu", "domain-expansion", "B", 13, 10),
  ch("fumihiko", "Fumihiko Takaba", "domain-expansion", "C", 7, 4, "Fumihiko_Portrait_Anime.webp"),
  ch("manami", "Manami Suda", "domain-expansion", "C", 6, 3),

  // ── Black Flash ──
  ch("yuki", "Yuki Tsukumo", "black-flash", "S", 24, 25, "Yuki_Portrait_Anime.webp"),
  ch("toji", "Toji Fushiguro", "black-flash", "A", 19, 18, "Toji_Portrait_Anime.webp"),
  ch("inumaki", "Toge Inumaki", "black-flash", "B", 11, 8, "Toge_Portrait_Anime.webp"),
  ch("nobara", "Nobara Kugisaki", "black-flash", "B", 12, 9, "Nobara_Portrait_Anime.webp"),
  ch("toad", "Toad", "black-flash", "C", 8, 5, "Toad_EP35.webp"),
  ch("nitta", "Akari Nitta", "black-flash", "C", 6, 3),

  // ── Coéquipier ──
  ch("mahoraga", "Mahoraga", "teammate", "S", 25, 28, "Mahoraga_EP41.webp"),
  ch("rika", "Rika Orimoto", "teammate", "A", 19, 17, "Rika_Portrait_Anime.webp"),
  ch("gakuganji", "Yoshinobu Gakuganji", "teammate", "B", 12, 9, "Yoshinobu_Portrait_Anime.webp"),
  ch("larue", "Larue", "teammate", "B", 13, 10),
  ch("megumi", "Megumi Fushiguro", "teammate", "C", 9, 6, "Megumi_Portrait_Anime.webp"),
  ch("yorozu", "Yorozu", "teammate", "C", 7, 4),
];

export const DRAFT_ROSTER_BY_ID: Record<string, DraftCharacter> =
  Object.fromEntries(DRAFT_ROSTER.map((c) => [c.id, c]));
