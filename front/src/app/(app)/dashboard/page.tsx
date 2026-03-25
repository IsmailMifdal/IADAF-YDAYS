import Link from "next/link";
import {
  Folder,
  MessageSquare,
  Upload,
  FileText,
  ArrowRight,
} from "lucide-react";
import HeaderPage from "../../components/ui/PageHeader";

const activeFolders: Array<{ id: number; title: string }> = [];

export default function Dashboard() {
  return (
    <div>
      <HeaderPage
        title="Tableau de bord"
        subtitle="Vue d’ensemble de vos démarches, dossiers et documents."
      />
      <div className="bg-gray-50 min-h-screen px-4 md:px-8 py-10">
        <div className="max-w-6xl mx-auto w-full space-y-10">
          <section>
            <h2 className="text-xl font-semibold mb-6">Actions rapides</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <QuickActionCard
                href="/chatIa"
                title="Discuter avec l'IA"
                description="Posez vos questions administratives à l'assistant."
                icon={<MessageSquare className="w-5 h-5" />}
              />
              <QuickActionCard
                href="/documents"
                title="Uploader des documents"
                description="Ajoutez et organisez vos fichiers administratifs."
                icon={<Upload className="w-5 h-5" />}
              />
              <QuickActionCard
                href="/procedures"
                title="Explorer les démarches"
                description="Trouvez la démarche adaptée à votre situation."
                icon={<FileText className="w-5 h-5" />}
              />
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">Dossiers en cours</h2>
              <Link
                href="/myFolders"
                className="border border-gray-200 px-4 py-2 rounded-lg text-sm hover:bg-gray-100 transition"
              >
                Voir tous les dossiers →
              </Link>
            </div>

            {activeFolders.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6" />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

type QuickActionCardProps = {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
};

function QuickActionCard({
  href,
  title,
  description,
  icon,
}: QuickActionCardProps) {
  return (
    <Link
      href={href}
      className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition flex flex-col gap-3"
    >
      <div className="bg-red-500 text-white w-10 h-10 rounded-lg flex items-center justify-center">
        {icon}
      </div>
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
      <span className="text-blue-600 text-sm font-medium hover:underline inline-flex items-center gap-1">
        Accéder
        <ArrowRight className="w-4 h-4" />
      </span>
    </Link>
  );
}

function EmptyState() {
  return (
    <section className="bg-white border border-gray-200 rounded-xl p-12 flex flex-col items-center gap-4 text-center">
      <Folder className="w-10 h-10 text-gray-400" />
      <h3 className="text-xl font-semibold text-gray-900">
        Aucun dossier actif
      </h3>
      <p className="text-gray-600">Commencez par créer votre premier dossier</p>
      <Link
        href="/procedures"
        className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-lg transition"
      >
        Explorer les démarches
      </Link>
    </section>
  );
}
