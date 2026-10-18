"use client";

/**
 * Notifications éphémères.
 *
 * Jusqu'ici, enregistrer un profil ou changer un mot de passe ne produisait
 * qu'un encart statique dans le formulaire — invisible si l'utilisateur avait
 * fait défiler la page. Un toast confirme l'action là où l'œil se trouve.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from "lucide-react";

import { RADIUS, TONE_STYLES, cx, type Tone } from "./tokens";

type Toast = {
  id: number;
  tone: Tone;
  message: string;
};

type ToastContextValue = {
  toast: (message: string, tone?: Tone) => void;
};

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

const ICONS: Record<Tone, typeof Info> = {
  neutral: Info,
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  danger: AlertCircle,
};

/** Durée d'affichage : assez pour lire une phrase courte sans gêner. */
const DISMISS_AFTER_MS = 4500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((message: string, tone: Tone = "success") => {
    // `Date.now()` suffit ici : deux toasts ne peuvent pas naître dans la même
    // milliseconde depuis une interaction utilisateur.
    setToasts((current) => [...current, { id: Date.now(), tone, message }]);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* aria-live polite : annoncé par les lecteurs d'écran sans couper la
          lecture en cours. */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0"
      >
        {toasts.map((item) => (
          <ToastItem key={item.id} toast={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: number) => void;
}) {
  const Icon = ICONS[toast.tone];

  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), DISMISS_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      role="status"
      className={cx(
        "animate-slide-in-right pointer-events-auto flex items-start gap-2.5 border px-4 py-3 text-sm shadow-lg",
        RADIUS.control,
        TONE_STYLES[toast.tone].soft,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="flex-1">{toast.message}</span>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Fermer la notification"
        className="-mr-1 -mt-0.5 rounded p-1 opacity-60 transition hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
