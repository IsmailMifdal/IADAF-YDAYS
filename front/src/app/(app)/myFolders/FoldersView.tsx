"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FolderOpen,
  Search,
} from "lucide-react";

import {
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  SectionTitle,
  StatCard,
} from "../../components/ui/primitives";
import type { Tone } from "../../components/ui/tokens";
import type { Folder, FolderStatus } from "../../lib/demarches";

const STATUS: Record<FolderStatus, { label: string; tone: Tone; bar: string }> = {
  EN_ATTENTE: { label: "En préparation", tone: "neutral", bar: "bg-gray-400" },
  EN_COURS: { label: "En cours", tone: "info", bar: "bg-brand-600" },
  TERMINEE: { label: "Terminé", tone: "success", bar: "bg-emerald-600" },
  ANNULEE: { label: "Annulé", tone: "neutral", bar: "bg-gray-300" },
};

type Filter = "ALL" | FolderStatus;

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "ALL", label: "Tous" },
  { value: "EN_ATTENTE", label: STATUS.EN_ATTENTE.label },
  { value: "EN_COURS", label: STATUS.EN_COURS.label },
  { value: "TERMINEE", label: STATUS.TERMINEE.label },
];

function isOverdue(folder: Folder, today: string): boolean {
  return (
    folder.dateEcheance !== null &&
    folder.dateEcheance < today &&
    folder.statut !== "TERMINEE" &&
    folder.statut !== "ANNULEE"
  );
}

export default function FoldersView({ folders }: { folders: Folder[] }) {
  const [filter, setFilter] = useState<Filter>("ALL");

  const filtered = useMemo(
    () => (filter === "ALL" ? folders : folders.filter((f) => f.statut === filter)),
    [filter, folders],
  );

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      total: folders.length,
      inProgress: folders.filter((f) => f.statut === "EN_COURS").length,
      overdue: folders.filter((f) => isOverdue(f, today)).length,
      done: folders.filter((f) => f.statut === "TERMINEE").length,
    };
  }, [folders]);

  if (folders.length === 0) {
    return (
      <EmptyState
        icon={<FolderOpen className="h-6 w-6" />}
        title="Vous n’avez pas encore de dossier"
        description="Un dossier est créé pour chaque pack que vous achetez : il réunit la liste des pièces et le suivi de votre démarche."
        action={<ButtonLink href="/nosPacks">Découvrir les packs</ButtonLink>}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="stagger grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total" value={stats.total} icon={<FolderOpen className="h-5 w-5" />} tone="neutral" />
        <StatCard label="En cours" value={stats.inProgress} icon={<Clock3 className="h-5 w-5" />} tone="info" />
        <StatCard label="En retard" value={stats.overdue} icon={<AlertTriangle className="h-5 w-5" />} tone="warning" />
        <StatCard label="Terminés" value={stats.done} icon={<CheckCircle2 className="h-5 w-5" />} tone="success" />
      </div>

      <section>
        <SectionTitle title="Vos dossiers" description="Filtrez par état d’avancement." />

        <div className="mb-5 flex flex-wrap gap-2">
          {FILTERS.map(({ value, label }) => {
            const isActive = filter === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                aria-pressed={isActive}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 active:scale-[0.97] motion-reduce:active:scale-100 ${
                  isActive
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                {label}
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
              <Button variant="secondary" onClick={() => setFilter("ALL")}>
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
  );
}

function FolderCard({ folder }: { folder: Folder }) {
  const status = STATUS[folder.statut];
  const progress = Math.round(folder.progression ?? 0);
  const total = folder.etapes?.length ?? 0;
  const done = folder.etapes?.filter((e) => e.completee).length ?? 0;

  return (
    <Card interactive className="p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900">{folder.titre}</h3>
          {folder.organismeConcerne && (
            <p className="mt-0.5 text-sm text-gray-500">{folder.organismeConcerne}</p>
          )}
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      <div className="mt-5">
        <div className="mb-1.5 flex items-center justify-between text-xs text-gray-500">
          <span>{total > 0 ? `${done}/${total} pièces réunies` : "Progression"}</span>
          <span className="font-medium text-gray-700">{progress}%</span>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-gray-100"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progression du dossier ${folder.titre}`}
        >
          <div className={`h-full rounded-full transition-all ${status.bar}`} style={{ width: `${progress}%` }} />
        </div>
      </div>

      {folder.packSlug && (
        <Link
          href={`/packs/${folder.packSlug}`}
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          Ouvrir l’espace du pack
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </Card>
  );
}
