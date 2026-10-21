import Link from "next/link";
import {
  ArrowRight,
  Baby,
  Briefcase,
  CheckCircle2,
  FileCheck2,
  FolderCheck,
  Globe,
  GraduationCap,
  Languages,
  Lock,
  MessageSquare,
  ScrollText,
  ShieldCheck,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

import AccueilChat from "../components/chat/AccueilChat";
import { BrandMark } from "../components/brand/BrandMark";
import { LANGUAGES } from "../context/languages";
import { ALL_ACCESS_SLUG, packs } from "./packs/packsData";

// Chiffres tirés du code, jamais saisis à la main : la page d'accueil ne peut
// pas annoncer plus de langues ou de démarches que le site n'en propose.
const guidedPacks = packs.filter((pack) => pack.slug !== ALL_ACCESS_SLUG);
const shortTitle = (title: string) => title.replace(/\s*\(.*\)\s*$/, "");

const primaryCta =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 font-semibold text-white " +
  "shadow-glow ring-1 ring-inset ring-white/10 transition duration-200 ease-out hover:bg-brand-700 " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 " +
  "active:scale-[0.97] motion-reduce:active:scale-100";

const secondaryCta =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white/80 px-6 py-3.5 " +
  "font-semibold text-gray-800 shadow-xs backdrop-blur transition duration-200 ease-out hover:border-gray-300 " +
  "hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 " +
  "active:scale-[0.97] motion-reduce:active:scale-100";

const ADMINISTRATIONS = ["Préfecture · ANEF", "CAF", "Ameli", "Impôts", "URSSAF", "France Travail"];

const FACTS = [
  {
    value: String(LANGUAGES.length),
    label: "Langues",
    detail: LANGUAGES.map((language) => language.label).join(" · "),
  },
  {
    value: String(guidedPacks.length),
    label: "Démarches guidées",
    detail: guidedPacks.map((pack) => shortTitle(pack.title)).join(", "),
  },
  { value: "24 h/24", label: "Assistant disponible", detail: "Même le soir et le week-end" },
  { value: "100 %", label: "Pièces chiffrées", detail: "Supprimables à tout moment" },
];

const FEATURES: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: ScrollText,
    title: "Des réponses sourcées",
    description:
      "L’assistant s’appuie sur les fiches officielles de service-public.gouv.fr, synchronisées automatiquement.",
  },
  {
    icon: FileCheck2,
    title: "Vos pièces vérifiées",
    description:
      "Date de validité, lisibilité, IBAN : IA-DAF repère ce qui ferait refuser votre dossier, avant le dépôt.",
  },
  {
    icon: FolderCheck,
    title: "Une checklist par démarche",
    description:
      "Les pièces à fournir selon votre situation, cochées au fur et à mesure de votre avancée.",
  },
  {
    icon: ShieldCheck,
    title: "Vos données protégées",
    description:
      "Pièces chiffrées, compte et données supprimables à tout moment depuis vos paramètres.",
  },
];

const STEPS: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: UserPlus,
    title: "Créez votre compte",
    description: "Gratuit, en deux minutes. Choisissez votre langue.",
  },
  {
    icon: MessageSquare,
    title: "Posez vos questions",
    description: "Expliquez votre situation : l’assistant vous dit quelles démarches faire.",
  },
  {
    icon: FileCheck2,
    title: "Préparez vos pièces",
    description: "Déposez-les dans votre espace : IA-DAF les vérifie une à une.",
  },
  {
    icon: FolderCheck,
    title: "Déposez un dossier complet",
    description: "Sans pièce oubliée ni document périmé : moins de risques de refus.",
  },
];

const PROFILE_COLORS = {
  blue: "bg-brand-50 text-brand-600 ring-brand-100",
  pink: "bg-pink-50 text-pink-600 ring-pink-100",
  violet: "bg-violet-50 text-violet-600 ring-violet-100",
  orange: "bg-orange-50 text-orange-600 ring-orange-100",
} as const;

type Profile = {
  icon: LucideIcon;
  title: string;
  description: string;
  steps: string[];
  color: keyof typeof PROFILE_COLORS;
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
    <div className="bg-white">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div aria-hidden="true" className="bg-glow pointer-events-none absolute inset-0" />
        <div aria-hidden="true" className="bg-dots pointer-events-none absolute inset-0" />

        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-6 pb-24 pt-14 md:px-12 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200/70 bg-white/70 px-3.5 py-1.5 text-sm font-medium text-brand-700 shadow-xs backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:hidden" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Assistant IA · en {LANGUAGES.length} langues
            </span>

            <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
              Vos démarches en France,{" "}
              <span className="text-gradient">enfin simples.</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-gray-600">
              IA-DAF répond à vos questions dans votre langue, s’appuie sur les
              fiches officielles de service-public.gouv.fr et vérifie vos pièces
              avant que vous ne déposiez votre dossier.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/nosPacks" className={primaryCta}>
                Commencer maintenant
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/procedures" className={secondaryCta}>
                Explorer les démarches
              </Link>
            </div>

            <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-gray-600">
              {["Réponses sourcées", "Pièces chiffrées", "Compte gratuit"].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <HeroPreview />
        </div>
      </section>

      {/* ── Administrations ──────────────────────────────────────────── */}
      <section className="border-y border-gray-200/70 bg-gray-50/80">
        <div className="mx-auto max-w-6xl px-6 py-10 md:px-12">
          <p className="text-center text-sm font-medium text-gray-500">
            Les administrations que vous croisez, réunies au même endroit
          </p>
          <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {ADMINISTRATIONS.map((name) => (
              <li key={name} className="text-lg font-bold tracking-tight text-gray-400">
                {name}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Chiffres ─────────────────────────────────────────────────── */}
      <section className="px-6 py-20 md:px-12">
        <ul className="stagger mx-auto grid max-w-6xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FACTS.map((fact) => (
            <li
              key={fact.label}
              className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-soft"
            >
              <p className="text-4xl font-extrabold tracking-tight">
                <span className="text-gradient">{fact.value}</span>
              </p>
              <p className="mt-2 font-semibold text-gray-900">{fact.label}</p>
              <p className="mt-1 text-sm text-gray-500">{fact.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Fonctionnalités ──────────────────────────────────────────── */}
      <section className="bg-gray-50 px-6 py-24 md:px-12">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            eyebrow="Pourquoi IA-DAF"
            title="Tout ce qu’il faut pour un dossier complet"
            description="Une seule plateforme, de la première question jusqu’au dépôt."
          />

          <div className="stagger mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
            <article className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-violet-700 p-8 text-white shadow-glow md:col-span-2 md:p-10">
              <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
              <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 left-10 h-56 w-56 rounded-full bg-sky-400/20 blur-3xl" />
              <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-inset ring-white/20">
                <Languages className="h-6 w-6" />
              </span>
              <h3 className="relative mt-6 text-2xl font-bold md:text-3xl">
                Un assistant qui parle votre langue
              </h3>
              <p className="relative mt-3 max-w-md text-brand-100">
                Posez vos questions comme vous les formuleriez à un proche :
                l’assistant vous répond clairement, dans la langue que vous
                choisissez, à toute heure.
              </p>
              <ul className="relative mt-8 flex flex-wrap gap-2.5">
                {LANGUAGES.map((language) => (
                  <li
                    key={language.code}
                    lang={language.code}
                    className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-white/20"
                  >
                    {language.label}
                  </li>
                ))}
              </ul>
            </article>

            {FEATURES.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Comment ça marche ────────────────────────────────────────── */}
      <section className="px-6 py-24 md:px-12">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            eyebrow="Comment ça marche"
            title="Quatre étapes, aucune impasse"
            description="Vous savez toujours ce qu’il reste à faire."
          />

          <ol className="stagger relative mt-16 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            <span
              aria-hidden="true"
              className="absolute left-[12.5%] right-[12.5%] top-7 hidden border-t-2 border-dashed border-brand-200 lg:block"
            />
            {STEPS.map((step, index) => (
              <li key={step.title} className="relative text-center">
                <span className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-lift ring-1 ring-gray-200/80">
                  <step.icon className="h-6 w-6" />
                  <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white ring-4 ring-white">
                    {index + 1}
                  </span>
                </span>
                <h3 className="mt-5 text-lg font-semibold text-gray-900">{step.title}</h3>
                <p className="mx-auto mt-2 max-w-60 text-sm leading-relaxed text-gray-600">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Profils ──────────────────────────────────────────────────── */}
      <section className="bg-gray-50 px-6 py-24 md:px-12">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            eyebrow="Pour qui"
            title="IA-DAF pour tous les profils"
            description="Des parcours adaptés à votre situation personnelle."
          />

          <div className="stagger mt-14 grid grid-cols-1 gap-5 md:grid-cols-2">
            {profiles.map((profile) => (
              <ProfileCard key={profile.title} {...profile} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Appel final ──────────────────────────────────────────────── */}
      <section className="px-6 py-20 md:px-12">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-violet-700 px-8 py-16 text-center text-white shadow-glow md:px-16">
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-sky-400/20 blur-3xl" />
          <h2 className="relative text-3xl font-bold md:text-4xl">
            Prêt à avancer sur votre dossier ?
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-lg text-brand-100">
            Créez votre compte gratuitement et posez votre première question dès
            maintenant.
          </p>
          <div className="relative mt-9 flex flex-wrap justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 font-semibold text-brand-700 shadow-lg transition hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-700 active:scale-[0.97] motion-reduce:active:scale-100"
            >
              Créer mon compte
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/nosPacks"
              className="inline-flex items-center rounded-xl bg-white/10 px-6 py-3.5 font-semibold text-white ring-1 ring-inset ring-white/30 transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-[0.97] motion-reduce:active:scale-100"
            >
              Voir les packs
            </Link>
          </div>
        </div>
      </section>

      <AccueilChat />
    </div>
  );
}

/** Aperçu de l'assistant : ce que l'utilisateur obtiendra, plutôt qu'une illustration. */
function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-lg animate-fade-up [animation-delay:120ms]">
      <div
        aria-hidden="true"
        className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-tr from-brand-500/25 via-violet-500/15 to-sky-400/25 blur-2xl"
      />

      <figure
        aria-label="Exemple de conversation avec l’assistant"
        className="relative overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-lift"
      >
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <BrandMark size="sm" />
            <div>
              <p className="text-sm font-semibold text-gray-900">Assistant IA-DAF</p>
              <p className="flex items-center gap-1.5 text-xs text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                En ligne
              </p>
            </div>
          </div>
          <div className="flex gap-1" aria-hidden="true">
            {LANGUAGES.map((language) => (
              <span
                key={language.code}
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  language.code === "en"
                    ? "bg-brand-600 text-white"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {language.code.toUpperCase()}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-4 bg-gray-50/70 px-5 py-6" lang="en">
          <div className="flex justify-end">
            <p className="max-w-[80%] rounded-2xl rounded-tr-md bg-brand-600 px-4 py-2.5 text-sm text-white shadow-sm">
              How do I renew my residence permit?
            </p>
          </div>

          <div className="flex gap-2.5">
            <BrandMark size="sm" />
            <div className="max-w-[85%] rounded-2xl rounded-tl-md border border-gray-200/80 bg-white px-4 py-3 text-sm text-gray-700 shadow-xs">
              <p>Apply online on the ANEF website before your permit expires. You will need:</p>
              <ul className="mt-2.5 space-y-1.5">
                {["Your passport", "A recent proof of address", "A digital ID photo"].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-500" lang="fr">
                <ScrollText className="h-3 w-3" />
                Source : service-public.gouv.fr
              </p>
            </div>
          </div>
        </div>
      </figure>

      <div className="animate-float absolute -bottom-7 -left-5 hidden items-center gap-3 rounded-2xl border border-gray-200/80 bg-white px-4 py-3 shadow-lift sm:flex">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <FileCheck2 className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-gray-900">Pièce vérifiée</p>
          <p className="text-xs text-gray-500">Date de validité contrôlée</p>
        </div>
      </div>

      <div className="animate-float absolute -right-3 -top-5 hidden items-center gap-2 rounded-full border border-gray-200/80 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-lift [animation-delay:-3s] sm:flex">
        <Lock className="h-3.5 w-3.5 text-brand-600" />
        Pièces chiffrées
      </div>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">{title}</h2>
      <p className="mt-4 text-lg text-gray-600">{description}</p>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-3xl border border-gray-200/80 bg-white p-7 shadow-soft transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lift motion-reduce:hover:translate-y-0">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-5 text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">{description}</p>
    </article>
  );
}

function ProfileCard({ icon: Icon, title, description, steps, color }: Profile) {
  return (
    <article className="group flex h-full flex-col rounded-3xl border border-gray-200/80 bg-white p-7 shadow-soft transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lift motion-reduce:hover:translate-y-0">
      <div className="flex items-center gap-4">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset ${PROFILE_COLORS[color]}`}>
          <Icon className="h-6 w-6" />
        </span>
        <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
      </div>

      <p className="mt-4 leading-relaxed text-gray-600">{description}</p>

      <ul className="mt-5 flex flex-wrap gap-2" aria-label="Démarches concernées">
        {steps.map((step) => (
          <li key={step} className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-700">
            {step}
          </li>
        ))}
      </ul>

      <Link
        href="/nosPacks"
        className="mt-auto inline-flex items-center gap-1.5 self-start rounded-lg pt-6 font-semibold text-brand-700 transition hover:text-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        Voir les packs
        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
      </Link>
    </article>
  );
}
