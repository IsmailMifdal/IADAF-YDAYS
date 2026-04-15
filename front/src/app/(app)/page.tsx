import Link from "next/link";
import {
  GraduationCap,
  Baby,
  Briefcase,
  Globe,
  Users,
  CheckCircle,
  Shield,
  Clock,
  MessageSquare,
  Sparkles,
  LucideIcon,
} from "lucide-react";

const colorStyles = {
  blue: {
    bar: "bg-blue-500",
    icon: "text-blue-500",
    iconBg: "bg-blue-100",
  },
  pink: {
    bar: "bg-pink-500",
    icon: "text-pink-500",
    iconBg: "bg-pink-100",
  },
  violet: {
    bar: "bg-violet-500",
    icon: "text-violet-500",
    iconBg: "bg-violet-100",
  },
  orange: {
    bar: "bg-orange-500",
    icon: "text-orange-500",
    iconBg: "bg-orange-100",
  },
} as const;

type ProfileColor = keyof typeof colorStyles;

type Profile = {
  icon: LucideIcon;
  title: string;
  description: string;
  steps: string[];
  color: ProfileColor;
};

const profiles: Profile[] = [
  {
    icon: GraduationCap,
    title: "Étudiant étranger",
    description:
      "Vous venez étudier en France ? Nous vous accompagnons dans toutes vos démarches administratives.",
    steps: ["Carte vitale", "CAF logement", "Titre de séjour"],
    color: "blue",
  },
  {
    icon: Baby,
    title: "Nouveau parent",
    description:
      "L'arrivée d'un enfant implique de nombreuses démarches. Simplifiez-vous la vie avec notre assistant dédié.",
    steps: ["CAF allocations", "Déclaration naissance", "Congé parental"],
    color: "pink",
  },
  {
    icon: Briefcase,
    title: "Nouveau travailleur",
    description:
      "Vous commencez un emploi en France ? Nous vous guidons pour toutes les formalités professionnelles.",
    steps: ["URSSAF", "France travail", "Mutuelle"],
    color: "violet",
  },
  {
    icon: Globe,
    title: "Primo-arrivant",
    description:
      "Vous venez d'arriver en France ? Découvrez toutes les démarches essentielles pour bien vous installer.",
    steps: ["Préfecture", "Banque", "Logement", "Santé"],
    color: "orange",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* 1 section Accueil */}
      <section className="relative bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 text-white py-24 px-6 md:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 px-4 py-1 rounded-full text-sm">
              <Sparkles className="w-4 h-4" />
              Propulsé par l'Intelligence Artificielle
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mt-6">
              Simplifiez vos
              <br />
              <span className="text-blue-200">démarches</span>
              <br />
              administratives
            </h1>

            <p className="text-lg text-blue-100 max-w-lg mt-6">
              Votre assistant intelligent pour naviguer dans l'administration
              française. Accessible, multilingue, et disponible 24/7.
            </p>

            <div className="flex gap-4 mt-8 flex-wrap">
              <Link
                href="/nosPacks"
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-medium transition"
              >
                Commencer maintenant →
              </Link>
              <Link
                href="/procedures"
                className="bg-white text-blue-800 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition"
              >
                Explorer les démarches
              </Link>
            </div>
          </div>

          <div className="bg-white/10 border border-white/20 rounded-2xl p-6 backdrop-blur">
            <div className="bg-white rounded-xl p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Assistant IA</p>
                  <p className="text-sm text-green-600">En ligne</p>
                </div>
              </div>

              <div className="bg-gray-100 rounded-lg p-4 text-gray-700 text-sm mb-4">
                Bonjour ! Je suis votre assistant pour les démarches
                administratives. Comment puis-je vous aider aujourd'hui ?
              </div>

              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
                <span className="text-sm text-gray-400 flex-1">
                  Posez votre question...
                </span>
                <button
                  type="button"
                  className="bg-red-500 text-white px-3 py-1.5 rounded-md text-base"
                >
                  ⇨
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2 section ADMINISTRATIONS */}
      <section className="bg-gray-100 border-b border-gray-200 py-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Toutes les administrations en un seul endroit
          </h2>

          <p className="text-gray-600 text-lg mb-10">
            Gérez vos démarches avec les principales institutions françaises
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <span className="px-5 py-2 rounded-xl text-lg font-semibold bg-blue-100 text-blue-700">
              CAF
            </span>
            <span className="px-5 py-2 rounded-xl text-lg font-semibold bg-green-100 text-green-700">
              URSSAF
            </span>
            <span className="px-5 py-2 rounded-xl text-lg font-semibold bg-purple-100 text-purple-700">
              AMELI
            </span>
            <span className="px-5 py-2 rounded-xl text-lg font-semibold bg-orange-100 text-orange-700">
              France Travail
            </span>
            <span className="px-5 py-2 rounded-xl text-lg font-semibold bg-red-100 text-red-700">
              Préfecture
            </span>
            <span className="px-5 py-2 rounded-xl text-lg font-semibold bg-indigo-100 text-indigo-700">
              Impôts
            </span>
          </div>

          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-3xl md:text-4xl font-bold text-blue-700">
                15,000+
              </p>
              <p className="text-gray-500 text-base">Utilisateurs actifs</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold text-blue-700">
                98%
              </p>
              <p className="text-gray-500 text-base">Taux de satisfaction</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold text-blue-700">25</p>
              <p className="text-gray-500 text-base">Langues supportées</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold text-blue-700">
                50+
              </p>
              <p className="text-gray-500 text-base">Démarches couvertes</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3 section POURQUOI IA DAF */}
      <section className="bg-gray-50 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center">
              Pourquoi choisir IA-DAF ?
            </h2>
            <p className="text-gray-600 text-lg text-center mt-3 mb-16">
              Une plateforme conçue pour simplifier votre vie administrative
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <article className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition flex flex-col gap-4">
              <div className="w-12 h-12 bg-blue-700 rounded-lg flex items-center justify-center text-white">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                Assistant IA Multilingue
              </h3>
              <p className="text-gray-600">
                Posez vos questions dans votre langue, l'IA vous répond de
                manière claire et adaptée
              </p>
            </article>

            <article className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition flex flex-col gap-4">
              <div className="w-12 h-12 bg-blue-700 rounded-lg flex items-center justify-center text-white">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                Sécurisé & Confidentiel
              </h3>
              <p className="text-gray-600">
                Vos données personnelles sont protégées et sécurisées selon les
                normes françaises
              </p>
            </article>

            <article className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition flex flex-col gap-4">
              <div className="w-12 h-12 bg-blue-700 rounded-lg flex items-center justify-center text-white">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                Suivi en Temps Réel
              </h3>
              <p className="text-gray-600">
                Suivez l'avancement de vos démarches avec des notifications à
                chaque étape
              </p>
            </article>

            <article className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition flex flex-col gap-4">
              <div className="w-12 h-12 bg-blue-700 rounded-lg flex items-center justify-center text-white">
                <Globe className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                Support Multilingue
              </h3>
              <p className="text-gray-600">
                Interface disponible en plusieurs langues pour faciliter votre
                compréhension
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* 4 section COMMENT CA MARCHE */}
      <section className="bg-white py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center">
              Comment ça marche ?
            </h2>
            <p className="text-gray-600 text-lg text-center mt-3 mb-16">
              Quatre étapes simples pour réussir vos démarches
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            <article className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm hover:shadow-md transition relative flex flex-col gap-4">
              <span className="absolute -top-4 left-6 bg-red-500 text-white text-sm font-semibold px-3 py-1 rounded-md">
                01
              </span>
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-gray-700" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                Créez votre compte
              </h3>
              <p className="text-gray-600">
                Inscription simple et rapide en quelques minutes. Choisissez
                votre langue préférée.
              </p>
            </article>

            <article className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm hover:shadow-md transition relative flex flex-col gap-4">
              <span className="absolute -top-4 left-6 bg-red-500 text-white text-sm font-semibold px-3 py-1 rounded-md">
                02
              </span>
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-gray-700" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                Parlez à l'IA
              </h3>
              <p className="text-gray-600">
                Expliquez votre situation à notre assistant intelligent qui vous
                comprend dans votre langue.
              </p>
            </article>

            <article className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm hover:shadow-md transition relative flex flex-col gap-4">
              <span className="absolute -top-4 left-6 bg-red-500 text-white text-sm font-semibold px-3 py-1 rounded-md">
                03
              </span>
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-gray-700" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                Préparez vos documents
              </h3>
              <p className="text-gray-600">
                L'IA vous guide pour rassembler et uploader les documents
                nécessaires.
              </p>
            </article>

            <article className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm hover:shadow-md transition relative flex flex-col gap-4">
              <span className="absolute -top-4 left-6 bg-red-500 text-white text-sm font-semibold px-3 py-1 rounded-md">
                04
              </span>
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-gray-700" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                Suivez votre dossier
              </h3>
              <p className="text-gray-600">
                Recevez des notifications et suivez l'avancement en temps réel
                jusqu'à la validation.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* X section TOUS LES PROFILS */}
      <section className="py-20 px-6 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          IA-DAF pour tous les profils
        </h1>
        <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
          Des solutions adaptées à votre situation personnelle
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {profiles.map((profile) => (
            <ProfileCard key={profile.title} {...profile} />
          ))}
        </div>
      </section>
    </div>
  );
}

interface ProfileCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  steps: string[];
  color: ProfileColor;
}

function ProfileCard({
  icon: Icon,
  title,
  description,
  steps,
  color,
}: ProfileCardProps) {
  const palette = colorStyles[color];

  return (
    <div className="relative bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition h-full flex flex-col justify-between overflow-hidden">
      <div
        className={`absolute inset-x-0 top-0 h-2 ${palette.bar} rounded-t-xl`}
      />

      <div className="flex h-full flex-col justify-between pt-2">
        <div>
          <div
            className={`inline-flex items-center justify-center p-4 rounded-lg ${palette.iconBg} mb-4`}
          >
            <Icon className={`w-6 h-6 ${palette.icon}`} />
          </div>

          <h2 className="text-xl font-semibold text-gray-900 mb-3">{title}</h2>

          <p className="text-gray-600 mb-4 leading-relaxed">{description}</p>

          <p className="font-semibold text-gray-900 mb-3">
            Démarches concernées :
          </p>

          <div className="inline-flex flex-wrap gap-2 mb-6">
            {steps.map((step) => (
              <span
                key={step}
                className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
              >
                {step}
              </span>
            ))}
          </div>
        </div>

        <Link
          href="/nosPacks"
          className="bg-red-500 hover:bg-red-600 text-white w-full py-2 rounded-lg mt-4 font-medium transition text-center"
        >
          Commencer →
        </Link>
      </div>
    </div>
  );
}
