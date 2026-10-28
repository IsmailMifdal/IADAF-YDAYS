"use client";

/** Petites primitives partagées par les sections des paramètres. */

import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import { intlLocale, type LangCode } from "../../context/languages";

export type Account = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  provider: string;
  createdAt: string;
  hasPassword: boolean;
};

export function SectionCard({
  title,
  description,
  children,
  tone = "neutral",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  tone?: "neutral" | "danger";
}) {
  const border = tone === "danger" ? "border-red-200" : "border-gray-200";

  return (
    <section className={`bg-white rounded-2xl border ${border} shadow-sm`}>
      <header className="px-6 pt-6 pb-4">
        <h2
          className={`text-lg font-semibold ${
            tone === "danger" ? "text-red-700" : "text-gray-900"
          }`}
        >
          {title}
        </h2>
        {description && (
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        )}
      </header>
      <div className="px-6 pb-6">{children}</div>
    </section>
  );
}

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
        className="block text-sm font-medium text-gray-700 mb-1.5"
      >
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

export const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-gray-900 shadow-xs transition placeholder:text-gray-400 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 disabled:bg-gray-50 disabled:text-gray-500";

export function Alert({
  tone,
  children,
}: {
  tone: "error" | "success";
  children: ReactNode;
}) {
  const isError = tone === "error";
  const Icon = isError ? AlertCircle : CheckCircle2;

  return (
    <div
      role={isError ? "alert" : "status"}
      className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${
        isError
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export function SubmitButton({
  isLoading,
  children,
  loadingLabel,
  tone = "primary",
  disabled = false,
  onClick,
  type = "submit",
}: {
  isLoading: boolean;
  children: ReactNode;
  loadingLabel: string;
  tone?: "primary" | "danger";
  disabled?: boolean;
  onClick?: () => void;
  type?: "submit" | "button";
}) {
  const palette =
    tone === "danger"
      ? "bg-red-600 hover:bg-red-700"
      : "bg-brand-600 hover:bg-brand-700";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isLoading || disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 font-medium text-white transition disabled:opacity-50 disabled:cursor-not-allowed ${palette}`}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {isLoading ? loadingLabel : children}
    </button>
  );
}

/** Étiquette d'avatar à deux lettres, repli sur l'adresse si aucun nom. */
export function getInitials(name?: string | null, email?: string | null): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    const letters =
      parts.length > 1
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`
        : parts[0].slice(0, 2);
    return letters.toUpperCase();
  }
  return (email?.slice(0, 2) ?? "??").toUpperCase();
}

export function formatDate(iso: string, lang: LangCode): string {
  return new Date(iso).toLocaleDateString(intlLocale(lang), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
