import { redirect } from "next/navigation";
import { universeHref } from "@/lib/universes/current";

/**
 * Ancienne page de mise en page du profil public. Les réglages de visibilité
 * vivent désormais dans l'onglet « Visibilité » de la modale EDIT de /account :
 * on y renvoie directement (anciens liens et favoris).
 */
export default async function CustomizeProfileRedirect() {
  redirect(await universeHref("/account?edit=visibilite"));
}
