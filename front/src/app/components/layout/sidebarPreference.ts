/**
 * Préférence de repli de la sidebar.
 *
 * Module sans `"use client"` : le layout serveur lit le cookie pour rendre la
 * bonne largeur dès le premier octet. Sans cela, la sidebar s'afficherait
 * toujours étendue avant qu'un effet client ne la replie — un saut visible à
 * chaque chargement.
 */

export const SIDEBAR_COOKIE = "iadaf_sidebar";

export type SidebarState = "expanded" | "collapsed";

export function isSidebarState(value: string | undefined): value is SidebarState {
  return value === "expanded" || value === "collapsed";
}

/** Largeurs partagées entre la sidebar et le décalage du contenu. */
export const SIDEBAR_WIDTH = {
  expanded: "16rem", // 256px
  collapsed: "4.5rem", // 72px — assez pour une icône centrée et sa zone de clic
} as const;
