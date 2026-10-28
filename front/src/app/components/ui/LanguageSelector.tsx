"use client";

import { useState, useRef, useEffect } from "react";
import { Check, Globe, Loader2 } from "lucide-react";
import { LANGUAGES, useLanguage, type LangCode } from "../../context/LanguageContext";

/**
 * - `default` : sur fond clair ;
 * - `compact` : sur un en-tête bleu ;
 * - `sidebar` : pleine largeur en bas de la barre latérale, menu ouvert vers le
 *   haut ; `collapsed` n'y laisse que le globe (barre repliée en rail).
 */
export default function LanguageSelector({
  variant = "default",
  collapsed = false,
}: {
  variant?: "default" | "compact" | "sidebar";
  collapsed?: boolean;
}) {
  const { lang, setLang, isSwitching, m } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Échap referme le menu, comme toute liste déroulante.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const current = LANGUAGES.find((l) => l.code === lang)!;
  const Icon = isSwitching ? Loader2 : Globe;

  const buttonClass = {
    default:
      "flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 focus-visible:ring-brand-500",
    compact:
      "flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white focus-visible:ring-white/70",
    sidebar: `flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-brand-100 hover:bg-brand-600 hover:text-white focus-visible:ring-white/70 ${
      collapsed ? "lg:justify-center lg:px-0" : ""
    }`,
  }[variant];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={m.lang.choose}
        aria-label={`${m.lang.choose} — ${current.label}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`${buttonClass} transition duration-200 ease-out focus:outline-none focus-visible:ring-2 active:scale-[0.97] motion-reduce:active:scale-100`}
      >
        <Icon className={`h-4 w-4 shrink-0 ${isSwitching ? "animate-spin" : ""}`} />
        <span className={variant === "sidebar" && collapsed ? "lg:sr-only" : ""}>{current.label}</span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={m.lang.choose}
          className={`animate-fade-in absolute z-[100] min-w-[160px] rounded-xl border border-gray-200 bg-white py-1 shadow-lg ${
            variant === "sidebar" ? "bottom-full start-0 mb-2" : "top-full end-0 mt-1"
          }`}
        >
          {LANGUAGES.map((l) => (
            <li key={l.code} role="option" aria-selected={l.code === lang}>
              <button
                type="button"
                lang={l.code}
                onClick={() => {
                  setOpen(false);
                  if (l.code !== lang) setLang(l.code as LangCode);
                }}
                className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-start text-sm transition hover:bg-brand-50 ${
                  l.code === lang ? "bg-brand-50/50 font-semibold text-brand-700" : "text-gray-700"
                }`}
              >
                {l.label}
                {l.code === lang && <Check className="h-4 w-4" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
