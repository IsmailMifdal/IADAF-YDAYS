import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="m-0 p-0 antialiased bg-slate-100">{children}</body>
    </html>
  );
}
