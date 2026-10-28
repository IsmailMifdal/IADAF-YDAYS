import type { Metadata } from "next";

import PageHeader from "../../components/ui/PageHeader";
import { PageContainer } from "../../components/ui/primitives";
import UnsubscribeForm from "./UnsubscribeForm";
import { getMessages } from "../../i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).unsubscribe.title };
}

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const [{ token }, m] = await Promise.all([searchParams, getMessages()]);

  return (
    <div>
      <PageHeader
        title={m.unsubscribe.title}
        subtitle={m.unsubscribe.subtitle}
      />
      <PageContainer width="narrow">
        <UnsubscribeForm token={token ?? ""} />
      </PageContainer>
    </div>
  );
}
