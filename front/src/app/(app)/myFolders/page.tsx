"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Folder,
  FolderOpen,
  Plus,
  type LucideIcon,
} from "lucide-react";
import HeaderPage from "../../components/ui/PageHeader";

type FolderStatus = "En préparation" | "Incomplet" | "En cours" | "Terminé";

type FolderItem = {
  id: number;
  title: string;
  status: FolderStatus;
};

const folders: FolderItem[] = [
  {
    id: 1,
    title: "Carte de séjour",
    status: "En cours",
  },
  {
    id: 2,
    title: "Aide au logement",
    status: "Terminé",
  },
  {
    id: 3,
    title: "Inscription sécurité sociale",
    status: "Incomplet",
  },
  {
    id: 4,
    title: "Déclaration de revenus",
    status: "En préparation",
  },
];

const filterOptions: Array<"Tous" | FolderStatus> = [
  "Tous",
  "En préparation",
  "Incomplet",
  "En cours",
  "Terminé",
];

export default function MyFolders() {
  const [selectedFilter, setSelectedFilter] = useState<"Tous" | FolderStatus>(
    "Tous",
  );

  const filteredFolders = useMemo(() => {
    if (selectedFilter === "Tous") {
      return folders;
    }

    return folders.filter((folder) => folder.status === selectedFilter);
  }, [selectedFilter]);

  const stats = useMemo(() => {
    return {
      total: folders.length,
      inProgress: folders.filter((folder) => folder.status === "En cours")
        .length,
      incomplete: folders.filter((folder) => folder.status === "Incomplet")
        .length,
      done: folders.filter((folder) => folder.status === "Terminé").length,
    };
  }, []);

  return (
    <div>
      <HeaderPage
        title="Mes Dossiers"
        subtitle="Suivez l’avancement de toutes vos démarches"
      />
      <div className="bg-gray-50 min-h-screen px-4 md:px-8 py-10">
        <div className="max-w-6xl mx-auto w-full space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <p className="text-sm text-gray-600 font-medium">Filtrer :</p>
            <div className="flex flex-wrap gap-3">
              {filterOptions.map((filter) => {
                const isActive = selectedFilter === filter;

                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setSelectedFilter(filter)}
                    className={`px-4 py-2 rounded-lg text-sm border transition ${
                      isActive
                        ? "bg-blue-600 text-white font-semibold  border-blue-600"
                        : "border-gray-200 text-black font-semibold bg-gray-100 hover:bg-gray-100"
                    }`}
                  >
                    {filter}
                  </button>
                );
              })}
            </div>
          </div>

          <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatsCard
              label="Total"
              value={stats.total}
              icon={FolderOpen}
              variant="neutral"
            />
            <StatsCard
              label="En cours"
              value={stats.inProgress}
              icon={Clock3}
              variant="blue"
            />
            <StatsCard
              label="Incomplets"
              value={stats.incomplete}
              icon={AlertTriangle}
              variant="orange"
            />
            <StatsCard
              label="Terminés"
              value={stats.done}
              icon={CheckCircle2}
              variant="green"
            />
          </section>
          <button
            type="button"
            className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Nouveau dossier
          </button>

          {filteredFolders.length === 0 ? (
            <section className="bg-white border border-gray-200 rounded-xl p-10 flex flex-col items-center justify-center gap-4 text-center">
              <Folder className="w-10 h-10 text-gray-400" />
              <h2 className="text-xl font-semibold text-gray-900">
                Aucun dossier trouvé
              </h2>
              <p className="text-gray-600">
                Commencez par créer votre premier dossier
              </p>
              <button
                type="button"
                className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-lg"
              >
                Créer un dossier
              </button>
            </section>
          ) : (
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredFolders.map((folder) => (
                <FolderCard
                  key={folder.id}
                  title={folder.title}
                  status={folder.status}
                />
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

type FolderCardProps = {
  title: string;
  status: FolderStatus;
};

function FolderCard({ title, status }: FolderCardProps) {
  const statusStyle: Record<FolderStatus, string> = {
    "En préparation": "bg-gray-100 text-gray-700",
    Incomplet: "bg-orange-100 text-orange-700",
    "En cours": "bg-blue-100 text-blue-700",
    Terminé: "bg-green-100 text-green-700",
  };

  return (
    <article className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <span
          className={`px-3 py-1 text-xs rounded-full font-medium ${statusStyle[status]}`}
        >
          {status}
        </span>
      </div>
    </article>
  );
}

type StatsCardProps = {
  label: string;
  value: number;
  icon: LucideIcon;
  variant: "neutral" | "blue" | "orange" | "green";
};

function StatsCard({ label, value, icon: Icon, variant }: StatsCardProps) {
  const variantStyles = {
    neutral: {
      card: "bg-white border-gray-200",
      label: "text-gray-500",
      value: "text-gray-900",
      icon: "text-gray-400",
    },
    blue: {
      card: "bg-blue-50 border-blue-200",
      label: "text-blue-700",
      value: "text-blue-700",
      icon: "text-blue-500",
    },
    orange: {
      card: "bg-orange-50 border-orange-200",
      label: "text-orange-700",
      value: "text-orange-700",
      icon: "text-orange-500",
    },
    green: {
      card: "bg-green-50 border-green-200",
      label: "text-green-700",
      value: "text-green-700",
      icon: "text-green-500",
    },
  };

  const styles = variantStyles[variant];

  return (
    <article
      className={`border rounded-xl p-5 flex flex-col gap-1 ${styles.card}`}
    >
      <div className="flex items-center justify-between">
        <p className={`text-sm ${styles.label}`}>{label}</p>
        <Icon className={`w-4 h-4 ${styles.icon}`} />
      </div>
      <p className={`text-2xl font-semibold ${styles.value}`}>{value}</p>
    </article>
  );
}
