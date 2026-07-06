import { readFile } from "node:fs/promises";
import path from "node:path";
import { getAdminUser } from "@/lib/auth/session";

// Lecture du fichier généré par graphify à la demande : jamais mis en cache.
export const dynamic = "force-dynamic";

/**
 * Sert le graphe de dépendances généré par graphify (graphify-out/graph.html).
 * Ce fichier n'est pas dans /public : on le lit à la volée et on le renvoie en
 * HTML, uniquement pour les administrateurs.
 */
export async function GET() {
  if (!(await getAdminUser())) {
    return new Response("Accès réservé aux administrateurs.", { status: 403 });
  }

  const file = path.join(process.cwd(), "graphify-out", "graph.html");
  try {
    const html = await readFile(file, "utf8");
    return new Response(html, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  } catch {
    return new Response(
      "Graphe introuvable. Génère-le avec graphify (graphify-out/graph.html).",
      { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }
}
