import type { Metadata } from "next";

import SettingsClient from "./SettingsClient";
import { DEFAULT_SECTION, isSectionId } from "./navigation";

export const metadata: Metadata = {
  title: "Paramètres",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const { section } = await searchParams;

  // Lu côté serveur plutôt qu'avec useSearchParams : évite d'envelopper la page
  // dans un Suspense et permet d'ouvrir directement un onglet par son URL.
  return (
    <SettingsClient
      initialSection={isSectionId(section) ? section : DEFAULT_SECTION}
    />
  );
}
