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

type Difficulty = "Facile" | "Moyen" | "Difficile";

type Procedure = {
  id: number;
  title: string;
  description: string;
  administration: string;
  duration: string;
  difficulty: Difficulty;
  documents: number;
  /** Pack correspondant, vers lequel la démarche renvoie. */
  href: string;
};

const procedures: Procedure[] = [
  {
    id: 1,
    title: "Demande d'allocations familiales CAF",
    description:
      "Constituez votre dossier CAF pour bénéficier des aides selon votre situation familiale.",
    administration: "CAF",
    duration: "2-4 semaines",
    difficulty: "Moyen",
    documents: 5,
    href: "/payment/aide-logement",
  },
  {
    id: 2,
    title: "Déclaration de début d'activité URSSAF",
    description:
      "Déclarez votre activité professionnelle et obtenez votre immatriculation rapidement.",
    administration: "URSSAF",
    duration: "1-2 semaines",
    difficulty: "Moyen",
    documents: 4,
    href: "/payment/impots",
  },
  {
    id: 3,
    title: "Ouverture des droits AMELI",
    description:
      "Activez votre couverture santé et demandez votre attestation de droits en ligne.",
    administration: "AMELI",
    duration: "2-3 semaines",
    difficulty: "Facile",
    documents: 3,
    href: "/payment/assurance-maladie",
  },
  {
    id: 4,
    title: "Inscription à France Travail",
    description:
      "Inscrivez-vous comme demandeur d'emploi et accédez à vos allocations et services.",
    administration: "France Travail",
    duration: "1-2 semaines",
    difficulty: "Facile",
    documents: 4,
    href: "/nosPacks",
  },
  {
    id: 5,
    title: "Renouvellement titre de séjour",
    description:
      "Préparez et déposez votre demande de renouvellement auprès de la préfecture.",
    administration: "Préfecture",
    duration: "4-8 semaines",
    difficulty: "Difficile",
    documents: 7,
    href: "/payment/titre-sejour",
  },
  {
    id: 6,
    title: "Déclaration de revenus en ligne",
    description:
      "Complétez votre déclaration d'impôts annuelle avec les pièces justificatives nécessaires.",
    administration: "Impôts",
    duration: "1 semaine",
    difficulty: "Moyen",
    documents: 4,
    href: "/payment/impots",
  },
];

type FilterOption = { label: string; icon: LucideIcon };

// Les libellés doivent correspondre exactement au champ `administration` :
// un filtre « Pôle Emploi » face à une démarche « France Travail » ne
// renvoyait plus aucun résultat.
const filters: FilterOption[] = [
  { label: "Toutes", icon: Layers },
  { label: "CAF", icon: Building2 },
  { label: "URSSAF", icon: Landmark },
  { label: "AMELI", icon: HeartPulse },
  { label: "France Travail", icon: Briefcase },
  { label: "Préfecture", icon: Shield },
  { label: "Impôts", icon: Receipt },
];

const difficultyTone: Record<Difficulty, Tone> = {
  Facile: "success",
  Moyen: "warning",
  Difficile: "danger",
};

export default function ProceduresPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("Toutes");

  const filtered = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();

    return procedures.filter((procedure) => {
      const matchesFilter =
        selectedFilter === "Toutes" ||
        procedure.administration === selectedFilter;

      // La recherche couvre aussi la description et l'organisme : chercher
      // « santé » ou « CAF » doit fonctionner, pas seulement le titre exact.
      const matchesSearch =
        needle === "" ||
        procedure.title.toLowerCase().includes(needle) ||
        procedure.description.toLowerCase().includes(needle) ||
        procedure.administration.toLowerCase().includes(needle);

      return matchesFilter && matchesSearch;
    });
  }, [searchQuery, selectedFilter]);

  const hasActiveFilters = selectedFilter !== "Toutes" || searchQuery !== "";

  return (
    <div>
      <PageHeader
        title="Démarches"
        subtitle="Toutes les démarches administratives, expliquées étape par étape."
      />

      <PageContainer width="wide">
        <div className="space-y-6">
          <Card className="p-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Rechercher une démarche, un organisme…"
                aria-label="Rechercher une démarche"
                className={`${inputClass} pl-10`}
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {filters.map((filter) => {
                const isActive = selectedFilter === filter.label;
                const Icon = filter.icon;

                return (
                  <button
                    key={filter.label}
                    type="button"
                    onClick={() => setSelectedFilter(filter.label)}
                    aria-pressed={isActive}
                    className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-[0.97] motion-reduce:active:scale-100 ${
                      isActive
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {filter.label}
                  </button>
                );
              })}
            </div>

            <p className="mt-4 text-sm text-gray-500">
              {filtered.length} démarche{filtered.length > 1 ? "s" : ""} trouvée
              {filtered.length > 1 ? "s" : ""}
            </p>
          </Card>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<SearchX className="h-6 w-6" />}
              title="Aucune démarche ne correspond"
              description="Essayez un autre mot-clé, ou retirez le filtre par organisme."
              action={
                hasActiveFilters ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedFilter("Toutes");
                    }}
                  >
                    Réinitialiser les filtres
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="stagger grid grid-cols-1 gap-5 lg:grid-cols-2">
              {filtered.map((procedure) => (
                <ProcedureCard key={procedure.id} procedure={procedure} />
              ))}
            </div>
          )}
        </div>
      </PageContainer>
    </div>
  );
}

function ProcedureCard({ procedure }: { procedure: Procedure }) {
  return (
    <Card interactive className="flex h-full flex-col p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="info">{procedure.administration}</Badge>
        <Badge tone={difficultyTone[procedure.difficulty]}>
          {procedure.difficulty}
        </Badge>
      </div>

      <h2 className="mt-4 text-lg font-semibold text-gray-900">
        {procedure.title}
      </h2>
      <p className="mt-2 flex-1 text-sm text-gray-600">
        {procedure.description}
      </p>

      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-gray-400" />
          {procedure.duration}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <FileText className="h-4 w-4 text-gray-400" />
          {procedure.documents} document{procedure.documents > 1 ? "s" : ""} requis
        </span>
      </div>

      <div className="mt-6">
        <ButtonLink href={procedure.href} fullWidth>
          Démarrer cette démarche
        </ButtonLink>
      </div>
    </Card>
  );
}
