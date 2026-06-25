import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { Logo } from "@/components/Logo";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = {
  title: "Créer un compte — JJK Arcade",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/games");

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-6 py-16">
      <Link href="/" className="mx-auto mb-6 block w-fit">
        <Logo className="h-12 w-auto" />
      </Link>
      <h1 className="text-center font-display text-3xl font-black uppercase tracking-wider text-white">
        Créer un compte
      </h1>
      <p className="mt-2 text-center text-sm text-white/45">
        Rejoins l&apos;arcade pour sauvegarder tes scores et défier le
        classement.
      </p>

      <RegisterForm />
    </main>
  );
}
