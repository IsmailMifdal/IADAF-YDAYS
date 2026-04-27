import "./globals.css";
import { LanguageProvider } from "./context/LanguageContext";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="m-0 p-0 antialiased bg-slate-100">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
