import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { CursedBackground } from "@/components/CursedBackground";
import { SiteNav } from "@/components/SiteNav";
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="min-h-screen">
        <CursedBackground />
        <SiteNav />
        {children}
      </body>
    </html>
  );
}
