"use client";

import { useMemo, useState } from "react";
import {
  Briefcase,
  Building2,
  FileText,
  HeartPulse,
  Landmark,
  Layers,
  Receipt,
  Shield,
  type LucideIcon,
} from "lucide-react";
import HeaderPage from "../../components/ui/PageHeader";

type Procedure = {
  id: number;
  title: string;
  description: string;
  administration: string;
  duration: string;
  difficulty: string;
  documents: number;
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
  },
  {
    id: 4,
    title: "Inscription à Pôle Emploi",
    description:
      "Inscrivez-vous comme demandeur d'emploi et accédez à vos allocations et services.",
    administration: "Pôle Emploi",
    duration: "1-2 semaines",
    difficulty: "Facile",
    documents: 4,
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
  },
];

type FilterOption = {
  label: string;
  icon: LucideIcon;
};

const filters: FilterOption[] = [
  { label: "Toutes", icon: Layers },
  { label: "CAF", icon: Building2 },
  { label: "URSSAF", icon: Landmark },
  { label: "AMELI", icon: HeartPulse },
  { label: "Pôle Emploi", icon: Briefcase },
  { label: "Préfecture", icon: Shield },
  { label: "Impôts", icon: Receipt },
];

export default function Procedures() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("Toutes");

  const filteredProcedures = useMemo(() => {
    return procedures.filter((procedure) => {
      const matchesFilter =
        selectedFilter === "Toutes" ||
        procedure.administration === selectedFilter;
      const matchesSearch = procedure.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      return matchesFilter && matchesSearch;
    });
  }, [searchQuery, selectedFilter]);

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col w-full">
      <HeaderPage
        title="Mes démarches"
        subtitle="Retrouvez ici toutes les démarches administratives. Chaque démarche est expliquée étape par étape."
      />
      <section className="flex-1 min-h-0 w-full max-w-7xl mx-auto px-4 md:px-8 py-6 flex flex-col">
        <div className="flex-1 min-h-0 p-2 md:p-4 flex flex-col gap-6">
          <div className="border border-gray-200 rounded-xl p-4 space-y-4 w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Rechercher une démarche..."
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="space-y-3">
              <p className="text-sm text-gray-600 font-medium">
                Filtrer par administration :
              </p>
              <div className="flex flex-wrap gap-3">
                {filters.map((filter) => {
                  const isActive = selectedFilter === filter.label;
                  const Icon = filter.icon;

                  return (
                    <button
                      key={filter.label}
                      type="button"
                      onClick={() => setSelectedFilter(filter.label)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold border transition flex items-center gap-2 ${
                        isActive
                          ? "bg-blue-600 text-white border-blue-600"
                          : "border-gray-200 bg-white hover:bg-gray-100"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {filter.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="text-sm text-gray-600">
              {filteredProcedures.length} démarche(s) trouvée(s)
            </p>
          </div>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            {filteredProcedures.map((procedure) => (
              <ProcedureCard
                key={procedure.id}
                title={procedure.title}
                description={procedure.description}
                administration={procedure.administration}
                duration={procedure.duration}
                difficulty={procedure.difficulty}
                documents={procedure.documents}
              />
            ))}
          </section>
        </div>
      </section>
    </div>
  );
}

type ProcedureCardProps = {
  title: string;
  description: string;
  administration: string;
  duration: string;
  difficulty: string;
  documents: number;
};

function ProcedureCard({
  title,
  description,
  administration,
  duration,
  difficulty,
  documents,
}: ProcedureCardProps) {
  return (
    <article className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col gap-4">
      <div>
        <span className="text-xs font-semibold px-2 py-1 rounded bg-blue-100 text-blue-700">
          {administration}
        </span>
      </div>

      <h2 className="text-2xl font-bold text-gray-900">{title}</h2>

      <p className="text-base text-gray-600">{description}</p>

      <div className="flex gap-4 text-sm text-gray-500 items-center">
        <span>Durée : {duration}</span>
        <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-700">
          {difficulty}
        </span>
      </div>

      <div className="bg-gray-100 font-semibold rounded-lg px-4 py-2 text-sm text-gray-600 flex items-center gap-2">
        <FileText className="w-4 h-4" />
        {documents} document(s) requis
      </div>

      <button
        type="button"
        className="bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-medium w-full transition"
      >
        Démarrer cette démarche
      </button>
    </article>
  );
}
