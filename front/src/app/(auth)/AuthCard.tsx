import type { ReactNode } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { BrandLogo } from "../components/brand/BrandMark";

/** Logo au-dessus du formulaire : il ramène à l'accueil. */
export function AuthBrand() {
  return (
    <div className="mb-8 flex justify-center lg:justify-start">
      <Link
        href="/"
        className="rounded-xl p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <BrandLogo size="lg" />
      </Link>
    </div>
  );
}

/** Brand header + white card shared by the account-recovery pages. */
export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="w-full max-w-md">
      <AuthBrand />

      <div className={authCardClass}>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-gray-600 mt-1 text-sm">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}

export function AuthMessage({
  tone,
  children,
}: {
  tone: "error" | "success";
  children: ReactNode;
}) {
  const Icon = tone === "error" ? AlertCircle : CheckCircle2;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={
        "mt-5 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm " +
        (tone === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-800")
      }
    >
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export const authCardClass =
  "rounded-3xl border border-gray-200/80 bg-white p-8 shadow-lift sm:p-10";

export const authInputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-xs transition placeholder:text-gray-400 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15";

export const authButtonClass =
  "w-full flex items-center justify-center gap-2 rounded-xl bg-brand-600 py-3.5 font-semibold text-white shadow-glow ring-1 ring-inset ring-white/10 transition hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.99] motion-reduce:active:scale-100";
