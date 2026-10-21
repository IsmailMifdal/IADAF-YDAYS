import { FileCheck2, Languages, Lock, ScrollText, type LucideIcon } from "lucide-react";

import { LANGUAGES } from "../context/languages";

const PROMISES: { icon: LucideIcon; text: string }[] = [
  {
    icon: Languages,
    text: `Un assistant en ${LANGUAGES.length} langues : ${LANGUAGES.map((language) => language.label).join(", ")}`,
  },
  { icon: ScrollText, text: "Des réponses appuyées sur les fiches de service-public.gouv.fr" },
  { icon: FileCheck2, text: "Vos pièces vérifiées avant le dépôt de votre dossier" },
  { icon: Lock, text: "Pièces chiffrées, compte supprimable à tout moment" },
];

// « Bonjour » dans chacune des langues proposées, dans le même ordre.
const GREETINGS: Record<string, string> = {
  fr: "Bonjour",
  en: "Hello",
  ar: "مرحبا",
  es: "Hola",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[1fr_1.05fr]">
      <main className="relative flex items-center justify-center overflow-hidden px-4 py-12 sm:px-8">
        <div aria-hidden="true" className="bg-glow pointer-events-none absolute inset-0 lg:hidden" />
        <div className="relative flex w-full justify-center">{children}</div>
      </main>

      {/* Panneau de marque, à partir de l'écran d'ordinateur : il rappelle ce
          que l'on gagne à créer son compte, sans allonger la page mobile. */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 p-12 text-white lg:flex lg:flex-col lg:justify-center xl:p-16">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-sky-400/20 blur-3xl" />

        <div className="relative max-w-lg">
          <ul className="flex flex-wrap gap-2" aria-hidden="true">
            {LANGUAGES.map((language) => (
              <li
                key={language.code}
                lang={language.code}
                className="rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-semibold ring-1 ring-inset ring-white/20"
              >
                {GREETINGS[language.code] ?? language.label}
              </li>
            ))}
          </ul>

          <h2 className="mt-8 text-4xl font-extrabold leading-tight tracking-tight xl:text-5xl">
            Vos démarches,
            <br />
            dans votre langue.
          </h2>
          <p className="mt-4 text-lg text-brand-100">
            Un espace pour comprendre, préparer et réussir vos démarches
            administratives en France.
          </p>

          <ul className="mt-10 space-y-4">
            {PROMISES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-inset ring-white/20">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="pt-1.5 text-brand-50">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
