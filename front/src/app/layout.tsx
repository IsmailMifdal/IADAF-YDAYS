import type { Metadata } from "next";
import { cookies } from "next/headers";
import { SessionProvider } from "next-auth/react";
import "./globals.css";
import { LanguageProvider } from "./context/LanguageContext";
import { ToastProvider } from "./components/ui/Toast";
import { isLangCode, LANG_COOKIE } from "./context/languages";

export const metadata: Metadata = {
  title: {
    default: "IA-DAF — Assistant pour vos démarches administratives",
    template: "%s — IA-DAF",
  },
  description:
    "Assistant IA multilingue qui simplifie vos démarches administratives françaises : titre de séjour, CAF, CPAM, impôts et plus encore.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const stored = (await cookies()).get(LANG_COOKIE)?.value;
  const initialLang = isLangCode(stored) ? stored : "fr";

  return (
    <html lang={initialLang}>
      <body className="m-0 p-0 antialiased bg-slate-100">
        <SessionProvider>
          <LanguageProvider initialLang={initialLang}>
            <ToastProvider>{children}</ToastProvider>
          </LanguageProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
