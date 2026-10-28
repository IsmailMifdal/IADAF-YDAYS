"use client";

import { Check } from "lucide-react";

import {
  LANGUAGES,
  useLanguage,
  type LangCode,
} from "../../../context/LanguageContext";
import { SectionCard } from "../ui";
import { useToast } from "../../../components/ui/Toast";

export default function PreferencesSection() {
  const { lang, setLang, m } = useLanguage();
  const t = m.settings.preferences;
  const { toast } = useToast();

  return (
    <SectionCard title={t.title} description={t.description}>
      <div
        role="radiogroup"
        aria-label={t.title}
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
      >
        {LANGUAGES.map((option) => {
          const isSelected = option.code === lang;

          return (
            <button
              key={option.code}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => {
                setLang(option.code as LangCode);
                toast(option.label);
              }}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-start transition ${
                isSelected
                  ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <span className="flex-1 min-w-0">
                <span
                  lang={option.code}
                  className={`block font-medium ${
                    isSelected ? "text-brand-900" : "text-gray-900"
                  }`}
                >
                  {option.label}
                </span>
                <span className="block text-xs text-gray-500 uppercase">
                  {option.code}
                </span>
              </span>
              {isSelected && (
                <Check className="w-4 h-4 text-brand-600 shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </SectionCard>
  );
}
