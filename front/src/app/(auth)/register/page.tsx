import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "../../../auth";
import RegisterForm from "./RegisterForm";
import { getMessages } from "../../i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).auth.register.title };
}

export default async function RegisterPage() {
  // Déjà connecté : un second compte n'a pas lieu d'être, retour à son espace.
  if ((await auth())?.user) redirect("/dashboard");
  return <RegisterForm />;
}
