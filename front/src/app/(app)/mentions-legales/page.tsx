import type { Metadata } from "next";
import Link from "next/link";

import LegalLayout from "../../components/legal/LegalLayout";
import { LEGAL_INFO, orPlaceholder } from "../../lib/legalInfo";

export const metadata: Metadata = { title: "Mentions légales" };

export default function LegalNoticePage() {
  const { host } = LEGAL_INFO;

  return (
    <LegalLayout
      title="Mentions légales"
      subtitle="Informations prévues par la loi pour la confiance dans l’économie numérique (LCEN)."
      updatedAt="14 octobre 2026"
    >
      <h2>Éditeur du site</h2>
      <p>
        {orPlaceholder(LEGAL_INFO.publisherName)}
        <br />
        {orPlaceholder(LEGAL_INFO.legalForm)}
        <br />
        {orPlaceholder(LEGAL_INFO.address)}
        <br />
        {orPlaceholder(LEGAL_INFO.registration)}
        <br />
        {orPlaceholder(LEGAL_INFO.vat)}
      </p>
      <p>
        Contact : {orPlaceholder(LEGAL_INFO.contactEmail)}
        {LEGAL_INFO.phone && (
          <>
            <br />
            Téléphone : {LEGAL_INFO.phone}
          </>
        )}
      </p>

      <h2>Directeur de la publication</h2>
      <p>{orPlaceholder(LEGAL_INFO.publicationDirector)}</p>

      <h2>Hébergeur</h2>
      <p>
        {orPlaceholder(host.name)}
        <br />
        {orPlaceholder(host.address)}
        <br />
        {orPlaceholder(host.phone)}
      </p>

      <h2>Nature du service</h2>
      <p>
        IA-DAF fournit une aide à la préparation des démarches administratives
        françaises. Les informations et les réponses de l’assistant sont
        indicatives : elles ne remplacent ni les sites officiels de
        l’administration, ni le conseil d’un professionnel du droit. IA-DAF
        n’est pas un service de l’État.
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        Les contenus du site (textes, interface, logos) sont protégés. Toute
        reproduction sans autorisation préalable de l’éditeur est interdite.
      </p>

      <h2>Données personnelles</h2>
      <p>
        Le traitement de vos données est décrit dans la{" "}
        <Link href="/confidentialite">politique de confidentialité</Link>.
      </p>
    </LegalLayout>
  );
}
