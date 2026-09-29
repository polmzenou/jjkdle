import type { Metadata } from "next";
import { ErrorScreen } from "@/components/errors/ErrorScreen";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Page introuvable",
  robots: { index: false, follow: false },
};

/**
 * 404 GLOBALE : chemins hors univers (admin, casino, auth…). Rendue par le seul
 * layout racine, donc sans chrome d'anime — l'accueil proposé est le hub.
 * Les 404 d'un univers passent par `app/[universe]/not-found.tsx`.
 */
export default function NotFound() {
  return (
    <>
      <ErrorScreen
        code={404}
        title="Page introuvable"
        message="Cette page n'existe pas, ou plus. Vérifie l'adresse, ou reviens sur tes pas."
        homeHref="/"
        homeLabel="Tous les univers"
      />
      <SiteFooter variant="neutral" />
    </>
  );
}
