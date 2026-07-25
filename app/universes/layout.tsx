import { hubThemeCss } from "@/lib/universes/theme";

/**
 * Layout du HUB (choix d'univers). Ne monte NI nav NI branding : tant qu'aucun
 * anime n'est choisi, la page ne doit porter la marque d'aucun.
 *
 * La palette neutre est re-posée ici — et pas seulement dans le `<head>` du
 * layout racine — pour qu'elle suive la navigation client : en revenant d'un
 * univers vers le hub, ce `<style>` est monté (et le `<style>` de l'univers
 * démonté), là où le `<head>` racine, lui, ne serait jamais re-rendu.
 */
export default function HubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style>{hubThemeCss()}</style>
      {children}
    </>
  );
}
