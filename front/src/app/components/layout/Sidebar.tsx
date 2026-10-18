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
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";

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
  label: string;
  href: string;
  icon: LucideIcon;
};

const menu: MenuItem[] = [
  { label: "Accueil", href: "/", icon: Home },
  { label: "Nos packs", href: "/nosPacks", icon: Package },
  { label: "Démarches", href: "/procedures", icon: FileText },
  { label: "Mes Dossiers", href: "/myFolders", icon: Folder },
  { label: "Documents", href: "/documents", icon: Upload },
  { label: "Tableau de bord", href: "/dashboard", icon: LayoutGrid },
];

export default function Sidebar({
  isCollapsed,
  isDrawerOpen,
  onToggleCollapsed,
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname();

  // Le repli ne concerne que le desktop : sur mobile le tiroir affiche toujours
  // les libellés, sinon l'utilisateur ouvrirait un panneau plein écran d'icônes
  // muettes.
  const labelClass = isCollapsed ? "lg:sr-only" : "";
  const rowClass = isCollapsed ? "lg:justify-center lg:px-0" : "";

  return (
    <aside
      id="sidebar-navigation"
      aria-label="Navigation principale"
      className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col overflow-y-auto overflow-x-hidden bg-blue-700 text-white
                  transition-transform duration-300 ease-out
                  lg:w-[var(--sidebar-w)] lg:translate-x-0 lg:transition-[width]
                  ${isDrawerOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`}
    >
      {/* ── En-tête ─────────────────────────────────────────────── */}
      <div
        className={`flex shrink-0 items-center gap-2 border-b border-blue-600 p-4 ${
          isCollapsed ? "lg:justify-center lg:px-0" : "justify-between"
        }`}
      >
        <Link
          href="/"
          onClick={onNavigate}
          className={`flex min-w-0 items-center gap-2.5 rounded-lg p-1 transition hover:bg-blue-600/60 ${
            isCollapsed ? "lg:hidden" : ""
          }`}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-semibold leading-tight">
              IA-DAF
            </span>
            <span className="block truncate text-xs text-blue-200">
              Assistant Administratif
            </span>
          </span>
        </Link>

        {/* Bascule rail / étendu — desktop uniquement. */}
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={
            isCollapsed ? "Déplier la navigation" : "Replier la navigation"
          }
          aria-expanded={!isCollapsed}
          aria-controls="sidebar-navigation"
          title={isCollapsed ? "Déplier" : "Replier"}
          className="hidden shrink-0 rounded-lg p-2 transition hover:bg-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 lg:block"
        >
          {isCollapsed ? (
            <PanelLeftOpen className="h-5 w-5" />
          ) : (
            <PanelLeftClose className="h-5 w-5" />
          )}
        </button>

        {/* Fermeture du tiroir — mobile uniquement. */}
        <button
          type="button"
          onClick={onNavigate}
          aria-label="Fermer le menu"
          className="shrink-0 rounded-lg p-2 transition hover:bg-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* ── Navigation ──────────────────────────────────────────── */}
      <nav className="flex-1 space-y-1 p-3">
        {menu.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={tooltipFor(item.label, isCollapsed)}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${rowClass} ${
                isActive
                  ? "bg-blue-600 font-medium text-white"
                  : "text-blue-100 hover:bg-blue-600/60 hover:text-white"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className={`truncate ${labelClass}`}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

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

  if (status === "loading") {
    return (
      <div className="mt-auto shrink-0 border-t border-blue-600 p-3">
        <div className="h-14 animate-pulse rounded-lg bg-blue-600/40" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="mt-auto shrink-0 border-t border-blue-600 p-3">
        <Link
          href="/login"
          onClick={onNavigate}
          title={tooltipFor("Se connecter", isCollapsed)}
          className={`flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 font-medium transition hover:bg-blue-500 ${rowClass}`}
        >
          <LogIn className="h-5 w-5 shrink-0" />
          <span className={labelClass}>Se connecter</span>
        </Link>
      </div>
    );
  }

  const { name, email } = session.user;
  const initials = getInitials(name, email);

  return (
    <div className="mt-auto shrink-0 space-y-2 border-t border-blue-600 p-3">
      <div
        title={tooltipFor(name ?? email ?? "Mon compte", isCollapsed)}
        className={`flex items-center gap-3 rounded-lg bg-blue-600 p-2.5 ${rowClass}`}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500 text-sm font-semibold">
          {initials}
        </span>
        <span className={`min-w-0 ${labelClass}`}>
          <span className="block truncate text-sm font-semibold">
            {name ?? "Mon compte"}
          </span>
          <span className="block truncate text-xs text-blue-200">{email}</span>
        </span>
      </div>

      <Link
        href="/settings"
        onClick={onNavigate}
        title={tooltipFor("Paramètres", isCollapsed)}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-blue-100 transition hover:bg-blue-600 hover:text-white ${rowClass}`}
      >
        <Settings className="h-5 w-5 shrink-0" />
        <span className={labelClass}>Paramètres</span>
      </Link>

      <button
        type="button"
        onClick={() => signOut({ redirectTo: "/" })}
        title={tooltipFor("Déconnexion", isCollapsed)}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-blue-100 transition hover:bg-blue-600 hover:text-white ${rowClass}`}
      >
        <LogOut className="h-5 w-5 shrink-0" />
        <span className={labelClass}>Déconnexion</span>
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
