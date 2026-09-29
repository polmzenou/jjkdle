import type { Metadata } from "next";
import { ErrorScreen } from "@/components/errors/ErrorScreen";
import { universeHref } from "@/lib/universes/current";

export const metadata: Metadata = {
  title: "Page introuvable",
  robots: { index: false, follow: false },
};

/**
 * 404 d'un UNIVERS (`/jjk/nimportequoi`, ou un `notFound()` levé par une page
 * de l'anime). Rendue sous `app/[universe]/layout.tsx` : palette, nav et footer
 * sont ceux de l'anime, et « Accueil » ramène à sa landing.
 */
export default async function UniverseNotFound() {
  return (
    <ErrorScreen
      code={404}
      title="Page introuvable"
      message="Cette page n'existe pas dans cet univers. Vérifie l'adresse, ou reviens sur tes pas."
      homeHref={await universeHref("/")}
    />
  );
}
