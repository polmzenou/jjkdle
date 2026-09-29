import type { Metadata } from "next";
import { ErrorScreen } from "@/components/errors/ErrorScreen";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Accès refusé",
  robots: { index: false, follow: false },
};

/**
 * 403 : rendue quand une page appelle `forbidden()` (next/navigation, activé par
 * `experimental.authInterrupts`). Aujourd'hui : l'admin ouverte par un compte
 * connecté qui n'a pas le rôle ADMIN.
 */
export default function Forbidden() {
  return (
    <>
      <ErrorScreen
        code={403}
        title="Accès refusé"
        message="Ton compte n'a pas les droits nécessaires pour ouvrir cette page."
        homeHref="/"
        homeLabel="Tous les univers"
      />
      <SiteFooter variant="neutral" />
    </>
  );
}
