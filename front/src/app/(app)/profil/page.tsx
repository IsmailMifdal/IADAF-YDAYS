import { redirect } from "next/navigation";

/**
 * `/profil` était une maquette morte : e-mail codé en dur, déconnexion en
 * `console.log`, et seule page à utiliser la palette `zinc` et des classes
 * `dark:`. Son contenu réel vit désormais dans l'onglet Profil des paramètres.
 *
 * On redirige plutôt que de supprimer la route : les liens et signets
 * existants continuent de fonctionner.
 */
export default function ProfilPage() {
  redirect("/settings?section=profil");
}
