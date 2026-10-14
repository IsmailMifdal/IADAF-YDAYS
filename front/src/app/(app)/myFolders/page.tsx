"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FolderOpen,
  Search,
} from "lucide-react";

import PageHeader from "../../components/ui/PageHeader";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  PageContainer,
  SectionTitle,
  StatCard,
} from "../../components/ui/primitives";
import type { Tone } from "../../components/ui/tokens";

type FolderStatus = "En préparation" | "Incomplet" | "En cours" | "Terminé";

type FolderItem = {
  id: number;
  title: string;
  organisme: string;
  status: FolderStatus;
  /** Progression de constitution du dossier, en pourcentage. */
  progress: number;
};

const folders: FolderItem[] = [
  {
    id: 1,
    title: "Carte de séjour",
    organisme: "Préfecture",
    status: "En cours",
    progress: 60,
  },
  {
    id: 2,
    title: "Aide au logement",
    organisme: "CAF",
    status: "Terminé",
    progress: 100,
  },
  {
    id: 3,
    title: "Inscription sécurité sociale",
    organisme: "AMELI",
    status: "Incomplet",
    progress: 35,
  },
  {
    id: 4,
    title: "Déclaration de revenus",
    organisme: "Impôts",
    status: "En préparation",
    progress: 10,
  },
];

const filterOptions: Array<"Tous" | FolderStatus> = [
  "Tous",
  "En préparation",
  "Incomplet",
  "En cours",
  "Terminé",
];

const statusTone: Record<FolderStatus, Tone> = {
  "En préparation": "neutral",
  Incomplet: "warning",
  "En cours": "info",
  Terminé: "success",
};

const progressColor: Record<FolderStatus, string> = {
  "En préparation": "bg-gray-400",
  Incomplet: "bg-amber-500",
  "En cours": "bg-blue-600",
  Terminé: "bg-emerald-600",
};

export default function MyFoldersPage() {
  const [selectedFilter, setSelectedFilter] = useState<"Tous" | FolderStatus>(
    "Tous",
  );

  const filtered = useMemo(
    () =>
      selectedFilter === "Tous"
        ? folders
        : folders.filter((folder) => folder.status === selectedFilter),
    [selectedFilter],
  );

  const stats = useMemo(
    () => ({
      total: folders.length,
      inProgress: folders.filter((f) => f.status === "En cours").length,
      incomplete: folders.filter((f) => f.status === "Incomplet").length,
      done: folders.filter((f) => f.status === "Terminé").length,
    }),
    [],
  );

  return (
    <div>
      <PageHeader
        title="Mes Dossiers"
        subtitle="Suivez l’avancement de toutes vos démarches en cours."
        rightContent={
          <ButtonLink href="/procedures" variant="secondary">
            Démarrer une démarche
          </ButtonLink>
        }
      />

      <PageContainer>
        <div className="space-y-8">
          <div className="stagger grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Total"
              value={stats.total}
              icon={<FolderOpen className="h-5 w-5" />}
              tone="neutral"
            />
            <StatCard
              label="En cours"
              value={stats.inProgress}
              icon={<Clock3 className="h-5 w-5" />}
              tone="info"
            />
            <StatCard
              label="Incomplets"
              value={stats.incomplete}
              icon={<AlertTriangle className="h-5 w-5" />}
              tone="warning"
            />
            <StatCard
              label="Terminés"
              value={stats.done}
              icon={<CheckCircle2 className="h-5 w-5" />}
              tone="success"
            />
          </div>

          <section>
            <SectionTitle
              title="Vos dossiers"
              description="Filtrez par état d’avancement."
            />

            <div className="mb-5 flex flex-wrap gap-2">
              {filterOptions.map((filter) => {
                const isActive = selectedFilter === filter;

                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setSelectedFilter(filter)}
                    aria-pressed={isActive}
                    className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-[0.97] motion-reduce:active:scale-100 ${
                      isActive
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {filter}
                  </button>
                );
              })}
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                icon={<Search className="h-6 w-6" />}
                title="Aucun dossier dans cet état"
                description="Changez de filtre pour voir vos autres dossiers."
                action={
                  <Button
                    variant="secondary"
                    onClick={() => setSelectedFilter("Tous")}
                  >
                    Voir tous les dossiers
                  </Button>
                }
              />
            ) : (
              <div className="stagger grid grid-cols-1 gap-5 lg:grid-cols-2">
                {filtered.map((folder) => (
                  <FolderCard key={folder.id} folder={folder} />
                ))}
              </div>
            )}
          </section>
        </div>
      </PageContainer>
    </div>
  );
}

function FolderCard({ folder }: { folder: FolderItem }) {
  return (
    <Card interactive className="p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900">{folder.title}</h3>
          <p className="mt-0.5 text-sm text-gray-500">{folder.organisme}</p>
        </div>
        <Badge tone={statusTone[folder.status]}>{folder.status}</Badge>
      </div>

      <div className="mt-5">
        <div className="mb-1.5 flex items-center justify-between text-xs text-gray-500">
          <span>Progression</span>
          <span className="font-medium text-gray-700">{folder.progress}%</span>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-gray-100"
          role="progressbar"
          aria-valuenow={folder.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progression du dossier ${folder.title}`}
        >
          <div
            className={`h-full rounded-full transition-all ${progressColor[folder.status]}`}
            style={{ width: `${folder.progress}%` }}
          />
        </div>
      </div>
    </Card>
  );
}
