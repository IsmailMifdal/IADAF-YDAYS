"use client";

import { useMemo, useState } from "react";
import {
  Briefcase,
  Building2,
  Clock,
  FileText,
  HeartPulse,
  Landmark,
  Layers,
  Receipt,
  Search,
  SearchX,
  Shield,
  type LucideIcon,
} from "lucide-react";

import PageHeader from "../../components/ui/PageHeader";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  PageContainer,
} from "../../components/ui/primitives";
import { inputClass } from "../../components/ui/primitives";
import type { Tone } from "../../components/ui/tokens";
import { useLanguage } from "../../context/LanguageContext";
import { fmt, type Messages } from "../../i18n";

type Difficulty = "easy" | "medium" | "hard";

type Procedure = {
  key: keyof Messages["procedures"]["items"];
  /** Nom de l'organisme, en français : c'est celui de ses courriers. */
  administration: string;
  /** Délai indicatif, en semaines. */
  weeks: [number, number];
  difficulty: Difficulty;
  documents: number;
  /** Pack correspondant, vers lequel la démarche renvoie. */
  href: string;
};

const procedures: Procedure[] = [
  { key: "familyAllowance", administration: "CAF", weeks: [2, 4], difficulty: "medium", documents: 5, href: "/payment/aide-logement" },
  { key: "businessStart", administration: "URSSAF", weeks: [1, 2], difficulty: "medium", documents: 4, href: "/payment/impots" },
  { key: "healthInsurance", administration: "AMELI", weeks: [2, 3], difficulty: "easy", documents: 3, href: "/payment/assurance-maladie" },
  { key: "jobseeker", administration: "France Travail", weeks: [1, 2], difficulty: "easy", documents: 4, href: "/nosPacks" },
  { key: "residencePermit", administration: "Préfecture", weeks: [4, 8], difficulty: "hard", documents: 7, href: "/payment/titre-sejour" },
  { key: "incomeTax", administration: "Impôts", weeks: [1, 1], difficulty: "medium", documents: 4, href: "/payment/impots" },
];

type FilterOption = { value: string; icon: LucideIcon };

const ALL = "all";

// Les valeurs doivent correspondre exactement au champ `administration` :
// un filtre « Pôle Emploi » face à une démarche « France Travail » ne
// renvoyait plus aucun résultat.
const filters: FilterOption[] = [
  { value: ALL, icon: Layers },
  { value: "CAF", icon: Building2 },
  { value: "URSSAF", icon: Landmark },
  { value: "AMELI", icon: HeartPulse },
  { value: "France Travail", icon: Briefcase },
  { value: "Préfecture", icon: Shield },
  { value: "Impôts", icon: Receipt },
];

const difficultyTone: Record<Difficulty, Tone> = {
  easy: "success",
  medium: "warning",
  hard: "danger",
};

export default function ProceduresPage() {
  const { m } = useLanguage();
  const t = m.procedures;
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState(ALL);

  const filtered = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();

    return procedures.filter((procedure) => {
      const matchesFilter =
        selectedFilter === ALL ||
        procedure.administration === selectedFilter;

      // La recherche couvre aussi la description et l'organisme : chercher
      // « santé » ou « CAF » doit fonctionner, pas seulement le titre exact.
      // Elle porte sur les textes affichés, donc dans la langue choisie.
      const text = t.items[procedure.key];
      const matchesSearch =
        needle === "" ||
        text.title.toLowerCase().includes(needle) ||
        text.description.toLowerCase().includes(needle) ||
        procedure.administration.toLowerCase().includes(needle);

      return matchesFilter && matchesSearch;
    });
  }, [searchQuery, selectedFilter, t]);

  const hasActiveFilters = selectedFilter !== ALL || searchQuery !== "";

  return (
    <div>
      <PageHeader
        title={t.title}
        subtitle={t.subtitle}
      />

      <PageContainer width="wide">
        <div className="space-y-6">
          <Card className="p-5">
            <div className="relative">
              <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t.searchPlaceholder}
                aria-label={t.searchLabel}
                className={`${inputClass} ps-10`}
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {filters.map((filter) => {
                const isActive = selectedFilter === filter.value;
                const Icon = filter.icon;

                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setSelectedFilter(filter.value)}
                    aria-pressed={isActive}
                    className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 active:scale-[0.97] motion-reduce:active:scale-100 ${
                      isActive
                        ? "border-brand-600 bg-brand-600 text-white"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span lang={filter.value === ALL ? undefined : "fr"}>
                      {filter.value === ALL ? t.all : filter.value}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="mt-4 text-sm text-gray-500">
              {fmt(filtered.length > 1 ? t.resultsMany : t.resultsOne, { count: filtered.length })}
            </p>
          </Card>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<SearchX className="h-6 w-6" />}
              title={t.emptyTitle}
              description={t.emptyText}
              action={
                hasActiveFilters ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedFilter(ALL);
                    }}
                  >
                    {t.resetFilters}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="stagger grid grid-cols-1 gap-5 lg:grid-cols-2">
              {filtered.map((procedure) => (
                <ProcedureCard key={procedure.key} procedure={procedure} t={t} />
              ))}
            </div>
          )}
        </div>
      </PageContainer>
    </div>
  );
}

function ProcedureCard({
  procedure,
  t,
}: {
  procedure: Procedure;
  t: Messages["procedures"];
}) {
  const text = t.items[procedure.key];
  const [min, max] = procedure.weeks;

  return (
    <Card interactive className="flex h-full flex-col p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="info">
          <span lang="fr">{procedure.administration}</span>
        </Badge>
        <Badge tone={difficultyTone[procedure.difficulty]}>
          {t.difficulty[procedure.difficulty]}
        </Badge>
      </div>

      <h2 className="mt-4 text-lg font-semibold text-gray-900">
        {text.title}
      </h2>
      <p className="mt-2 flex-1 text-sm text-gray-600">
        {text.description}
      </p>

      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-gray-400" />
          {min === max
            ? fmt(max > 1 ? t.weeks : t.week, { count: max })
            : fmt(t.weeksRange, { min, max })}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <FileText className="h-4 w-4 text-gray-400" />
          {fmt(procedure.documents > 1 ? t.documentsMany : t.documentsOne, { count: procedure.documents })}
        </span>
      </div>

      <div className="mt-6">
        <ButtonLink href={procedure.href} fullWidth>
          {t.start}
        </ButtonLink>
      </div>
    </Card>
  );
}
