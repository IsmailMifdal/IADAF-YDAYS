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
import { formatPrice, getPackBySlug, packs } from "../packs/packsData";
import PageHeader from "../../components/ui/PageHeader";
import {
  ButtonLink,
  Card,
  EmptyState,
  PageContainer,
  SectionTitle,
  StatCard,
} from "../../components/ui/primitives";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function DashboardPage() {
  const session = await auth();

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
        title={firstName ? `Bonjour ${firstName}` : "Tableau de bord"}
        subtitle="Vue d’ensemble de vos packs, démarches et documents."
      />

      <PageContainer>
        <div className="space-y-10">
          <section>
            <div className="stagger grid grid-cols-1 sm:grid-cols-3 gap-5">
              <StatCard
                label="Packs accessibles"
                value={unlocked.length}
                hint={`sur ${packs.length} disponibles`}
                icon={<Package className="w-5 h-5" />}
                tone="info"
              />
              <StatCard
                label="Achats"
                value={purchases.length}
                hint={
                  totalSpent > 0 ? `${formatPrice(totalSpent)} au total` : "Aucun achat"
                }
                icon={<Receipt className="w-5 h-5" />}
                tone="success"
              />
              <StatCard
                label="Dossiers en cours"
                value={openFolders ? openFolders.length : "—"}
                hint={
                  !openFolders
                    ? "Suivi momentanément indisponible"
                    : openFolders.length > 0
                      ? `${averageProgress} % des pièces réunies en moyenne`
                      : "Aucun dossier ouvert"
                }
                icon={<FolderOpen className="w-5 h-5" />}
                tone="neutral"
              />
            </div>
          </section>

          <section>
            <SectionTitle
              title="Actions rapides"
              description="Les points d’entrée les plus utilisés."
            />
            <div className="stagger grid grid-cols-1 md:grid-cols-3 gap-5">
              <QuickAction
                href="/chatIa"
                title="Discuter avec l’IA"
                description="Posez vos questions administratives à l’assistant."
                icon={<MessageSquare className="w-5 h-5" />}
              />
              <QuickAction
                href="/documents"
                title="Mes documents"
                description="Retrouvez les pièces déposées dans vos packs."
                icon={<Upload className="w-5 h-5" />}
              />
              <QuickAction
                href="/procedures"
                title="Explorer les démarches"
                description="Trouvez la démarche adaptée à votre situation."
                icon={<FileText className="w-5 h-5" />}
              />
            </div>
          </section>

          <section>
            <SectionTitle
              title="Mes packs"
              description="Les accompagnements auxquels vous avez accès."
              action={
                <ButtonLink href="/nosPacks" variant="secondary" size="sm">
                  Voir le catalogue
                </ButtonLink>
              }
            />

            {unlocked.length === 0 ? (
              <EmptyState
                icon={<Package className="w-6 h-6" />}
                title="Aucun pack pour le moment"
                description="Choisissez un pack pour être accompagné pas à pas dans votre démarche."
                action={
                  <ButtonLink href="/nosPacks">Découvrir les packs</ButtonLink>
                }
              />
            ) : (
              <div className="stagger grid grid-cols-1 md:grid-cols-2 gap-5">
                {unlocked.map((slug) => {
                  const pack = getPackBySlug(slug);
                  if (!pack) return null;

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
                          <ArrowRight className="w-4 h-4 shrink-0 text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
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
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
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
          Accéder
          <ArrowRight className="w-4 h-4 transition group-hover:translate-x-0.5" />
        </span>
      </Card>
    </Link>
  );
}
