import type { Metadata } from "next";

import ForgotPasswordForm from "./ForgotPasswordForm";
import { getMessages } from "../../i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).auth.forgot.title };
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
