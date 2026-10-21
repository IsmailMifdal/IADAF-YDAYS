import { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  subtitle: string;
  /** Actions alignées à droite du titre (boutons, sélecteurs…). */
  rightContent?: ReactNode;
  className?: string;
};

/**
 * Bandeau de tête commun à toutes les pages de l'application.
 *
 * Clair, avec un halo de marque : le titre reste le premier repère sans le
 * poids d'un aplat sombre, qui écrasait le contenu juste en dessous.
 *
 * Les gouttières suivent celles de PageContainer (`px-4 md:px-8`) : sans cela,
 * le titre et le contenu de la page n'étaient pas alignés verticalement.
 */
export default function PageHeader({
  title,
  subtitle,
  rightContent,
  className = "",
}: PageHeaderProps) {
  return (
    <header
      className={`relative overflow-hidden border-b border-gray-200/70 bg-white px-4 md:px-8 py-8 md:py-10 ${className}`}
    >
      <div aria-hidden="true" className="bg-glow pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="bg-dots pointer-events-none absolute inset-0 opacity-60" />

      <div className="relative max-w-6xl mx-auto flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
            {title}
          </h1>
          <p className="text-gray-600 mt-2 text-sm md:text-base max-w-2xl">{subtitle}</p>
        </div>

        {rightContent && <div className="shrink-0">{rightContent}</div>}
      </div>
    </header>
  );
}
