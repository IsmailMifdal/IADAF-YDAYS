import type { Metadata } from "next";

import ResetPasswordForm from "./ResetPasswordForm";

export const metadata: Metadata = {
  title: "Nouveau mot de passe",
  // The URL carries a live reset token: keep it out of the Referer sent to any
  // third-party resource the page might load.
  referrer: "no-referrer",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <ResetPasswordForm token={token ?? ""} />;
}
