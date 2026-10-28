import { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  subtitle: string;
  /** Actions alignées à droite du titre (boutons, sélecteurs…). */
  rightContent?: ReactNode;
  className?: string;
};

/**
 * Bandeau de tête commun à toutes les pages de l'application, dans le bleu
 * d'IA-DAF (celui du drapeau français).
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
      className={`relative overflow-hidden bg-gradient-to-r from-brand-900 via-brand-800 to-brand-700 text-white rtl:bg-gradient-to-l px-4 md:px-8 py-8 md:py-10 ${className}`}
    >
      <div aria-hidden="true" className="pointer-events-none absolute -end-20 -top-24 h-72 w-72 rounded-full bg-brand-400/20 blur-3xl" />

      <div className="relative max-w-6xl mx-auto flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {title}
          </h1>
          <p className="text-brand-100 mt-2 text-sm md:text-base max-w-2xl">{subtitle}</p>
        </div>

        {rightContent && <div className="shrink-0">{rightContent}</div>}
      </div>
    </header>
  );
}
