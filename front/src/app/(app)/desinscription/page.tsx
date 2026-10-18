import type { Metadata } from "next";

import PageHeader from "../../components/ui/PageHeader";
import { PageContainer } from "../../components/ui/primitives";
import UnsubscribeForm from "./UnsubscribeForm";

export const metadata: Metadata = { title: "Désinscription" };

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div>
      <PageHeader
        title="Désinscription"
        subtitle="Ne plus recevoir d’e-mails d’IA-DAF."
      />
      <PageContainer width="narrow">
        <UnsubscribeForm token={token ?? ""} />
      </PageContainer>
    </div>
  );
}
