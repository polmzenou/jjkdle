import type { Metadata } from "next";
import { ErrorScreen } from "@/components/errors/ErrorScreen";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Méthode non autorisée",
  robots: { index: false, follow: false },
};

/**
 * 405 : Next n'a pas de convention de fichier pour ce code. Le middleware
 * réécrit ici (avec le statut 405) toute requête vers une PAGE dont la méthode
 * n'est ni GET, ni HEAD, ni POST (POST = Server Actions). Les Route Handlers
 * (`/api/*`) gèrent leurs méthodes eux-mêmes et ne passent jamais par là.
 */
export default function MethodNotAllowed() {
  return (
    <>
      <div className="flex min-h-screen flex-col">
        <div className="flex-1">
          <ErrorScreen
            code={405}
            title="Méthode non autorisée"
            message="Cette page ne peut pas être appelée de cette façon. Reviens en arrière ou repars de l'accueil."
            homeHref="/"
            homeLabel="Tous les univers"
          />
        </div>
        <SiteFooter variant="neutral" />
      </div>
    </>
  );
}
