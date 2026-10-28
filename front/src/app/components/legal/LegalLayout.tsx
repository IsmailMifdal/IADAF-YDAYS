import type { ReactNode } from "react";

import PageHeader from "../ui/PageHeader";
import { Alert, Card, PageContainer } from "../ui/primitives";
import { missingLegalFields } from "../../lib/legalInfo";
import { getLang, getMessages } from "../../i18n/server";

/**
 * Shared frame of the legal pages: header, draft warning, readable prose.
 *
 * The legal text itself stays in French whatever the interface language: it
 * is the version that binds, and a translation not reviewed by a lawyer could
 * say something else. Other languages get a notice saying so.
 */
export default async function LegalLayout({
  title,
  subtitle,
  updatedAt,
  children,
}: {
  title: string;
  subtitle: string;
  updatedAt: string;
  children: ReactNode;
}) {
  const missing = missingLegalFields();
  const [lang, m] = await Promise.all([getLang(), getMessages()]);

  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <PageContainer width="narrow">
        <div className="space-y-6">
          {missing.length > 0 && (
            <Alert tone="warning">
              Brouillon : {missing.length} information(s) légale(s) restent à
              compléter dans <code>front/src/app/lib/legalInfo.ts</code> avant
              la mise en ligne. Les champs manquants apparaissent comme
              « [à compléter] ».
            </Alert>
          )}
          {lang !== "fr" && <Alert tone="info">{m.legal.frenchOnly}</Alert>}
          <Card className="p-6 md:p-8">
            <div lang="fr" dir="ltr" className="prose prose-gray max-w-none prose-headings:font-semibold prose-h2:text-lg prose-h2:mt-8 prose-h2:mb-3 prose-p:text-sm prose-li:text-sm prose-td:text-sm prose-th:text-sm">
              {children}
              <p className="text-xs text-gray-500 mt-8">
                Dernière mise à jour : {updatedAt}
              </p>
            </div>
          </Card>
        </div>
      </PageContainer>
    </div>
  );
}
