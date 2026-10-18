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
      className={`bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 text-white px-4 md:px-8 py-8 md:py-10 ${className}`}
    >
      <div className="max-w-6xl mx-auto flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {title}
          </h1>
          <p className="text-blue-100 mt-2 text-sm max-w-2xl">{subtitle}</p>
        </div>

        {rightContent && <div className="shrink-0">{rightContent}</div>}
      </div>
    </header>
  );
}
