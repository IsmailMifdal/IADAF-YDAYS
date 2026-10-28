import { FileCheck2, Languages, Lock, ScrollText, type LucideIcon } from "lucide-react";

import LanguageSelector from "../components/ui/LanguageSelector";
import { LANGUAGES } from "../context/languages";
import { fmt } from "../i18n";
import { getMessages } from "../i18n/server";

// « Bonjour » dans chacune des langues proposées, chacun dans sa langue.
const GREETINGS: Record<string, string> = {
  fr: "Bonjour",
  en: "Hello",
  ar: "مرحبا",
  es: "Hola",
};

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { auth: t } = await getMessages();

  const promises: { icon: LucideIcon; text: string }[] = [
    {
      icon: Languages,
      text: fmt(t.aside.languages, {
        count: LANGUAGES.length,
        list: LANGUAGES.map((language) => language.label).join(", "),
      }),
    },
    { icon: ScrollText, text: t.aside.sourced },
    { icon: FileCheck2, text: t.aside.checked },
    { icon: Lock, text: t.aside.privacy },
  ];

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[1fr_1.05fr]">
      <main className="relative flex items-center justify-center overflow-hidden px-4 py-16 sm:px-8">
        <div aria-hidden="true" className="bg-glow pointer-events-none absolute inset-0 lg:hidden" />
        {/* Choisir sa langue doit être possible avant de se connecter. */}
        <div className="absolute end-4 top-4 z-10">
          <LanguageSelector />
        </div>
        <div className="relative flex w-full justify-center">{children}</div>
      </main>

      {/* Panneau de marque, à partir de l'écran d'ordinateur : il rappelle ce
          que l'on gagne à créer son compte, sans allonger la page mobile. */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 p-12 text-white lg:flex lg:flex-col lg:justify-center xl:p-16">
        <div aria-hidden="true" className="pointer-events-none absolute -end-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -start-20 h-96 w-96 rounded-full bg-sky-400/20 blur-3xl" />

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
            {t.aside.titleStart}
            <br />
            {t.aside.titleEnd}
          </h2>
          <p className="mt-4 text-lg text-brand-100">{t.aside.text}</p>

          <ul className="mt-10 space-y-4">
            {promises.map(({ icon: Icon, text }) => (
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
