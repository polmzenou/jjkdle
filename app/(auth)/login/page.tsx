import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { Logo } from "@/components/Logo";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Connexion",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // Déjà connecté → inutile d'afficher le formulaire.
  if (await getCurrentUser()) redirect("/games");

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-6 py-16">
      <div className="mx-auto mb-6 w-fit">
        <Logo className="h-12 w-auto" />
      </div>
      <h1 className="text-center font-display text-3xl font-black uppercase tracking-wider text-white">
        Connexion
      </h1>
      <p className="mt-2 text-center text-sm text-white/45">
        Connecte-toi pour enregistrer tes scores et grimper au classement.
      </p>

      <LoginForm />
    </main>
  );
}
