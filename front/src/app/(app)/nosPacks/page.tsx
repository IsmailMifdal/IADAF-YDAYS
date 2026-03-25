"use client";

import {
  Check,
  HeartPulse,
  House,
  IdCard,
  Package,
  Receipt,
  type LucideIcon,
} from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";

type PackColor = "blue" | "green" | "orange" | "violet" | "yellow";

type Pack = {
  title: string;
  price: string;
  color: PackColor;
  description: string[];
  icon: LucideIcon;
};

const packs: Pack[] = [
  {
    title: "Titre de sejour (ANEF)",
    price: "20€",
    color: "blue",
    description: [
      "Guide complet",
      "Choix du type de titre",
      "Checklist personnalisée",
      "Vérification documents",
      "Assistance IA avancée",
      "Alertes (dates, RDV)",
    ],
    icon: IdCard,
  },
  {
    title: "Assurance maladie (Ameli)",
    price: "20€",
    color: "green",
    description: [
      "Guide complet",
      "Checklist documents",
      "Vérification des documents",
      "Assistance IA avancée",
      "Alertes documents manquants",
    ],
    icon: HeartPulse,
  },
  {
    title: "Aide logement (CAF)",
    price: "20€",
    color: "orange",
    description: [
      "Simulation aides",
      "Guide CAF simplifié",
      "Aide remplissage",
      "Suivi dossier",
      "Notifications",
    ],
    icon: House,
  },

  //   {
  //     title: "Declaration impots",
  //     price: "10€",
  //     color: "violet",
  //     description: [
  //       "Explication simplifiée",
  //       "Aide remplissage",
  //       "Vérification des données",
  //       "Simulation",
  //     ],
  //     icon: Receipt,
  //   },
  {
    title: "Pack complet",
    price: "50€",
    color: "yellow",
    description: ["Le contenu de tous les packs réunis en un seul !"],
    icon: Package,
  },
];

const packStyleClass: Record<
  PackColor,
  { bar: string; border: string; icon: string; priceTag: string }
> = {
  blue: {
    bar: "bg-blue-700",
    border: "border-blue-200",
    icon: "text-blue-700",
    priceTag: "border-blue-200 bg-blue-50 text-blue-700",
  },
  green: {
    bar: "bg-green-600",
    border: "border-green-200",
    icon: "text-green-700",
    priceTag: "border-green-200 bg-green-50 text-green-700",
  },
  orange: {
    bar: "bg-orange-500",
    border: "border-orange-200",
    icon: "text-orange-700",
    priceTag: "border-orange-200 bg-orange-50 text-orange-700",
  },
  violet: {
    bar: "bg-violet-600",
    border: "border-violet-200",
    icon: "text-violet-700",
    priceTag: "border-violet-200 bg-violet-50 text-violet-700",
  },
  yellow: {
    bar: "bg-yellow-500",
    border: "border-yellow-200",
    icon: "text-yellow-700",
    priceTag: "border-yellow-200 bg-yellow-50 text-yellow-700",
  },
};

export default function NosPacksPage() {
  return (
    <div>
      <PageHeader
        title="Nos packs"
        subtitle="Voir nos offres groupées pour simplifier vos démarches administratives."
      />
      <div className="bg-gray-50 min-h-screen px-4 md:px-8 py-16">
        <div className="max-w-7xl mx-auto">
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-stretch">
            {packs.map((pack) => (
              <div key={pack.title}>
                <PackCard pack={pack} />
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}

type PackCardProps = {
  pack: Pack;
};

function PackCard({ pack }: PackCardProps) {
  const style = packStyleClass[pack.color];
  const Icon = pack.icon;
  const isBestChoice = pack.title === "Pack complet";

  return (
    <article
      className={`relative w-full max-w-sm mx-auto bg-white border rounded-2xl p-8 flex flex-col justify-between shadow-sm hover:shadow-lg transition hover:scale-[1.02] h-[560px] ${
        isBestChoice
          ? "border-2 border-yellow-400 shadow-lg scale-[1.03]"
          : style.border
      }`}
    >
      <div
        className={`absolute inset-x-0 top-0 h-2 w-full rounded-t-2xl ${style.bar}`}
      />

      {isBestChoice && (
        <span className="absolute top-4 right-4 bg-yellow-400 text-white text-xs px-3 py-1 rounded-full">
          Meilleur choix
        </span>
      )}

      <div>
        <Icon className={`w-10 h-10 mx-auto mb-4 ${style.icon}`} />
        <h2 className="text-lg font-semibold text-gray-900 text-center mt-4">
          {pack.title}
        </h2>

        <p className="text-4xl font-bold text-gray-900 text-center my-6">
          {pack.price}
        </p>
        <p className="text-sm text-gray-500 text-center">/ pack</p>

        <ul className="space-y-3 mt-4">
          {pack.description.map((item) => (
            <li
              key={item}
              className="flex items-center gap-2 text-gray-600 text-sm"
            >
              <Check className="w-4 h-4 text-green-500 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        className="mt-8 bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-medium transition w-full"
      >
        Choisir ce pack
      </button>
    </article>
  );
}
