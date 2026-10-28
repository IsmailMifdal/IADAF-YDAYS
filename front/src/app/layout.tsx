import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, Inter } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import "./globals.css";
import { LanguageProvider } from "./context/LanguageContext";
import { ToastProvider } from "./components/ui/Toast";
import ServiceWorker from "./components/ServiceWorker";
import { dirOf } from "./context/languages";
import { getDictionary, getLang, getMessages } from "./i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const m = await getMessages();
  return {
    title: { default: m.meta.title, template: "%s — IA-DAF" },
    description: m.meta.description,
    // Installed on an iPhone home screen: full screen, under this name.
    appleWebApp: { capable: true, title: "IA-DAF", statusBarStyle: "default" },
  };
}

export const viewport: Viewport = {
  themeColor: "#2563eb",
};

// Téléchargées au build et servies par le site lui-même : aucune requête vers
// Google à l'exécution, ce que la CSP (font-src 'self') impose de toute façon.
// Inter plutôt qu'une police plus « ronde » : ses virgules et ses points
// restent collés au mot même en très grand (Plus Jakarta Sans les écartait,
// « démarches , »), et elle se lit bien en seconde langue.
const latin = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-latin",
  display: "swap",
});
const arabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang = await getLang();

  return (
    <html lang={lang} dir={dirOf(lang)} className={`${latin.variable} ${arabic.variable}`}>
      <body className="m-0 p-0 font-sans antialiased bg-gray-50 text-gray-900">
        <SessionProvider>
          <LanguageProvider lang={lang} messages={getDictionary(lang)}>
            <ToastProvider>{children}</ToastProvider>
          </LanguageProvider>
        </SessionProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
