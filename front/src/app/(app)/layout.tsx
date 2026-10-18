import { cookies } from "next/headers";

import AppShell from "../components/layout/AppShell";
import {
  isSidebarState,
  SIDEBAR_COOKIE,
} from "../components/layout/sidebarPreference";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Lu côté serveur : la sidebar est rendue à la bonne largeur dès le premier
  // octet, sans le saut qu'entraînerait un repli appliqué après hydratation.
  const stored = (await cookies()).get(SIDEBAR_COOKIE)?.value;

  return (
    <AppShell initialState={isSidebarState(stored) ? stored : "expanded"}>
      {children}
    </AppShell>
  );
}
