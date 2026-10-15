import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileText, FolderOpen } from "lucide-react";

import { auth } from "../../../auth";
import PageHeader from "../../components/ui/PageHeader";
import {
  Alert,
  ButtonLink,
  Card,
  EmptyState,
  PageContainer,
} from "../../components/ui/primitives";
import { listDocuments, type StoredDocument } from "../../lib/documents";
import { DOCUMENT_RETENTION_DAYS } from "../../lib/documentTypes";
import { listUnlockedPacks } from "../../lib/entitlements";
import { getRequiredDocuments } from "../packs/packContent";
import { getPackBySlug } from "../packs/packsData";

export const metadata: Metadata = { title: "Mes documents" };

type PackDocuments = {
  slug: string;
  title: string;
  required: number;
  filed: StoredDocument[] | null;
};

function formatSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} Ko`
    : `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

/**
 * Every piece filed across the user's packs. Filing and removing happen in
 * each pack's workspace, next to the list of pieces that pack requires.
 */
export default async function DocumentsPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const packs: PackDocuments[] = [];
  if (userId) {
    for (const slug of await listUnlockedPacks(userId)) {
      const pack = getPackBySlug(slug);
      if (!pack) continue;
      const filed = await listDocuments(userId, slug).catch((error) => {
        console.error(`[documents] could not list documents of ${slug}`, error);
        return null;
      });
      packs.push({ slug, title: pack.title, required: getRequiredDocuments(slug).length, filed });
    }
  }

  return (
    <div>
      <PageHeader
        title="Mes documents"
        subtitle="Les pièces que vous avez déposées, pack par pack."
      />
      <PageContainer>
        {packs.length === 0 ? (
          <EmptyState
            icon={<FolderOpen className="h-6 w-6" />}
            title="Aucun pack pour le moment"
            description="Les pièces se déposent dans l’espace d’un pack, à côté de la liste de celles que la démarche demande."
            action={<ButtonLink href="/nosPacks">Découvrir les packs</ButtonLink>}
          />
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-gray-500">
              Vos pièces sont chiffrées et conservées {DOCUMENT_RETENTION_DAYS} jours au
              plus. Leur dépôt ne vaut pas vérification : seule l’administration
              décide de la conformité d’un dossier.
            </p>

            {packs.map((pack) => (
              <Card key={pack.slug} className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-gray-900">{pack.title}</h2>
                    {pack.filed && (
                      <p className="mt-0.5 text-sm text-gray-500">
                        {pack.filed.length} pièce(s) déposée(s)
                        {pack.required > 0 ? ` · ${pack.required} demandée(s)` : ""}
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/packs/${pack.slug}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    Gérer dans l’espace du pack
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                {pack.filed === null ? (
                  <div className="mt-4">
                    <Alert tone="warning">
                      Les pièces de ce pack n’ont pas pu être chargées. Réessayez dans un instant.
                    </Alert>
                  </div>
                ) : pack.filed.length === 0 ? (
                  <p className="mt-4 text-sm text-gray-400">Aucune pièce déposée.</p>
                ) : (
                  <ul className="mt-4 divide-y divide-gray-100">
                    {pack.filed.map((document) => (
                      <li key={document.id} className="flex items-center gap-3 py-2.5 text-sm">
                        <FileText className="h-4 w-4 shrink-0 text-blue-500" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-gray-800">
                            {document.documentType}
                          </span>
                          <span className="block truncate text-xs text-gray-400">
                            {document.originalFilename} · {formatSize(document.sizeBytes)}
                          </span>
                        </span>
                        <a
                          href={`/api/documents/${document.id}`}
                          className="shrink-0 text-xs font-medium text-blue-600 hover:text-blue-700"
                        >
                          Télécharger
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            ))}
          </div>
        )}
      </PageContainer>
    </div>
  );
}
