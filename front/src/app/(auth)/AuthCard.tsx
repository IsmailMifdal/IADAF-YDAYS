import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Sparkles } from "lucide-react";

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
    <div className="w-full max-w-md px-4">
      <div className="flex items-center gap-3 mb-8 justify-center">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="font-bold text-lg text-gray-900">IA-DAF</p>
          <p className="text-sm text-gray-500">Assistant Administratif</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
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

export const authInputClass =
  "w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

export const authButtonClass =
  "w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3.5 transition shadow-lg shadow-blue-500/20";
