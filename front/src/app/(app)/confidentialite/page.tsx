import type { Metadata } from "next";
import Link from "next/link";

import LegalLayout from "../../components/legal/LegalLayout";
import { DOCUMENT_RETENTION_DAYS } from "../../lib/documentTypes";
import { LEGAL_INFO, orPlaceholder } from "../../lib/legalInfo";

export const metadata: Metadata = { title: "Politique de confidentialité" };

/**
 * Keep this page in step with the code: each row describes a processing that
 * actually exists, with the retention actually enforced. A policy that drifts
 * from what the application does is itself a breach of the RGPD (art. 13).
 */
const PROCESSINGS = [
  {
    purpose: "Créer et gérer votre compte",
    data: "Nom, adresse e-mail, mot de passe (haché, jamais lisible), photo de profil Google si vous utilisez ce mode de connexion",
    basis: "Exécution du contrat",
    retention: "Tant que le compte existe ; effacées à sa suppression",
  },
  {
    purpose: "Vendre les packs et vous en ouvrir l’accès",
    data: "Pack acheté, montant, identifiant de paiement Stripe. Vos coordonnées bancaires sont saisies chez Stripe et ne nous parviennent jamais",
    basis: "Exécution du contrat ; obligation légale pour la comptabilité",
    retention: "Accès aux packs : jusqu’à la suppression du compte. Registre des ventes, sans votre identité : 10 ans (art. L123-22 du Code de commerce)",
  },
  {
    purpose: "Répondre à vos questions avec l’assistant IA",
    data: "Messages échangés avec l’assistant, langue choisie",
    basis: "Exécution du contrat (utilisateurs connectés) ; intérêt légitime à renseigner les visiteurs (chat d’accueil)",
    retention: "30 jours après le dernier message, puis effacement automatique ; immédiatement à la suppression du compte",
  },
  {
    purpose: "Conserver les pièces de vos dossiers",
    data: "Pièces que vous déposez (identité, titre de séjour, justificatifs), chiffrées",
    basis: "Exécution du contrat",
    retention: "180 jours au plus après le dépôt ; effacées dès leur retrait ou la suppression du compte",
  },
  {
    purpose: "Suivre vos dossiers",
    data: "Démarches liées à vos packs : statut, échéances, pièces réunies, commentaires",
    basis: "Exécution du contrat",
    retention: "Tant que le compte existe ; effacés à sa suppression",
  },
  {
    purpose: "Vous envoyer nos conseils et offres par e-mail",
    data: "Adresse e-mail, date et texte du consentement",
    basis: "Votre consentement, facultatif et retirable à tout moment",
    retention: "3 ans après votre dernier consentement",
  },
  {
    purpose: "Protéger le service contre les abus (limitation de débit)",
    data: "Adresse IP et e-mail de connexion, stockés uniquement sous forme d’empreinte chiffrée (HMAC)",
    basis: "Intérêt légitime à sécuriser le service",
    retention: "48 heures",
  },
];

export default function PrivacyPage() {
  const { llmProvider } = LEGAL_INFO;

  return (
    <LegalLayout
      title="Politique de confidentialité"
      subtitle="Quelles données nous traitons, pourquoi, combien de temps, et comment exercer vos droits."
      updatedAt="14 octobre 2026"
    >
      <h2>Responsable du traitement</h2>
      <p>
        {orPlaceholder(LEGAL_INFO.publisherName)},{" "}
        {orPlaceholder(LEGAL_INFO.address)}.
        <br />
        Contact pour vos données : {orPlaceholder(LEGAL_INFO.privacyEmail)}
      </p>

      <h2>Données traitées</h2>
      <div className="not-prose overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-200 text-gray-900">
              <th className="py-2 pr-4 font-semibold">Finalité</th>
              <th className="py-2 pr-4 font-semibold">Données</th>
              <th className="py-2 pr-4 font-semibold">Base légale</th>
              <th className="py-2 font-semibold">Durée</th>
            </tr>
          </thead>
          <tbody className="text-gray-700 align-top">
            {PROCESSINGS.map((row) => (
              <tr key={row.purpose} className="border-b border-gray-100">
                <td className="py-3 pr-4 font-medium text-gray-900">{row.purpose}</td>
                <td className="py-3 pr-4">{row.data}</td>
                <td className="py-3 pr-4">{row.basis}</td>
                <td className="py-3">{row.retention}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Pièces déposées dans vos dossiers</h2>
      <p>
        Les pièces que vous déposez dans l’espace d’un pack (pièce d’identité,
        titre de séjour, justificatifs…) sont chiffrées (AES-256) avant d’être
        enregistrées : ni notre hébergeur ni nos sauvegardes ne peuvent les
        lire. Vous seul y accédez. Elles sont effacées au plus tard{" "}
        {DOCUMENT_RETENTION_DAYS} jours après leur dépôt, dès que vous les retirez, et
        avec votre compte s’il est supprimé.
      </p>
      <p>
        Quand vous demandez la vérification de votre dossier, chaque pièce fait
        l’objet d’une <strong>pré-vérification automatique</strong> sur nos
        serveurs : qualité de l’image, date de validité, ancienneté d’un
        justificatif, clé de contrôle d’un IBAN. Elle est indicative : elle ne
        décide de rien et ne garantit pas l’acceptation de votre dossier, seule
        l’administration est compétente. Seuls des comptes anonymes de ses
        résultats sont conservés, sans lien avec vous ni avec vos pièces.
      </p>
      <p>
        Le contenu de vos pièces n’est pas transmis à l’assistant IA : il reçoit
        la liste des pièces fournies ou manquantes, et les points relevés, sans
        aucune date, nom ni numéro lus dans vos documents.
      </p>

      <h2>Destinataires et sous-traitants</h2>
      <ul>
        <li>
          <strong>Stripe</strong> — paiement des packs.
        </li>
        <li>
          <strong>{llmProvider.name}</strong> — génération des réponses de
          l’assistant. Vos messages lui sont transmis
          {llmProvider.transferSafeguard
            ? `. Ce transfert hors de l’Union européenne est encadré par : ${llmProvider.transferSafeguard}.`
            : " [garantie de transfert hors UE à compléter]."}
        </li>
        <li>
          <strong>Google</strong> — uniquement si vous choisissez « Continuer
          avec Google » pour vous connecter.
        </li>
        <li>
          <strong>{orPlaceholder(LEGAL_INFO.host.name)}</strong> — hébergement
          du service.
        </li>
      </ul>
      <p>Vos données ne sont jamais vendues ni utilisées à des fins publicitaires.</p>

      <h2>Cookies</h2>
      <p>
        Nous n’utilisons ni cookie publicitaire ni outil de mesure d’audience.
        Les seuls cookies déposés sont nécessaires au fonctionnement du site et
        ne requièrent donc pas votre consentement : la session de connexion
        (7 jours), la langue choisie et l’état replié ou déplié du menu.
      </p>

      <h2>Vos droits</h2>
      <p>
        Vous disposez des droits d’accès, de rectification, d’effacement, de
        limitation, d’opposition et de portabilité de vos données, ainsi que du
        droit de retirer votre consentement à tout moment.
      </p>
      <ul>
        <li>
          <strong>Supprimer votre compte et toutes ses données</strong> :
          directement depuis <Link href="/settings">Paramètres</Link>, sans
          avoir à nous écrire.
        </li>
        <li>
          <strong>Ne plus recevoir nos e-mails</strong> : lien de
          désinscription présent dans chaque e-mail.
        </li>
        <li>
          <strong>Toute autre demande</strong> : écrivez à{" "}
          {orPlaceholder(LEGAL_INFO.privacyEmail)}. Nous répondons sous un mois.
        </li>
      </ul>
      <p>
        Si vous estimez que vos droits ne sont pas respectés, vous pouvez
        saisir la CNIL (www.cnil.fr).
      </p>

      <h2>Sécurité</h2>
      <p>
        Les échanges sont chiffrés (HTTPS) et les mots de passe sont hachés
        (bcrypt) : personne, y compris nous, ne peut les lire.
      </p>
    </LegalLayout>
  );
}
