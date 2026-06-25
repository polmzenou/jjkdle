import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { CursedBackground } from "@/components/CursedBackground";
import { SiteNav } from "@/components/SiteNav";
import { getCurrentUser } from "@/lib/auth/session";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "JJK Arcade — Mini-jeux Jujutsu Kaisen",
  description:
    "Plateforme de mini-jeux autour de l'univers Jujutsu Kaisen. Jeu principal : Build the Perfect Sorcerer.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  const navUser = user
    ? { username: user.username, isAdmin: user.role === "ADMIN" }
    : null;

  return (
    <html lang="fr" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="min-h-screen">
        <CursedBackground />
        <SiteNav user={navUser} />
        {children}
      </body>
    </html>
  );
}
