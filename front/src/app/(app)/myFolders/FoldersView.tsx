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
import { localizedPack, getPackBySlug } from "../packs/packsData";
import { useLanguage } from "../../context/LanguageContext";
import { fmt, type Messages } from "../../i18n";

const STATUS: Record<FolderStatus, { tone: Tone; bar: string }> = {
  EN_ATTENTE: { tone: "neutral", bar: "bg-gray-400" },
  EN_COURS: { tone: "info", bar: "bg-brand-600" },
  TERMINEE: { tone: "success", bar: "bg-emerald-600" },
  ANNULEE: { tone: "neutral", bar: "bg-gray-300" },
};

type Filter = "ALL" | FolderStatus;

const FILTERS: Filter[] = ["ALL", "EN_ATTENTE", "EN_COURS", "TERMINEE"];

function isOverdue(folder: Folder, today: string): boolean {
  return (
    folder.dateEcheance !== null &&
    folder.dateEcheance < today &&
    folder.statut !== "TERMINEE" &&
    folder.statut !== "ANNULEE"
  );
}

export default function FoldersView({ folders }: { folders: Folder[] }) {
  const { m } = useLanguage();
  const t = m.folders;
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
        title={t.emptyTitle}
        description={t.emptyText}
        action={<ButtonLink href="/nosPacks">{m.dashboard.discoverPacks}</ButtonLink>}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="stagger grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t.total} value={stats.total} icon={<FolderOpen className="h-5 w-5" />} tone="neutral" />
        <StatCard label={t.status.EN_COURS} value={stats.inProgress} icon={<Clock3 className="h-5 w-5" />} tone="info" />
        <StatCard label={t.overdue} value={stats.overdue} icon={<AlertTriangle className="h-5 w-5" />} tone="warning" />
        <StatCard label={t.done} value={stats.done} icon={<CheckCircle2 className="h-5 w-5" />} tone="success" />
      </div>

      <section>
        <SectionTitle title={t.yours} description={t.filterText} />

        <div className="mb-5 flex flex-wrap gap-2">
          {FILTERS.map((value) => {
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
                {value === "ALL" ? t.all : t.status[value]}
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Search className="h-6 w-6" />}
            title={t.noneTitle}
            description={t.noneText}
            action={
              <Button variant="secondary" onClick={() => setFilter("ALL")}>
                {t.seeAll}
              </Button>
            }
          />
        ) : (
          <div className="stagger grid grid-cols-1 gap-5 lg:grid-cols-2">
            {filtered.map((folder) => (
              <FolderCard key={folder.id} folder={folder} m={m} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function FolderCard({ folder, m }: { folder: Folder; m: Messages }) {
  const t = m.folders;
  const status = STATUS[folder.statut];
  // Titre enregistré en français par le service : celui du pack, traduit,
  // quand le dossier en vient.
  const pack = folder.packSlug ? getPackBySlug(folder.packSlug) : undefined;
  const title = pack ? localizedPack(m, pack).title : folder.titre;
  const progress = Math.round(folder.progression ?? 0);
  const total = folder.etapes?.length ?? 0;
  const done = folder.etapes?.filter((e) => e.completee).length ?? 0;

  return (
    <Card interactive className="p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          {folder.organismeConcerne && (
            <p className="mt-0.5 text-sm text-gray-500" lang="fr">{folder.organismeConcerne}</p>
          )}
        </div>
        <Badge tone={status.tone}>{t.status[folder.statut]}</Badge>
      </div>

      <div className="mt-5">
        <div className="mb-1.5 flex items-center justify-between text-xs text-gray-500">
          <span>{total > 0 ? fmt(t.gathered, { done, total }) : t.progress}</span>
          <span className="font-medium text-gray-700">{progress}%</span>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-gray-100"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={fmt(t.progressOf, { title })}
        >
          <div className={`h-full rounded-full transition-all ${status.bar}`} style={{ width: `${progress}%` }} />
        </div>
      </div>

      {folder.packSlug && (
        <Link
          href={`/packs/${folder.packSlug}`}
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          {t.openPack}
          <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
        </Link>
      )}
    </Card>
  );
}
