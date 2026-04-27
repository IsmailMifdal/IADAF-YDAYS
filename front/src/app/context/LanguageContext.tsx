"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type LangCode = "fr" | "en" | "ar" | "es";

export interface LangOption {
  code: LangCode;
  label: string;
  flag: string;
}

export const LANGUAGES: LangOption[] = [
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "es", label: "Español", flag: "🇪🇸" },
];

/** All translatable UI strings keyed by language code. */
const UI_STRINGS: Record<LangCode, Record<string, string>> = {
  fr: {
    "chat.placeholder": "Pose ta question…",
    "chat.emailPlaceholder": "ton.email@exemple.com",
    "chat.emailPrompt": "Entre ton adresse e-mail pour continuer",
    "chat.emailAsk": "📧 Avant de commencer, pourrais-tu me donner ton adresse e-mail ? Cela nous permettra de te recontacter et de t'offrir un meilleur suivi !",
    "chat.emailSuccess": "Merci ! 🎉 Ton e-mail a bien été enregistré. Comment puis-je t'aider ?",
    "chat.emailInvalid": "Hmm, ça ne ressemble pas à une adresse e-mail valide. 🤔 Peux-tu réessayer ? (ex: ton.email@exemple.com)",
    "chat.error": "Désolé, une erreur est survenue. Veuillez réessayer.",
    "chat.loading": "Réponse en cours…",
    "chat.online": "En ligne",
    "chat.assistant": "Assistant IA-DAF",
    "chat.discoverPacks": "🎯 Découvrir nos packs →",
    "chat.fallbackEnd": "Bonne question ! Pour un accompagnement complet et personnalisé, je t'invite à jeter un œil à nos packs — ils sont faits pour ça 😉",
    "chat.fallbackWelcome": "Bonjour ! 👋 Bienvenue sur IA-DAF, ta plateforme d'aide aux démarches administratives françaises. Comment puis-je t'aider ?",
    "pack.chat.placeholder": "Posez votre question...",
    "pack.chat.loading": "L'IA génère votre réponse…",
    "pack.chat.assistant": "Assistant IA",
    "pack.chat.online": "En ligne",
    "pack.chat.error": "Désolé, une erreur est survenue. Veuillez réessayer.",
  },
  en: {
    "chat.placeholder": "Ask your question…",
    "chat.emailPlaceholder": "your.email@example.com",
    "chat.emailPrompt": "Enter your email address to continue",
    "chat.emailAsk": "📧 Before we start, could you give me your email address? This will allow us to contact you and provide better support!",
    "chat.emailSuccess": "Thanks! 🎉 Your email has been saved. How can I help you?",
    "chat.emailInvalid": "Hmm, that doesn't look like a valid email address. 🤔 Can you try again? (e.g. your.email@example.com)",
    "chat.error": "Sorry, an error occurred. Please try again.",
    "chat.loading": "Generating response…",
    "chat.online": "Online",
    "chat.assistant": "IA-DAF Assistant",
    "chat.discoverPacks": "🎯 Discover our packs →",
    "chat.fallbackEnd": "Great question! For complete, personalized support, check out our packs — they're made for that 😉",
    "chat.fallbackWelcome": "Hello! 👋 Welcome to IA-DAF, your platform for French administrative procedures. How can I help you?",
    "pack.chat.placeholder": "Ask your question...",
    "pack.chat.loading": "AI is generating your response…",
    "pack.chat.assistant": "AI Assistant",
    "pack.chat.online": "Online",
    "pack.chat.error": "Sorry, an error occurred. Please try again.",
  },
  ar: {
    "chat.placeholder": "اطرح سؤالك…",
    "chat.emailPlaceholder": "بريدك@مثال.com",
    "chat.emailPrompt": "أدخل بريدك الإلكتروني للمتابعة",
    "chat.emailAsk": "📧 قبل أن نبدأ، هل يمكنك إعطائي بريدك الإلكتروني؟ سيسمح لنا ذلك بالتواصل معك وتقديم متابعة أفضل!",
    "chat.emailSuccess": "شكرًا! 🎉 تم تسجيل بريدك الإلكتروني. كيف يمكنني مساعدتك؟",
    "chat.emailInvalid": "هذا لا يبدو كعنوان بريد إلكتروني صحيح. 🤔 هل يمكنك المحاولة مرة أخرى؟",
    "chat.error": "عذرًا، حدث خطأ. يرجى المحاولة مرة أخرى.",
    "chat.loading": "جارٍ إنشاء الرد…",
    "chat.online": "متصل",
    "chat.assistant": "مساعد IA-DAF",
    "chat.discoverPacks": "🎯 اكتشف باقاتنا ←",
    "chat.fallbackEnd": "سؤال جيد! للحصول على دعم كامل ومخصص، ألقِ نظرة على باقاتنا 😉",
    "chat.fallbackWelcome": "مرحبًا! 👋 أهلاً بك في IA-DAF، منصتك للإجراءات الإدارية الفرنسية. كيف يمكنني مساعدتك؟",
    "pack.chat.placeholder": "اطرح سؤالك...",
    "pack.chat.loading": "الذكاء الاصطناعي يولد ردك…",
    "pack.chat.assistant": "مساعد الذكاء الاصطناعي",
    "pack.chat.online": "متصل",
    "pack.chat.error": "عذرًا، حدث خطأ. يرجى المحاولة مرة أخرى.",
  },
  es: {
    "chat.placeholder": "Haz tu pregunta…",
    "chat.emailPlaceholder": "tu.email@ejemplo.com",
    "chat.emailPrompt": "Introduce tu correo electrónico para continuar",
    "chat.emailAsk": "📧 Antes de empezar, ¿podrías darme tu correo electrónico? Esto nos permitirá contactarte y ofrecerte un mejor seguimiento.",
    "chat.emailSuccess": "¡Gracias! 🎉 Tu correo ha sido registrado. ¿En qué puedo ayudarte?",
    "chat.emailInvalid": "Hmm, eso no parece una dirección de correo válida. 🤔 ¿Puedes intentar de nuevo? (ej: tu.email@ejemplo.com)",
    "chat.error": "Lo siento, ha ocurrido un error. Por favor, inténtalo de nuevo.",
    "chat.loading": "Generando respuesta…",
    "chat.online": "En línea",
    "chat.assistant": "Asistente IA-DAF",
    "chat.discoverPacks": "🎯 Descubre nuestros packs →",
    "chat.fallbackEnd": "¡Buena pregunta! Para un acompañamiento completo y personalizado, echa un vistazo a nuestros packs 😉",
    "chat.fallbackWelcome": "¡Hola! 👋 Bienvenido a IA-DAF, tu plataforma para trámites administrativos franceses. ¿En qué puedo ayudarte?",
    "pack.chat.placeholder": "Haz tu pregunta...",
    "pack.chat.loading": "La IA está generando tu respuesta…",
    "pack.chat.assistant": "Asistente IA",
    "pack.chat.online": "En línea",
    "pack.chat.error": "Lo siento, ha ocurrido un error. Por favor, inténtalo de nuevo.",
  },
};

interface LanguageContextValue {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "fr",
  setLang: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<LangCode>("fr");

  const t = useCallback(
    (key: string): string => UI_STRINGS[lang]?.[key] ?? UI_STRINGS.fr[key] ?? key,
    [lang],
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
