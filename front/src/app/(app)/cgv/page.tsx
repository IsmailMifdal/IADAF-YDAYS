import type { Metadata } from "next";
import Link from "next/link";

import LegalLayout from "../../components/legal/LegalLayout";
import { CGV_VERSION, LEGAL_INFO, orPlaceholder } from "../../lib/legalInfo";
import { formatPrice, packs } from "../packs/packsData";

export const metadata: Metadata = { title: "Conditions générales de vente" };

export default function TermsPage() {
  return (
    <LegalLayout
      title="Conditions générales de vente"
      subtitle="Les règles qui s’appliquent à l’achat et à l’utilisation des packs IA-DAF."
      updatedAt={CGV_VERSION}
    >
      <h2>1. Vendeur</h2>
      <p>
        {orPlaceholder(LEGAL_INFO.publisherName)}, {orPlaceholder(LEGAL_INFO.legalForm)},{" "}
        {orPlaceholder(LEGAL_INFO.address)}, {orPlaceholder(LEGAL_INFO.registration)}.
        Contact : {orPlaceholder(LEGAL_INFO.contactEmail)}.
      </p>

      <h2>2. Objet</h2>
      <p>
        Les présentes conditions régissent la vente des packs proposés sur
        IA-DAF à des consommateurs. Toute commande vaut acceptation des
        conditions en vigueur au jour de la commande.
      </p>

      <h2>3. Les packs</h2>
      <p>
        Chaque pack donne accès à un espace dédié à une démarche : liste des
        pièces à réunir, assistant IA contextualisé et suivi de dossier. Le
        pack complet donne accès à tous les autres.
      </p>
      <ul>
        {packs.map((pack) => (
          <li key={pack.slug}>
            {pack.title} : {formatPrice(pack.priceCents)} TTC
          </li>
        ))}
      </ul>
      <p>{orPlaceholder(LEGAL_INFO.vat)}</p>

      <h2>4. Ce que le service n’est pas</h2>
      <p>
        IA-DAF est une aide à la préparation des démarches. Les informations et
        les réponses de l’assistant, générées par intelligence artificielle,
        peuvent comporter des erreurs ou ne plus être à jour : elles ne
        remplacent ni les sites officiels de l’administration, ni le conseil
        d’un avocat. L’analyse d’un dossier est une pré-vérification
        indicative et ne garantit pas son acceptation par l’administration,
        seule compétente pour statuer. IA-DAF n’est pas un service de l’État et
        n’effectue aucune démarche à votre place.
      </p>

      <h2>5. Commande et paiement</h2>
      <p>
        La commande nécessite un compte. Le paiement s’effectue par carte
        bancaire sur la page sécurisée de notre prestataire Stripe ; vos
        coordonnées bancaires ne nous sont jamais transmises. Le pack est
        accessible dès la confirmation du paiement par Stripe.
      </p>

      <h2>6. Droit de rétractation</h2>
      <p>
        Les packs sont des contenus numériques fournis immédiatement après le
        paiement. Conformément à l’article L221-28, 13° du Code de la
        consommation, vous ne pouvez pas exercer votre droit de rétractation
        de 14 jours dès lors que, avant de payer, vous avez expressément
        demandé l’accès immédiat au pack et reconnu perdre ce droit. Cet
        accord vous est demandé par une case à cocher sur la page de paiement
        et son acceptation est conservée avec votre commande.
      </p>

      <h2>7. Accès au service</h2>
      <p>
        Nous nous efforçons de maintenir le service accessible, sans pouvoir
        garantir une disponibilité permanente (maintenance, incident
        technique). L’accès à un pack acheté est lié à votre compte : il prend
        fin si vous supprimez votre compte, sans remboursement.
      </p>

      <h2>8. Données personnelles</h2>
      <p>
        Voir la <Link href="/confidentialite">politique de confidentialité</Link>.
      </p>

      <h2>9. Réclamations et médiation</h2>
      <p>
        Pour toute réclamation, écrivez à {orPlaceholder(LEGAL_INFO.contactEmail)}.
        À défaut de solution amiable, vous pouvez recourir gratuitement au
        médiateur de la consommation : {orPlaceholder(LEGAL_INFO.mediator.name)} (
        {orPlaceholder(LEGAL_INFO.mediator.website)}).
      </p>

      <h2>10. Droit applicable</h2>
      <p>
        Les présentes conditions sont soumises au droit français. Vous
        conservez la protection des dispositions impératives du droit de votre
        pays de résidence.
      </p>
    </LegalLayout>
  );
}
