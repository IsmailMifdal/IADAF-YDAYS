"use client";

/**
 * Primitives d'interface partagées.
 *
 * Toute page doit composer avec ces briques plutôt que réécrire ses propres
 * cartes et boutons : c'est ce qui garantit qu'une nouvelle page reste
 * cohérente avec les autres sans effort.
 */

import type { ReactNode } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Info, Loader2, TriangleAlert } from "lucide-react";

import {
  CARD_BASE,
  CARD_INTERACTIVE,
  FOCUS_RING,
  INPUT_BASE,
  PAGE_INNER,
  PAGE_SHELL,
  PRESS,
  RADIUS,
  TONE_STYLES,
  cx,
  type Tone,
} from "./tokens";

// ── Mise en page ──────────────────────────────────────────────────────────

/** Fond et gouttières standard d'une page, sous le PageHeader. */
export function PageContainer({
  children,
  width = "default",
}: {
  children: ReactNode;
  width?: "default" | "wide" | "narrow";
}) {
  const inner =
    width === "wide"
      ? "max-w-7xl mx-auto"
      : width === "narrow"
        ? "max-w-3xl mx-auto"
        : PAGE_INNER;

  return (
    <div className={PAGE_SHELL}>
      {/* Fondu montant à l'arrivée : la page se pose au lieu d'apparaître
          brutalement. Neutralisé si l'utilisateur a réduit les animations. */}
      <div className={cx(inner, "animate-fade-up")}>{children}</div>
    </div>
  );
}

/** Titre de section avec description et actions optionnelles. */
export function SectionTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {description && (
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

// ── Surfaces ──────────────────────────────────────────────────────────────

export function Card({
  children,
  className,
  interactive = false,
  tone,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  tone?: Tone;
}) {
  const border =
    tone && tone !== "neutral" ? TONE_STYLES[tone].soft.split(" ").pop() : null;

  return (
    <div
      className={cx(
        CARD_BASE,
        interactive && CARD_INTERACTIVE,
        border,
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Carte avec en-tête titré — structure la majorité des écrans. */
export function PanelCard({
  title,
  description,
  action,
  children,
  tone,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <Card tone={tone}>
      <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
        <div>
          <h2
            className={cx(
              "text-lg font-semibold",
              tone === "danger" ? "text-red-700" : "text-gray-900",
            )}
          >
            {title}
          </h2>
          {description && (
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          )}
        </div>
        {action}
      </div>
      <div className="px-6 pb-6">{children}</div>
    </Card>
  );
}

// ── Boutons ───────────────────────────────────────────────────────────────

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-sm",
  secondary:
    "bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm",
  ghost: "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
  danger: "bg-red-600 hover:bg-red-700 text-white shadow-sm",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "px-3.5 py-2 text-sm",
  md: "px-5 py-2.5",
};

function buttonClass(
  variant: ButtonVariant,
  size: ButtonSize,
  fullWidth: boolean,
) {
  return cx(
    "inline-flex items-center justify-center gap-2 font-medium",
    "transition duration-200 ease-out",
    RADIUS.control,
    VARIANTS[variant],
    SIZES[size],
    FOCUS_RING,
    PRESS,
    fullWidth && "w-full",
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
  );
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  isLoading = false,
  loadingLabel,
  disabled,
  type = "button",
  onClick,
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  isLoading?: boolean;
  loadingLabel?: string;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={buttonClass(variant, size, fullWidth)}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {isLoading && loadingLabel ? loadingLabel : children}
    </button>
  );
}

/** Même apparence que Button, mais pour une navigation. */
export function ButtonLink({
  href,
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
}: {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}) {
  return (
    <Link href={href} className={buttonClass(variant, size, fullWidth)}>
      {children}
    </Link>
  );
}

// ── Indicateurs ───────────────────────────────────────────────────────────

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 border px-2.5 py-1 text-xs font-medium",
        RADIUS.pill,
        TONE_STYLES[tone].soft,
      )}
    >
      {children}
    </span>
  );
}

const ALERT_ICONS: Record<Tone, typeof Info> = {
  neutral: Info,
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  danger: AlertCircle,
};

export function Alert({
  tone = "info",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  const Icon = ALERT_ICONS[tone];

  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cx(
        "flex items-start gap-2.5 border px-4 py-3 text-sm",
        RADIUS.control,
        TONE_STYLES[tone].soft,
      )}
    >
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

/** Tuile de statistique — un chiffre, son libellé, une icône. */
export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "info",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  tone?: Tone;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-gray-500 truncate">{label}</p>
          <p className="mt-1.5 text-2xl font-bold text-gray-900">{value}</p>
          {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
        </div>
        {icon && (
          <span
            className={cx(
              "flex h-10 w-10 shrink-0 items-center justify-center",
              RADIUS.control,
              TONE_STYLES[tone].soft,
            )}
          >
            {icon}
          </span>
        )}
      </div>
    </Card>
  );
}

/**
 * État vide — remplace les pages blanches.
 * Un écran sans données doit expliquer pourquoi et proposer une suite.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div
      className={cx(
        "flex flex-col items-center justify-center border border-dashed border-gray-300 bg-white px-6 py-14 text-center",
        RADIUS.surface,
      )}
    >
      {icon && (
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
          {icon}
        </span>
      )}
      <p className="font-medium text-gray-900">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-gray-500">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

// ── Formulaires ───────────────────────────────────────────────────────────

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-sm font-medium text-gray-700"
      >
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

export const inputClass = INPUT_BASE;

/**
 * Squelette de chargement, à la place d'un écran vide.
 *
 * Le balayage lumineux (`skeleton-shimmer`) rend l'attente lisible : un bloc
 * gris immobile ressemble à une erreur, un bloc animé à un chargement.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cx("skeleton-shimmer bg-gray-200", RADIUS.control, className)}
    />
  );
}

/** Groupe de squelettes reproduisant une liste de cartes. */
export function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="p-6">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="mt-3 h-4 w-1/3" />
          <Skeleton className="mt-6 h-2 w-full" />
        </Card>
      ))}
    </div>
  );
}
