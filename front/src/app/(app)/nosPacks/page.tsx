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
  packs,
  type PackColor,
  type PackData,
  type PackIconKey,
} from "../packs/packsData";

export const metadata: Metadata = { title: "Nos packs" };

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
  blue: { bar: "bg-blue-600", icon: "bg-blue-50 text-blue-600" },
  green: { bar: "bg-emerald-600", icon: "bg-emerald-50 text-emerald-600" },
  orange: { bar: "bg-orange-500", icon: "bg-orange-50 text-orange-600" },
  violet: { bar: "bg-violet-600", icon: "bg-violet-50 text-violet-600" },
  yellow: { bar: "bg-amber-500", icon: "bg-amber-50 text-amber-600" },
};

export default async function NosPacksPage() {
  const session = await auth();

  // Lu côté serveur : la mention « Acheté » est correcte dès le premier rendu,
  // sans le clignotement d'un chargement client.
  const unlocked = session?.user?.id
    ? await listUnlockedPacks(session.user.id)
    : [];

  const standardPacks = packs.filter((pack) => pack.slug !== ALL_ACCESS_SLUG);
  const allAccessPack = packs.find((pack) => pack.slug === ALL_ACCESS_SLUG);

  return (
    <div>
      <PageHeader
        title="Nos packs"
        subtitle="Un accompagnement pas à pas pour chaque démarche : checklist personnalisée, vérification des pièces et assistant IA dédié."
      />

      <PageContainer width="wide">
        <div className="space-y-8">
          <div className="stagger grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            {standardPacks.map((pack) => (
              <PackCard
                key={pack.slug}
                pack={pack}
                isUnlocked={unlocked.includes(pack.slug)}
              />
            ))}
          </div>

          {allAccessPack && (
            <AllAccessCard
              pack={allAccessPack}
              isUnlocked={unlocked.includes(allAccessPack.slug)}
            />
          )}

          <p className="text-center text-sm text-gray-500">
            Paiement sécurisé par Stripe. Accès immédiat après confirmation.
          </p>
        </div>
      </PageContainer>
    </div>
  );
}

function PackCard({
  pack,
  isUnlocked,
}: {
  pack: PackData;
  isUnlocked: boolean;
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
          {isUnlocked && <Badge tone="success">Acheté</Badge>}
        </div>

        <h2 className="mt-4 font-semibold text-gray-900">{pack.title}</h2>
        <p className="mt-1 text-sm text-gray-500">{pack.shortDescription}</p>

        <p className="mt-5 text-3xl font-bold text-gray-900">
          {formatPrice(pack.priceCents)}
        </p>
        <p className="text-xs text-gray-400">paiement unique</p>

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
            {isUnlocked ? "Accéder au pack" : "Choisir ce pack"}
          </ButtonLink>
        </div>
      </div>
    </Card>
  );
}

/** Le pack tout-en-un mérite sa propre bande : il débloque tous les autres. */
function AllAccessCard({
  pack,
  isUnlocked,
}: {
  pack: PackData;
  isUnlocked: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 text-white shadow-sm">
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />

      <div className="relative flex flex-col gap-6 p-7 md:flex-row md:items-center md:justify-between md:p-9">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1 text-xs font-semibold text-amber-950">
            <Sparkles className="h-3.5 w-3.5" />
            Meilleur choix
          </span>

          <h2 className="mt-3 text-2xl font-bold">{pack.title}</h2>
          <p className="mt-1.5 max-w-xl text-blue-100">
            {pack.shortDescription} Toutes les démarches ci-dessus sont incluses.
          </p>

          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
            {packs
              .filter((p) => p.slug !== pack.slug)
              .map((p) => (
                <li
                  key={p.slug}
                  className="flex items-center gap-1.5 text-sm text-blue-100"
                >
                  <Check className="h-4 w-4 shrink-0 text-emerald-300" />
                  {p.title}
                </li>
              ))}
          </ul>
        </div>

        <div className="shrink-0 text-left md:text-right">
          {isUnlocked ? (
            <Badge tone="success">Acheté</Badge>
          ) : (
            <>
              <p className="text-4xl font-bold">
                {formatPrice(pack.priceCents)}
              </p>
              <p className="text-sm text-blue-200">au lieu de {formatPrice(
                packs
                  .filter((p) => p.slug !== pack.slug)
                  .reduce((sum, p) => sum + p.priceCents, 0),
              )}</p>
            </>
          )}

          <div className="mt-4">
            <Link
              href={isUnlocked ? `/packs/${pack.slug}` : `/payment/${pack.slug}`}
              className="inline-flex w-full items-center justify-center rounded-xl bg-white px-6 py-3 font-semibold text-blue-800 transition hover:bg-blue-50 md:w-auto"
            >
              {isUnlocked ? "Accéder au pack" : "Tout débloquer"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
