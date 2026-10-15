import type { Metadata } from "next";

import { auth } from "../../../auth";
import PageHeader from "../../components/ui/PageHeader";
import { Alert, ButtonLink, PageContainer } from "../../components/ui/primitives";
import { ensurePackFolders, listFolders, type Folder } from "../../lib/demarches";
import { listUnlockedPacks } from "../../lib/entitlements";
import FoldersView from "./FoldersView";

export const metadata: Metadata = { title: "Mes dossiers" };

export default async function MyFoldersPage() {
  const session = await auth();
  // Protected by the proxy; this only guards the queries below.
  const userId = session?.user?.id;

  let folders: Folder[] | null = null;
  if (userId) {
    try {
      // Every unlocked pack gets its folder, even if the service was down
      // when it was bought.
      await ensurePackFolders(userId, await listUnlockedPacks(userId));
      folders = await listFolders(userId);
    } catch (error) {
      console.error("[myFolders] could not load folders", error);
    }
  }

  return (
    <div>
      <PageHeader
        title="Mes Dossiers"
        subtitle="Suivez l’avancement de toutes vos démarches en cours."
        rightContent={
          <ButtonLink href="/procedures" variant="secondary">
            Démarrer une démarche
          </ButtonLink>
        }
      />
      <PageContainer>
        {folders ? (
          <FoldersView folders={folders} />
        ) : (
          <Alert tone="danger">
            Impossible de charger vos dossiers pour le moment. Réessayez dans
            quelques instants.
          </Alert>
        )}
      </PageContainer>
    </div>
  );
}
