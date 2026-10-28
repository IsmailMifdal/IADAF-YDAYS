import type { Metadata } from "next";
import Link from "next/link";
import {
  Check,
  HeartPulse,
  House,
  IdCard,
  Package,
  Receipt,
  Sparkles,
} from "lucide-react";

import { auth } from "../../../auth";
import type { LangCode } from "../../context/languages";
import type { Messages } from "../../i18n";
import { getLang, getMessages } from "../../i18n/server";
import { listUnlockedPacks } from "../../lib/entitlements";
import PageHeader from "../../components/ui/PageHeader";
import {
  Badge,
  ButtonLink,
  Card,
  PageContainer,
} from "../../components/ui/primitives";
import {
  ALL_ACCESS_SLUG,
  formatPrice,
  localizedPack,
  packs,
  type PackColor,
  type PackData,
  type PackIconKey,
} from "../packs/packsData";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).packs.title };
}

const iconByKey: Record<
  PackIconKey,
  React.ComponentType<{ className?: string }>
> = {
  "id-card": IdCard,
  "heart-pulse": HeartPulse,
  house: House,
  receipt: Receipt,
  package: Package,
};

/** Accent coloré par pack — seule variation admise, le reste est unifié. */
const accentByColor: Record<PackColor, { bar: string; icon: string }> = {
  blue: { bar: "bg-brand-600", icon: "bg-brand-50 text-brand-600" },
  green: { bar: "bg-emerald-600", icon: "bg-emerald-50 text-emerald-600" },
  orange: { bar: "bg-orange-500", icon: "bg-orange-50 text-orange-600" },
  violet: { bar: "bg-violet-600", icon: "bg-violet-50 text-violet-600" },
  yellow: { bar: "bg-amber-500", icon: "bg-amber-50 text-amber-600" },
};

export default async function NosPacksPage() {
  const [session, m, lang] = await Promise.all([auth(), getMessages(), getLang()]);

  // Lu côté serveur : la mention « Acheté » est correcte dès le premier rendu,
  // sans le clignotement d'un chargement client.
  const unlocked = session?.user?.id
    ? await listUnlockedPacks(session.user.id)
    : [];

  const catalog = packs.map((pack) => localizedPack(m, pack));
  const standardPacks = catalog.filter((pack) => pack.slug !== ALL_ACCESS_SLUG);
  const allAccessPack = catalog.find((pack) => pack.slug === ALL_ACCESS_SLUG);

  return (
    <div>
      <PageHeader title={m.packs.title} subtitle={m.packs.subtitle} />

      <PageContainer width="wide">
        <div className="space-y-8">
          <div className="stagger grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            {standardPacks.map((pack) => (
              <PackCard
                key={pack.slug}
                pack={pack}
                isUnlocked={unlocked.includes(pack.slug)}
                m={m}
                lang={lang}
              />
            ))}
          </div>

          {allAccessPack && (
            <AllAccessCard
              pack={allAccessPack}
              included={standardPacks}
              isUnlocked={unlocked.includes(allAccessPack.slug)}
              m={m}
              lang={lang}
            />
          )}

          <p className="text-center text-sm text-gray-500">{m.packs.securePayment}</p>
        </div>
      </PageContainer>
    </div>
  );
}

function PackCard({
  pack,
  isUnlocked,
  m,
  lang,
}: {
  pack: PackData;
  isUnlocked: boolean;
  m: Messages;
  lang: LangCode;
}) {
  const accent = accentByColor[pack.color];
  const Icon = iconByKey[pack.icon];

  return (
    <Card interactive className="relative flex h-full flex-col overflow-hidden">
      <span className={`absolute inset-x-0 top-0 h-1 ${accent.bar}`} />

      <div className="flex flex-1 flex-col p-6 pt-7">
        <div className="flex items-start justify-between gap-2">
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-xl ${accent.icon}`}
          >
            <Icon className="h-5 w-5" />
          </span>
          {isUnlocked && <Badge tone="success">{m.packs.bought}</Badge>}
        </div>

        <h2 className="mt-4 font-semibold text-gray-900">{pack.title}</h2>
        <p className="mt-1 text-sm text-gray-500">{pack.shortDescription}</p>

        <p className="mt-5 text-4xl font-extrabold tracking-tight text-gray-900">
          {formatPrice(pack.priceCents, lang)}
        </p>
        <p className="text-xs text-gray-400">{m.common.oneTimePayment}</p>

        <ul className="mt-5 flex-1 space-y-2.5">
          {pack.description.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6">
          <ButtonLink
            href={isUnlocked ? `/packs/${pack.slug}` : `/payment/${pack.slug}`}
            variant={isUnlocked ? "secondary" : "primary"}
            fullWidth
          >
            {isUnlocked ? m.packs.openPack : m.packs.choose}
          </ButtonLink>
        </div>
      </div>
    </Card>
  );
}

/** Le pack tout-en-un mérite sa propre bande : il débloque tous les autres. */
function AllAccessCard({
  pack,
  included,
  isUnlocked,
  m,
  lang,
}: {
  pack: PackData;
  included: PackData[];
  isUnlocked: boolean;
  m: Messages;
  lang: LangCode;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-900 via-brand-800 to-brand-700 text-white shadow-glow">
      <div className="pointer-events-none absolute -end-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 start-1/3 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl" />

      <div className="relative flex flex-col gap-6 p-7 md:flex-row md:items-center md:justify-between md:p-9">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1 text-xs font-semibold text-amber-950">
            <Sparkles className="h-3.5 w-3.5" />
            {m.packs.bestChoice}
          </span>

          <h2 className="mt-3 text-2xl font-bold">{pack.title}</h2>
          <p className="mt-1.5 max-w-xl text-brand-100">
            {pack.shortDescription} {m.packs.allIncluded}
          </p>

          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
            {included.map((p) => (
              <li
                key={p.slug}
                className="flex items-center gap-1.5 text-sm text-brand-100"
              >
                <Check className="h-4 w-4 shrink-0 text-emerald-300" />
                {p.title}
              </li>
            ))}
          </ul>
        </div>

        <div className="shrink-0 text-start md:text-end">
          {isUnlocked ? (
            <Badge tone="success">{m.packs.bought}</Badge>
          ) : (
            <>
              <p className="text-4xl font-bold">
                {formatPrice(pack.priceCents, lang)}
              </p>
              <p className="text-sm text-brand-200">
                {m.packs.insteadOf}{" "}
                {formatPrice(
                  included.reduce((sum, p) => sum + p.priceCents, 0),
                  lang,
                )}
              </p>
            </>
          )}

          <div className="mt-4">
            <Link
              href={isUnlocked ? `/packs/${pack.slug}` : `/payment/${pack.slug}`}
              className="inline-flex w-full items-center justify-center rounded-xl bg-white px-6 py-3 font-semibold text-brand-700 shadow-lg transition hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-700 active:scale-[0.97] motion-reduce:active:scale-100 md:w-auto"
            >
              {isUnlocked ? m.packs.openPack : m.packs.unlockAll}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
