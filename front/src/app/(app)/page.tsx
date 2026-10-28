import Link from "next/link";
import {
  ArrowRight,
  Baby,
  Briefcase,
  CheckCircle2,
  FileCheck2,
  FolderCheck,
  FolderOpen,
  Globe,
  GraduationCap,
  Languages,
  LayoutGrid,
  Lock,
  MessageSquare,
  ScrollText,
  ShieldCheck,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

import { auth } from "../../auth";
import AccueilChat from "../components/chat/AccueilChat";
import { BrandMark } from "../components/brand/BrandMark";
import { LANGUAGES, type LangCode } from "../context/languages";
import { fmt, type Messages } from "../i18n";
import { getLang, getMessages } from "../i18n/server";
import { ALL_ACCESS_SLUG, localizedPack, packs } from "./packs/packsData";

const primaryCta =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 font-semibold text-brand-800 " +
  "shadow-lg transition duration-200 ease-out hover:bg-brand-50 " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 " +
  "active:scale-[0.97] motion-reduce:active:scale-100";

const secondaryCta =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-3.5 " +
  "font-semibold text-white backdrop-blur transition duration-200 ease-out hover:bg-white/20 " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 " +
  "active:scale-[0.97] motion-reduce:active:scale-100";

// Noms propres des organismes : l'utilisateur doit les reconnaître sur ses
// courriers, ils restent en français dans toutes les langues.
const ADMINISTRATIONS = ["Préfecture · ANEF", "CAF", "Ameli", "Impôts", "URSSAF", "France Travail"];

const FEATURE_ICONS: Record<keyof Messages["home"]["features"]["items"], LucideIcon> = {
  sourced: ScrollText,
  checked: FileCheck2,
  checklist: FolderCheck,
  privacy: ShieldCheck,
};

const STEP_ICONS: LucideIcon[] = [UserPlus, MessageSquare, FileCheck2, FolderCheck];

const PROFILES: {
  key: keyof Messages["home"]["profiles"]["items"];
  icon: LucideIcon;
  color: string;
}[] = [
  { key: "student", icon: GraduationCap, color: "bg-brand-50 text-brand-600 ring-brand-100" },
  { key: "parent", icon: Baby, color: "bg-pink-50 text-pink-600 ring-pink-100" },
  { key: "worker", icon: Briefcase, color: "bg-violet-50 text-violet-600 ring-violet-100" },
  { key: "newcomer", icon: Globe, color: "bg-orange-50 text-orange-600 ring-orange-100" },
];

/** Flèche « vers la suite » : vers la gauche quand la page se lit de droite à gauche. */
const forwardIcon = "h-4 w-4 rtl:-scale-x-100";

export default async function Home() {
  const [m, lang, session] = await Promise.all([getMessages(), getLang(), auth()]);
  const t = m.home;

  // Chiffres tirés du code, jamais saisis à la main : la page d'accueil ne peut
  // pas annoncer plus de langues ou de démarches que le site n'en propose.
  const guidedPacks = packs
    .filter((pack) => pack.slug !== ALL_ACCESS_SLUG)
    .map((pack) => localizedPack(m, pack));
  const shortTitle = (title: string) => title.replace(/\s*\(.*\)\s*$/, "");

  const facts = [
    {
      value: String(LANGUAGES.length),
      label: t.facts.languages,
      detail: LANGUAGES.map((language) => language.label).join(" · "),
    },
    {
      value: String(guidedPacks.length),
      label: t.facts.guided,
      detail: guidedPacks.map((pack) => shortTitle(pack.title)).join(", "),
    },
    { value: t.facts.availableValue, label: t.facts.available, detail: t.facts.availableDetail },
    { value: "100 %", label: t.facts.encrypted, detail: t.facts.encryptedDetail },
  ];

  return (
    <div className="bg-white">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-r from-brand-900 via-brand-800 to-brand-700 text-white rtl:bg-gradient-to-l">
        <div aria-hidden="true" className="pointer-events-none absolute -end-16 -top-24 h-[28rem] w-[28rem] rounded-full bg-brand-400/20 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 start-1/4 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-6 pb-24 pt-14 md:px-12 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-sm font-medium text-white backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:hidden" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              {fmt(t.badge, { count: LANGUAGES.length })}
            </span>

            <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
              {t.titleStart} <span className="text-brand-200">{t.titleHighlight}</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-brand-100">{t.intro}</p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/nosPacks" className={primaryCta}>
                {t.ctaStart}
                <ArrowRight className={forwardIcon} />
              </Link>
              <Link href="/procedures" className={secondaryCta}>
                {t.ctaExplore}
              </Link>
            </div>

            <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-brand-100">
              {t.trust.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <HeroPreview t={t.preview} lang={lang} />
        </div>
      </section>

      {/* ── Administrations ──────────────────────────────────────────── */}
      <section className="border-y border-gray-200/70 bg-gray-50/80">
        <div className="mx-auto max-w-6xl px-6 py-10 md:px-12">
          <p className="text-center text-sm font-medium text-gray-500">{t.administrations}</p>
          <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4" lang="fr">
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
          {facts.map((fact) => (
            <li
              key={fact.label}
              className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-soft"
            >
              <p className="text-4xl font-extrabold tracking-tight">
                <span className="text-gradient" dir="ltr">{fact.value}</span>
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
          <SectionHeading {...t.features.heading} />

          <div className="stagger mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
            <article className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 p-8 text-white shadow-glow md:col-span-2 md:p-10">
              <div aria-hidden="true" className="pointer-events-none absolute -end-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
              <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 start-10 h-56 w-56 rounded-full bg-sky-400/20 blur-3xl" />
              <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-inset ring-white/20">
                <Languages className="h-6 w-6" />
              </span>
              <h3 className="relative mt-6 text-2xl font-bold md:text-3xl">{t.features.languageTitle}</h3>
              <p className="relative mt-3 max-w-md text-brand-100">{t.features.languageText}</p>
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

            {(Object.keys(FEATURE_ICONS) as (keyof typeof FEATURE_ICONS)[]).map((key) => (
              <FeatureCard key={key} icon={FEATURE_ICONS[key]} {...t.features.items[key]} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Comment ça marche ────────────────────────────────────────── */}
      <section className="px-6 py-24 md:px-12">
        <div className="mx-auto max-w-6xl">
          <SectionHeading {...t.steps.heading} />

          <ol className="stagger relative mt-16 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            <span
              aria-hidden="true"
              className="absolute left-[12.5%] right-[12.5%] top-7 hidden border-t-2 border-dashed border-brand-200 lg:block"
            />
            {t.steps.items.map((step, index) => {
              const Icon = STEP_ICONS[index];
              return (
                <li key={step.title} className="relative text-center">
                  <span className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-lift ring-1 ring-gray-200/80">
                    <Icon className="h-6 w-6" />
                    <span className="absolute -end-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white ring-4 ring-white">
                      {index + 1}
                    </span>
                  </span>
                  <h3 className="mt-5 text-lg font-semibold text-gray-900">{step.title}</h3>
                  <p className="mx-auto mt-2 max-w-60 text-sm leading-relaxed text-gray-600">
                    {step.description}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ── Profils ──────────────────────────────────────────────────── */}
      <section className="bg-gray-50 px-6 py-24 md:px-12">
        <div className="mx-auto max-w-6xl">
          <SectionHeading {...t.profiles.heading} />

          <div className="stagger mt-14 grid grid-cols-1 gap-5 md:grid-cols-2">
            {PROFILES.map((profile) => (
              <ProfileCard
                key={profile.key}
                icon={profile.icon}
                color={profile.color}
                {...t.profiles.items[profile.key]}
                stepsLabel={t.profiles.stepsLabel}
                seePacks={t.profiles.seePacks}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Appel final ──────────────────────────────────────────────── */}
      {/* Connecté, on ne propose plus de créer un compte : on ramène vers
          l'espace personnel. */}
      {session?.user ? (
        <WelcomeBack t={m} name={session.user.name?.split(" ")[0]} />
      ) : (
      <section className="px-6 py-20 md:px-12">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-r from-brand-900 via-brand-800 to-brand-700 px-8 py-16 text-center text-white shadow-glow rtl:bg-gradient-to-l md:px-16">
          <div aria-hidden="true" className="pointer-events-none absolute -end-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -start-16 h-72 w-72 rounded-full bg-sky-400/20 blur-3xl" />
          <h2 className="relative text-3xl font-bold md:text-4xl">{t.cta.title}</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-lg text-brand-100">{t.cta.text}</p>
          <div className="relative mt-9 flex flex-wrap justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 font-semibold text-brand-700 shadow-lg transition hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-700 active:scale-[0.97] motion-reduce:active:scale-100"
            >
              {t.cta.register}
              <ArrowRight className={forwardIcon} />
            </Link>
            <Link
              href="/nosPacks"
              className="inline-flex items-center rounded-xl bg-white/10 px-6 py-3.5 font-semibold text-white ring-1 ring-inset ring-white/30 transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-[0.97] motion-reduce:active:scale-100"
            >
              {t.cta.packs}
            </Link>
          </div>
        </div>
      </section>
      )}

      <AccueilChat />
    </div>
  );
}

/**
 * Aperçu de l'assistant : ce que l'utilisateur obtiendra, plutôt qu'une
 * illustration — dans sa propre langue.
 */
function HeroPreview({ t, lang }: { t: Messages["home"]["preview"]; lang: LangCode }) {
  return (
    <div className="relative mx-auto w-full max-w-lg animate-fade-up [animation-delay:120ms]">
      <div
        aria-hidden="true"
        className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-tr from-brand-400/30 via-indigo-400/20 to-sky-300/25 blur-2xl"
      />

      <figure
        aria-label={t.label}
        className="relative overflow-hidden rounded-3xl border border-gray-200/80 bg-white text-gray-900 shadow-lift"
      >
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <BrandMark size="sm" />
            <div>
              <p className="text-sm font-semibold text-gray-900">{t.assistant}</p>
              <p className="flex items-center gap-1.5 text-xs text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {t.online}
              </p>
            </div>
          </div>
          <div className="flex gap-1" aria-hidden="true">
            {LANGUAGES.map((language) => (
              <span
                key={language.code}
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  language.code === lang ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-500"
                }`}
              >
                {language.code.toUpperCase()}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-4 bg-gray-50/70 px-5 py-6">
          <div className="flex justify-end">
            <p className="max-w-[80%] rounded-2xl rounded-se-md bg-brand-600 px-4 py-2.5 text-sm text-white shadow-sm">
              {t.question}
            </p>
          </div>

          <div className="flex gap-2.5">
            <BrandMark size="sm" />
            <div className="max-w-[85%] rounded-2xl rounded-ss-md border border-gray-200/80 bg-white px-4 py-3 text-sm text-gray-700 shadow-xs">
              <p>{t.answer}</p>
              <ul className="mt-2.5 space-y-1.5">
                {t.items.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-500">
                <ScrollText className="h-3 w-3" />
                {t.source}
              </p>
            </div>
          </div>
        </div>
      </figure>

      <div className="animate-float absolute -bottom-7 -start-5 hidden items-center gap-3 rounded-2xl border border-gray-200/80 bg-white px-4 py-3 text-gray-900 shadow-lift sm:flex">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <FileCheck2 className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-gray-900">{t.verified}</p>
          <p className="text-xs text-gray-500">{t.verifiedDetail}</p>
        </div>
      </div>

      <div className="animate-float absolute -end-3 -top-5 hidden items-center gap-2 rounded-full border border-gray-200/80 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-lift [animation-delay:-3s] sm:flex">
        <Lock className="h-3.5 w-3.5 text-brand-600" />
        {t.encrypted}
      </div>
    </div>
  );
}

/**
 * À la place de l'invitation à créer un compte, pour qui est déjà connecté :
 * un accueil personnel et les trois endroits où l'on reprend ses démarches.
 */
function WelcomeBack({ t: m, name }: { t: Messages; name?: string }) {
  const t = m.home.welcomeBack;
  const shortcuts: { href: string; icon: LucideIcon; title: string; text: string }[] = [
    { href: "/dashboard", icon: LayoutGrid, title: m.nav.dashboard, text: t.dashboard },
    { href: "/myFolders", icon: FolderOpen, title: m.nav.folders, text: t.folders },
    { href: "/chatIa", icon: MessageSquare, title: m.assistantPage.title, text: t.assistant },
  ];

  return (
    <section className="px-6 py-20 md:px-12">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-r from-brand-900 via-brand-800 to-brand-700 px-8 py-12 text-white shadow-glow rtl:bg-gradient-to-l md:px-12">
        <div aria-hidden="true" className="pointer-events-none absolute -end-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -start-16 h-72 w-72 rounded-full bg-sky-400/20 blur-3xl" />

        <div className="relative grid grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-medium ring-1 ring-inset ring-white/20">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              {t.badge}
            </span>
            <h2 className="mt-5 text-3xl font-bold md:text-4xl">
              {name ? fmt(t.title, { name }) : t.titleNoName}
            </h2>
            <p className="mt-3 text-lg text-brand-100">{t.text}</p>
          </div>

          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {shortcuts.map(({ href, icon: Icon, title, text }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="group flex h-full flex-col rounded-2xl bg-white p-5 text-gray-900 shadow-lg transition duration-200 ease-out hover:-translate-y-1 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-700 motion-reduce:hover:translate-y-0"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="mt-4 font-semibold">{title}</span>
                  <span className="mt-1 flex-1 text-sm text-gray-500">{text}</span>
                  <ArrowRight className="mt-4 h-4 w-4 text-brand-600 transition-transform duration-200 group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
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

function ProfileCard({
  icon: Icon,
  color,
  title,
  description,
  steps,
  stepsLabel,
  seePacks,
}: {
  icon: LucideIcon;
  color: string;
  title: string;
  description: string;
  steps: readonly string[];
  stepsLabel: string;
  seePacks: string;
}) {
  return (
    <article className="group flex h-full flex-col rounded-3xl border border-gray-200/80 bg-white p-7 shadow-soft transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lift motion-reduce:hover:translate-y-0">
      <div className="flex items-center gap-4">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset ${color}`}>
          <Icon className="h-6 w-6" />
        </span>
        <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
      </div>

      <p className="mt-4 leading-relaxed text-gray-600">{description}</p>

      <ul className="mt-5 flex flex-wrap gap-2" aria-label={stepsLabel}>
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
        {seePacks}
        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
      </Link>
    </article>
  );
}
