import type { Metadata } from "next";

import { auth } from "../../../auth";
import PageHeader from "../../components/ui/PageHeader";
import { Alert, ButtonLink, PageContainer } from "../../components/ui/primitives";
import { ensurePackFolders, listFolders, type Folder } from "../../lib/demarches";
import { listUnlockedPacks } from "../../lib/entitlements";
import FoldersView from "./FoldersView";
import { getMessages } from "../../i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).folders.title };
}

export default async function MyFoldersPage() {
  const [session, m] = await Promise.all([auth(), getMessages()]);
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
        title={m.folders.title}
        subtitle={m.folders.subtitle}
        rightContent={
          <ButtonLink href="/procedures" variant="secondary">
            {m.folders.start}
          </ButtonLink>
        }
      />
      <PageContainer>
        {folders ? (
          <FoldersView folders={folders} />
        ) : (
          <Alert tone="danger">
            {m.folders.loadError}
          </Alert>
        )}
      </PageContainer>
    </div>
  );
}
