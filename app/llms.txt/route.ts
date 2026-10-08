import { gamesForUniverse } from "@/lib/games/registry";
import { hubSeo } from "@/lib/seo/config";
import { listAvailableUniverses } from "@/lib/universes/current";
import { universePath } from "@/lib/universes/routing";

/**
 * `/llms.txt` : plan du site en Markdown pour les assistants IA (format
 * llmstxt.org). Généré depuis la même source que le sitemap — les univers en
 * base et le registre des jeux — pour ne jamais lister un jeu qui n'existe pas.
 *
 * Doit vivre à la RACINE : sans entrée dans `UNIVERSE_FREE_PREFIXES`, le
 * middleware le redirigeait vers `/jjk/llms.txt`, une 404.
 */
export async function GET() {
  const [hub, universes] = await Promise.all([
    hubSeo(),
    listAvailableUniverses(),
  ]);

  const sections = universes.map(({ slug, config }) => {
    const abs = (path: string) => `${hub.url}${universePath(path, slug)}`;
    const games = gamesForUniverse(config.gameCopy)
      .filter((g) => g.status !== "coming-soon")
      .map((g) => `- [${g.title}](${abs(g.route)}): ${g.description}`);
    return [
      `## ${config.sourceWork}`,
      "",
      `- [${config.name}](${abs("/")}): ${config.description}`,
      `- [Tous les jeux ${config.sourceWork}](${abs("/games")})`,
      ...games,
    ].join("\n");
  });

  const body = [
    `# ${hub.name}`,
    "",
    `> ${hub.description}`,
    "",
    "Fan-projet non officiel, en français. Les jeux se jouent dans le navigateur ; " +
      "le personnage du jour des jeux « dle » change chaque jour à minuit (heure de Paris).",
    "",
    ...sections.flatMap((s) => [s, ""]),
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=86400",
    },
  });
}
