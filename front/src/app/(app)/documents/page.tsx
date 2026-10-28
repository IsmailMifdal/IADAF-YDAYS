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
import { getPackBySlug, localizedPack } from "../packs/packsData";
import { fmt, type Messages } from "../../i18n";
import { documentLabel } from "../../i18n/documents";
import { getLang, getMessages } from "../../i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).documents.title };
}

type PackDocuments = {
  slug: string;
  title: string;
  required: number;
  filed: StoredDocument[] | null;
};

function formatSize(bytes: number, t: Messages["documents"]): string {
  return bytes < 1024 * 1024
    ? fmt(t.sizeKb, { size: Math.max(1, Math.round(bytes / 1024)) })
    : fmt(t.sizeMb, { size: (bytes / (1024 * 1024)).toFixed(1) });
}

/**
 * Every piece filed across the user's packs. Filing and removing happen in
 * each pack's workspace, next to the list of pieces that pack requires.
 */
export default async function DocumentsPage() {
  const [session, m, lang] = await Promise.all([auth(), getMessages(), getLang()]);
  const t = m.documents;
  const userId = session?.user?.id;

  const packs: PackDocuments[] = [];
  if (userId) {
    for (const slug of await listUnlockedPacks(userId)) {
      const found = getPackBySlug(slug);
      if (!found) continue;
      const pack = localizedPack(m, found);
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
        title={t.title}
        subtitle={t.subtitle}
      />
      <PageContainer>
        {packs.length === 0 ? (
          <EmptyState
            icon={<FolderOpen className="h-6 w-6" />}
            title={m.dashboard.noPackTitle}
            description={t.emptyText}
            action={<ButtonLink href="/nosPacks">{m.dashboard.discoverPacks}</ButtonLink>}
          />
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-gray-500">
              {fmt(t.retention, { days: DOCUMENT_RETENTION_DAYS })}
            </p>

            {packs.map((pack) => (
              <Card key={pack.slug} className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-gray-900">{pack.title}</h2>
                    {pack.filed && (
                      <p className="mt-0.5 text-sm text-gray-500">
                        {fmt(t.filed, { count: pack.filed.length })}
                        {pack.required > 0 ? ` · ${fmt(t.required, { count: pack.required })}` : ""}
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/packs/${pack.slug}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
                  >
                    {t.manage}
                    <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
                  </Link>
                </div>

                {pack.filed === null ? (
                  <div className="mt-4">
                    <Alert tone="warning">
                      {t.loadError}
                    </Alert>
                  </div>
                ) : pack.filed.length === 0 ? (
                  <p className="mt-4 text-sm text-gray-400">{t.none}</p>
                ) : (
                  <ul className="mt-4 divide-y divide-gray-100">
                    {pack.filed.map((document) => (
                      <li key={document.id} className="flex items-center gap-3 py-2.5 text-sm">
                        <FileText className="h-4 w-4 shrink-0 text-brand-500" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-gray-800">
                            {documentLabel(lang, document.documentType)}
                          </span>
                          <span className="block truncate text-xs text-gray-400">
                            {document.originalFilename} · {formatSize(document.sizeBytes, t)}
                          </span>
                        </span>
                        <a
                          href={`/api/documents/${document.id}`}
                          className="shrink-0 text-xs font-medium text-brand-600 hover:text-brand-700"
                        >
                          {m.workspace.download}
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
