"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";

import { useLanguage } from "../../context/LanguageContext";
import { BrandLogo } from "../brand/BrandMark";
import LanguageSelector from "../ui/LanguageSelector";
import Sidebar from "./Sidebar";
import Footer from "./Footer";
import {
  SIDEBAR_COOKIE,
  SIDEBAR_WIDTH,
  type SidebarState,
} from "./sidebarPreference";

export default function AppShell({
  initialState,
  children,
}: {
  initialState: SidebarState;
  children: React.ReactNode;
}) {
  /** Desktop : sidebar étendue (256px) ou repliée en rail (72px). */
  const [isCollapsed, setIsCollapsed] = useState(initialState === "collapsed");
  /** Mobile : tiroir ouvert par-dessus le contenu. */
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { m } = useLanguage();

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((previous) => {
      const next = !previous;
      // Un an : c'est une préférence d'affichage, rien de sensible.
      document.cookie = `${SIDEBAR_COOKIE}=${
        next ? "collapsed" : "expanded"
      }; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  }, []);

  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  // Échap ferme le tiroir — attendu de toute surface modale.
  useEffect(() => {
    if (!isDrawerOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsDrawerOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawerOpen]);

  // Empêche la page de défiler derrière le tiroir ouvert.
  useEffect(() => {
    if (!isDrawerOpen) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isDrawerOpen]);

  return (
    <div
      className="min-h-screen bg-gray-50"
      // Largeur exposée en variable CSS : la sidebar et le décalage du contenu
      // lisent la même valeur, impossible qu'ils se désynchronisent.
      style={
        {
          "--sidebar-w": isCollapsed
            ? SIDEBAR_WIDTH.collapsed
            : SIDEBAR_WIDTH.expanded,
        } as React.CSSProperties
      }
    >
      <Sidebar
        isCollapsed={isCollapsed}
        isDrawerOpen={isDrawerOpen}
        onToggleCollapsed={toggleCollapsed}
        onNavigate={closeDrawer}
      />

      {/* Voile du tiroir mobile : monté en permanence pour pouvoir s'animer. */}
      <div
        onClick={closeDrawer}
        aria-hidden="true"
        className={`fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden ${
          isDrawerOpen
            ? "opacity-100"
            : "opacity-0 pointer-events-none"
        }`}
      />

      <div className="flex min-h-screen flex-col transition-[padding] duration-300 ease-out lg:ps-[var(--sidebar-w)]">
        {/* Barre mobile : porte l'ouverture du tiroir sans recouvrir le contenu,
            contrairement à un bouton flottant. */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-brand-800/40 bg-brand-700 px-4 text-white lg:hidden">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            aria-label={m.nav.openMenu}
            aria-expanded={isDrawerOpen}
            aria-controls="sidebar-navigation"
            className="-ms-1 rounded-lg p-2 transition hover:bg-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link href="/" className="rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
            <BrandLogo size="sm" tagline={false} onDark />
          </Link>

          <div className="ms-auto">
            <LanguageSelector variant="compact" />
          </div>
        </header>

        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
