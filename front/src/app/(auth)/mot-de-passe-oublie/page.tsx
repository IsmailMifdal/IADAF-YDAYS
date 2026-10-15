import type { Metadata } from "next";

import ForgotPasswordForm from "./ForgotPasswordForm";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
