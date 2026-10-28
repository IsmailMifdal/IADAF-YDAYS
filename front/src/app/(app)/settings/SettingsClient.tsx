"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Lock, Receipt, Trash2, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import PageHeader from "../../components/ui/PageHeader";
import { Alert, type Account } from "./ui";
import { Card, Skeleton } from "../../components/ui/primitives";
import type { SectionId } from "./navigation";
import { useLanguage } from "../../context/LanguageContext";
import type { Messages } from "../../i18n";
import ProfileSection from "./sections/ProfileSection";
import PreferencesSection from "./sections/PreferencesSection";
import SecuritySection from "./sections/SecuritySection";
import PurchasesSection from "./sections/PurchasesSection";
import DangerZoneSection from "./sections/DangerZoneSection";

type NavLabel = keyof Messages["settings"]["nav"];

const SECTIONS: { id: SectionId; label: NavLabel; icon: LucideIcon }[] = [
  { id: "profil", label: "profile", icon: User },
  { id: "preferences", label: "preferences", icon: Globe },
  { id: "securite", label: "security", icon: Lock },
  { id: "achats", label: "purchases", icon: Receipt },
];

const DANGER_SECTION: { id: SectionId; label: NavLabel; icon: LucideIcon } = {
  id: "danger",
  label: "danger",
  icon: Trash2,
};

export default function SettingsClient({
  initialSection,
}: {
  initialSection: SectionId;
}) {
  const router = useRouter();
  const { m } = useLanguage();
  const [section, setSection] = useState<SectionId>(initialSection);
  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/account")
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? m.errors.profileLoadFailed);
          return;
        }
        setAccount(data as Account);
      })
      .catch(() => {
        if (!cancelled) setError(m.common.networkError);
      });

    return () => {
      cancelled = true;
    };
    // Chargé une fois : un changement de langue ne recharge pas le profil.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // L'onglet actif vit dans l'URL : la page reste partageable et le bouton
  // Retour du navigateur fonctionne comme attendu.
  const goToSection = useCallback(
    (next: SectionId) => {
      setSection(next);
      router.replace(`/settings?section=${next}`, { scroll: false });
    },
    [router],
  );

  return (
    <div>
      <PageHeader
        title={m.settings.title}
        subtitle={m.settings.subtitle}
      />

      <div className="bg-gray-50 min-h-screen px-4 md:px-8 py-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 items-start">
          <SectionNav current={section} onSelect={goToSection} />

          <div className="min-w-0">
            {error && <Alert tone="error">{error}</Alert>}

            {/* Squelette reprenant la forme du panneau à venir : la page ne
                saute pas quand les données arrivent. */}
            {!error && !account && (
              <Card className="p-6">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="mt-2 h-4 w-64" />
                <div className="mt-6 flex items-center gap-4">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <Skeleton className="mt-6 h-11 w-full" />
                <Skeleton className="mt-4 h-11 w-full" />
              </Card>
            )}

            {account && (
              <>
                {section === "profil" && (
                  <ProfileSection
                    account={account}
                    onAccountChange={setAccount}
                  />
                )}
                {section === "preferences" && <PreferencesSection />}
                {section === "securite" && <SecuritySection account={account} />}
                {section === "achats" && <PurchasesSection />}
                {section === "danger" && (
                  <DangerZoneSection account={account} />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionNav({
  current,
  onSelect,
}: {
  current: SectionId;
  onSelect: (section: SectionId) => void;
}) {
  const { m } = useLanguage();

  return (
    <nav
      aria-label={m.settings.navLabel}
      // Onglets latéraux sur grand écran, bande défilante sur mobile.
      className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible bg-white lg:bg-transparent border lg:border-0 border-gray-200 rounded-2xl p-1.5 lg:p-0"
    >
      {SECTIONS.map((item) => (
        <NavButton
          key={item.id}
          id={item.id}
          label={m.settings.nav[item.label]}
          icon={item.icon}
          isActive={current === item.id}
          onSelect={onSelect}
        />
      ))}

      <div
        className="hidden lg:block h-px bg-gray-200 my-2 mx-3"
        aria-hidden="true"
      />

      <NavButton
        id={DANGER_SECTION.id}
        label={m.settings.nav[DANGER_SECTION.label]}
        icon={DANGER_SECTION.icon}
        isActive={current === DANGER_SECTION.id}
        onSelect={onSelect}
        tone="danger"
      />
    </nav>
  );
}

function NavButton({
  id,
  label,
  icon: Icon,
  isActive,
  onSelect,
  tone = "neutral",
}: {
  id: SectionId;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  onSelect: (section: SectionId) => void;
  tone?: "neutral" | "danger";
}) {
  const activeClass =
    tone === "danger"
      ? "bg-red-50 text-red-700 font-medium"
      : "bg-brand-50 text-brand-700 font-medium";
  const idleClass =
    tone === "danger"
      ? "text-red-600 hover:bg-red-50"
      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900";

  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      aria-current={isActive ? "page" : undefined}
      className={`flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm text-start transition duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 active:scale-[0.97] motion-reduce:active:scale-100 ${
        isActive ? activeClass : idleClass
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {label}
    </button>
  );
}
