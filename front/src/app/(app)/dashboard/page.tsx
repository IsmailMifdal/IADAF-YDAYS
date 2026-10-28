import type { Metadata } from "next";
import {
  ArrowRight,
  FileText,
  FolderOpen,
  MessageSquare,
  Package,
  Receipt,
  Upload,
} from "lucide-react";
import Link from "next/link";

import { auth } from "../../../auth";
import { listFolders, type Folder } from "../../lib/demarches";
import { listPurchases, listUnlockedPacks } from "../../lib/entitlements";
import { formatPrice, getPackBySlug, localizedPack, packs } from "../packs/packsData";
import { fmt } from "../../i18n";
import { getLang, getMessages } from "../../i18n/server";
import PageHeader from "../../components/ui/PageHeader";
import {
  ButtonLink,
  Card,
  EmptyState,
  PageContainer,
  SectionTitle,
  StatCard,
} from "../../components/ui/primitives";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).dashboard.title };
}

export default async function DashboardPage() {
  const [session, m, lang] = await Promise.all([auth(), getMessages(), getLang()]);
  const t = m.dashboard;

  // La page est protégée par le proxy ; ce garde-fou évite juste de requêter
  // la base avec un identifiant absent.
  const [unlocked, purchases] = session?.user?.id
    ? await Promise.all([
        listUnlockedPacks(session.user.id),
        listPurchases(session.user.id),
      ])
    : [[], []];

  // Best effort: the rest of the dashboard still renders if the service is down.
  let folders: Folder[] | null = null;
  if (session?.user?.id) {
    folders = await listFolders(session.user.id).catch((error) => {
      console.error("[dashboard] could not load folders", error);
      return null;
    });
  }
  const openFolders = folders?.filter(
    (f) => f.statut !== "TERMINEE" && f.statut !== "ANNULEE",
  );
  const averageProgress = openFolders?.length
    ? Math.round(openFolders.reduce((sum, f) => sum + (f.progression ?? 0), 0) / openFolders.length)
    : 0;

  const totalSpent = purchases.reduce((sum, p) => sum + p.amount_cents, 0);
  const firstName = session?.user?.name?.split(" ")[0];

  return (
    <div>
      <PageHeader
        title={firstName ? fmt(t.hello, { name: firstName }) : t.title}
        subtitle={t.subtitle}
      />

      <PageContainer>
        <div className="space-y-10">
          <section>
            <div className="stagger grid grid-cols-1 sm:grid-cols-3 gap-5">
              <StatCard
                label={t.packsAvailable}
                value={unlocked.length}
                hint={fmt(t.packsOutOf, { count: packs.length })}
                icon={<Package className="w-5 h-5" />}
                tone="info"
              />
              <StatCard
                label={t.purchases}
                value={purchases.length}
                hint={
                  totalSpent > 0 ? fmt(t.totalSpent, { amount: formatPrice(totalSpent, lang) }) : t.noPurchase
                }
                icon={<Receipt className="w-5 h-5" />}
                tone="success"
              />
              <StatCard
                label={t.openFolders}
                value={openFolders ? openFolders.length : "—"}
                hint={
                  !openFolders
                    ? t.foldersUnavailable
                    : openFolders.length > 0
                      ? fmt(t.averageProgress, { percent: averageProgress })
                      : t.noFolder
                }
                icon={<FolderOpen className="w-5 h-5" />}
                tone="neutral"
              />
            </div>
          </section>

          <section>
            <SectionTitle
              title={t.quickActions}
              description={t.quickActionsText}
            />
            <div className="stagger grid grid-cols-1 md:grid-cols-3 gap-5">
              <QuickAction
                href="/chatIa"
                title={t.chat}
                description={t.chatText}
                cta={m.common.access}
                icon={<MessageSquare className="w-5 h-5" />}
              />
              <QuickAction
                href="/documents"
                title={t.documents}
                description={t.documentsText}
                cta={m.common.access}
                icon={<Upload className="w-5 h-5" />}
              />
              <QuickAction
                href="/procedures"
                title={t.procedures}
                description={t.proceduresText}
                cta={m.common.access}
                icon={<FileText className="w-5 h-5" />}
              />
            </div>
          </section>

          <section>
            <SectionTitle
              title={t.myPacks}
              description={t.myPacksText}
              action={
                <ButtonLink href="/nosPacks" variant="secondary" size="sm">
                  {t.catalog}
                </ButtonLink>
              }
            />

            {unlocked.length === 0 ? (
              <EmptyState
                icon={<Package className="w-6 h-6" />}
                title={t.noPackTitle}
                description={t.noPackText}
                action={
                  <ButtonLink href="/nosPacks">{t.discoverPacks}</ButtonLink>
                }
              />
            ) : (
              <div className="stagger grid grid-cols-1 md:grid-cols-2 gap-5">
                {unlocked.map((slug) => {
                  const found = getPackBySlug(slug);
                  if (!found) return null;
                  const pack = localizedPack(m, found);

                  return (
                    <Link key={slug} href={`/packs/${slug}`} className="group">
                      <Card interactive className="p-5 h-full">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate">
                              {pack.title}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              {pack.shortDescription}
                            </p>
                          </div>
                          <ArrowRight className="w-4 h-4 shrink-0 text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-brand-600 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </PageContainer>
    </div>
  );
}

function QuickAction({
  href,
  title,
  description,
  icon,
  cta,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  cta: string;
}) {
  return (
    <Link href={href} className="group">
      <Card interactive className="flex h-full flex-col gap-3 p-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          {icon}
        </span>
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <p className="flex-1 text-sm text-gray-500">{description}</p>
        <span className="inline-flex items-center gap-1 text-sm font-medium text-brand-600">
          {cta}
          <ArrowRight className="w-4 h-4 transition group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
        </span>
      </Card>
    </Link>
  );
}
