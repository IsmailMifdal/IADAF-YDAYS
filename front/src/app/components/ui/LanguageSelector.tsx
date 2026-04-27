"use client";

import { useState, useRef, useEffect } from "react";
import { Globe } from "lucide-react";
import { LANGUAGES, useLanguage, type LangCode } from "../../context/LanguageContext";

export default function LanguageSelector({ variant = "default" }: { variant?: "default" | "compact" }) {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = LANGUAGES.find((l) => l.code === lang)!;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Change language"
        className={
          variant === "compact"
            ? "flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition text-white"
            : "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition text-gray-700"
        }
      >
        <Globe className="w-3.5 h-3.5" />
        <span>{current.flag}</span>
      </button>

      {open && (
        <div className="absolute bottom-full mb-1 right-0 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-[100] min-w-[140px]">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => {
                setLang(l.code as LangCode);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-blue-50 transition ${
                l.code === lang ? "text-blue-600 font-medium bg-blue-50/50" : "text-gray-700"
              }`}
            >
              <span>{l.flag}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
