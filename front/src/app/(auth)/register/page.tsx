import type { Metadata } from "next";
import RegisterForm from "./RegisterForm";

export const metadata: Metadata = {
  title: "Créer un compte — IA-DAF",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
