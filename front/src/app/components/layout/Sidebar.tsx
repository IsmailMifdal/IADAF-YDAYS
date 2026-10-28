"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Home,
  Package,
  FileText,
  Folder,
  Upload,
  LayoutGrid,
  Settings,
  LogIn,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  type LucideIcon,
} from "lucide-react";

import { useLanguage } from "../../context/LanguageContext";
import type { Messages } from "../../i18n";
import { BrandLogo } from "../brand/BrandMark";
import LanguageSelector from "../ui/LanguageSelector";

type SidebarProps = {
  /** Desktop : rail d'icônes plutôt que sidebar étendue. */
  isCollapsed: boolean;
  /** Mobile : tiroir visible. */
  isDrawerOpen: boolean;
  onToggleCollapsed: () => void;
  /** Referme le tiroir mobile après une navigation. */
  onNavigate: () => void;
};

type MenuItem = {
  label: keyof Messages["nav"];
  href: string;
  icon: LucideIcon;
};

const menu: MenuItem[] = [
  { label: "home", href: "/", icon: Home },
  { label: "packs", href: "/nosPacks", icon: Package },
  { label: "procedures", href: "/procedures", icon: FileText },
  { label: "folders", href: "/myFolders", icon: Folder },
  { label: "documents", href: "/documents", icon: Upload },
  { label: "dashboard", href: "/dashboard", icon: LayoutGrid },
];

export default function Sidebar({
  isCollapsed,
  isDrawerOpen,
  onToggleCollapsed,
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname();
  const { m } = useLanguage();

  // Le repli ne concerne que le desktop : sur mobile le tiroir affiche toujours
  // les libellés, sinon l'utilisateur ouvrirait un panneau plein écran d'icônes
  // muettes.
  const labelClass = isCollapsed ? "lg:sr-only" : "";
  const rowClass = isCollapsed ? "lg:justify-center lg:px-0" : "";

  return (
    <aside
      id="sidebar-navigation"
      aria-label={m.nav.label}
      className={`fixed inset-y-0 start-0 z-40 flex w-64 flex-col overflow-y-auto overflow-x-hidden bg-brand-700 text-white
                  transition-transform duration-300 ease-out
                  lg:w-[var(--sidebar-w)] lg:transition-[width]
                  ${
                    // Tiroir fermé : hors de l'écran, côté « début » — à gauche
                    // en français, à droite en arabe. Seulement sous le format
                    // ordinateur, où la barre est toujours visible (une classe
                    // rtl: l'emportait sur lg:translate-x-0 et la cachait).
                    isDrawerOpen
                      ? "translate-x-0 shadow-2xl"
                      : "max-lg:-translate-x-full max-lg:rtl:translate-x-full"
                  }`}
    >
      {/* ── En-tête ─────────────────────────────────────────────── */}
      <div
        className={`flex h-16 shrink-0 items-center gap-1 border-b border-brand-600 px-3 ${
          isCollapsed ? "lg:justify-center lg:px-0" : "justify-between"
        }`}
      >
        <Link
          href="/"
          onClick={onNavigate}
          className={`flex min-w-0 items-center rounded-xl p-1 transition hover:bg-brand-600/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
            isCollapsed ? "lg:hidden" : ""
          }`}
        >
          <BrandLogo onDark />
        </Link>

        {/* Bascule rail / étendu — desktop uniquement. */}
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={isCollapsed ? m.nav.expand : m.nav.collapse}
          aria-expanded={!isCollapsed}
          aria-controls="sidebar-navigation"
          title={isCollapsed ? m.nav.expandShort : m.nav.collapseShort}
          className="hidden shrink-0 rounded-lg p-2 text-brand-100 transition hover:bg-brand-600 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 lg:block"
        >
          {isCollapsed ? (
            <PanelLeftOpen className="h-5 w-5 rtl:-scale-x-100" />
          ) : (
            <PanelLeftClose className="h-5 w-5 rtl:-scale-x-100" />
          )}
        </button>

        {/* Fermeture du tiroir — mobile uniquement. */}
        <button
          type="button"
          onClick={onNavigate}
          aria-label={m.nav.closeMenu}
          className="shrink-0 rounded-lg p-2 text-brand-100 transition hover:bg-brand-600 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* ── Navigation ──────────────────────────────────────────── */}
      <nav className="flex-1 space-y-1 p-3">
        <p className={`px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-brand-200 ${labelClass}`}>
          {m.nav.menu}
        </p>
        {menu.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={tooltipFor(m.nav[item.label], isCollapsed)}
              aria-current={isActive ? "page" : undefined}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${rowClass} ${
                isActive
                  ? "bg-brand-600 font-semibold text-white shadow-sm"
                  : "font-medium text-brand-100 hover:bg-brand-600/60 hover:text-white"
              }`}
            >
              {isActive && (
                <span aria-hidden="true" className="absolute inset-y-2 start-0 w-1 rounded-e-full bg-white" />
              )}
              <Icon
                className={`h-5 w-5 shrink-0 ${
                  isActive ? "text-white" : "text-brand-200 group-hover:text-white"
                }`}
              />
              <span className={`truncate ${labelClass}`}>{m.nav[item.label]}</span>
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 px-3 pb-2">
        <LanguageSelector variant="sidebar" collapsed={isCollapsed} />
      </div>

      <AccountPanel
        isCollapsed={isCollapsed}
        onNavigate={onNavigate}
        labelClass={labelClass}
        rowClass={rowClass}
      />
    </aside>
  );
}

/**
 * Libellé au survol en mode rail — sans lui, un rail d'icônes oblige à deviner
 * la destination.
 *
 * On s'appuie sur l'attribut `title` natif plutôt que sur une infobulle
 * maison : la sidebar est un conteneur `overflow-y-auto`, et en CSS un axe en
 * `auto` empêche l'autre d'être `visible`. Une infobulle positionnée hors du
 * panneau serait donc rognée — invisible précisément là où elle sert.
 */
function tooltipFor(label: string, isCollapsed: boolean): string | undefined {
  return isCollapsed ? label : undefined;
}

/** Pied de sidebar lié à la session : identité, paramètres, déconnexion. */
function AccountPanel({
  isCollapsed,
  onNavigate,
  labelClass,
  rowClass,
}: {
  isCollapsed: boolean;
  onNavigate: () => void;
  labelClass: string;
  rowClass: string;
}) {
  const { data: session, status } = useSession();
  const { m } = useLanguage();

  if (status === "loading") {
    return (
      <div className="mt-auto shrink-0 border-t border-brand-600 p-3">
        <div className="h-14 animate-pulse rounded-xl bg-brand-600/40" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="mt-auto shrink-0 border-t border-brand-600 p-3">
        <Link
          href="/login"
          onClick={onNavigate}
          title={tooltipFor(m.nav.signIn, isCollapsed)}
          className={`flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-brand-700 shadow-sm transition hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${rowClass}`}
        >
          <LogIn className="h-5 w-5 shrink-0 rtl:-scale-x-100" />
          <span className={labelClass}>{m.nav.signIn}</span>
        </Link>
      </div>
    );
  }

  const { name, email } = session.user;
  const initials = getInitials(name, email);

  return (
    <div className="mt-auto shrink-0 space-y-1 border-t border-brand-600 p-3">
      <div
        title={tooltipFor(name ?? email ?? m.nav.myAccount, isCollapsed)}
        className={`mb-2 flex items-center gap-3 rounded-xl bg-brand-600 p-2.5 ${rowClass}`}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm font-semibold text-white ring-2 ring-brand-400/40">
          {initials}
        </span>
        <span className={`min-w-0 ${labelClass}`}>
          <span className="block truncate text-sm font-semibold text-white">
            {name ?? m.nav.myAccount}
          </span>
          <span className="block truncate text-xs text-brand-200" dir="ltr">{email}</span>
        </span>
      </div>

      <Link
        href="/settings"
        onClick={onNavigate}
        title={tooltipFor(m.nav.settings, isCollapsed)}
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-brand-100 transition hover:bg-brand-600 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${rowClass}`}
      >
        <Settings className="h-5 w-5 shrink-0" />
        <span className={labelClass}>{m.nav.settings}</span>
      </Link>

      <button
        type="button"
        onClick={() => signOut({ redirectTo: "/" })}
        title={tooltipFor(m.nav.signOut, isCollapsed)}
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-start text-sm font-medium text-brand-100 transition hover:bg-brand-600 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${rowClass}`}
      >
        <LogOut className="h-5 w-5 shrink-0 rtl:-scale-x-100" />
        <span className={labelClass}>{m.nav.signOut}</span>
      </button>
    </div>
  );
}

/** Étiquette d'avatar à deux lettres, repli sur l'adresse si aucun nom. */
function getInitials(name?: string | null, email?: string | null): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    const letters =
      parts.length > 1
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`
        : parts[0].slice(0, 2);
    return letters.toUpperCase();
  }
  return (email?.slice(0, 2) ?? "??").toUpperCase();
}
