"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

import { LANG_COOKIE, type LangCode } from "./languages";

// Réexportés pour que les imports existants depuis ce module continuent de
// fonctionner ; la définition vit dans `languages.ts`, utilisable côté serveur.
export {
  LANGUAGES,
  LANG_COOKIE,
  isLangCode,
  type LangCode,
  type LangOption,
} from "./languages";

/** All translatable UI strings keyed by language code. */
const UI_STRINGS: Record<LangCode, Record<string, string>> = {
  fr: {
    "chat.placeholder": "Pose ta question…",
    "chat.emailPlaceholder": "ton.email@exemple.com",
    "chat.emailPrompt": "Facultatif — tu peux passer cette étape",
    "chat.emailAsk": "📧 Si tu le souhaites, laisse-moi ton adresse e-mail pour recevoir nos conseils et nos offres sur les démarches. C'est facultatif : tu peux aussi passer et poser directement ta question.",
    "chat.emailSuccess": "Merci ! 🎉 Ton e-mail a bien été enregistré. Comment puis-je t'aider ?",
    "chat.emailInvalid": "Hmm, ça ne ressemble pas à une adresse e-mail valide. 🤔 Peux-tu réessayer ? (ex: ton.email@exemple.com)",
    "chat.emailConsent": "J'accepte de recevoir par e-mail les conseils et offres d'IA-DAF. Adresse conservée 3 ans maximum, désinscription possible à tout moment.",
    "chat.emailSkip": "Passer",
    "chat.emailSkipped": "Pas de souci ! Comment puis-je t'aider ?",
    "chat.emailError": "Ton e-mail n'a pas pu être enregistré, mais on peut continuer. Comment puis-je t'aider ?",
    "chat.error": "Désolé, une erreur est survenue. Veuillez réessayer.",
    "chat.rateLimited": "Beaucoup de questions en peu de temps ! Réessaie dans quelques minutes.",
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
    "chat.emailPrompt": "Optional — you can skip this step",
    "chat.emailAsk": "📧 If you like, leave me your email address to receive our tips and offers about administrative procedures. It's optional: you can also skip and ask your question right away.",
    "chat.emailSuccess": "Thanks! 🎉 Your email has been saved. How can I help you?",
    "chat.emailInvalid": "Hmm, that doesn't look like a valid email address. 🤔 Can you try again? (e.g. your.email@example.com)",
    "chat.emailConsent": "I agree to receive tips and offers from IA-DAF by email. Address kept for 3 years at most, unsubscribe at any time.",
    "chat.emailSkip": "Skip",
    "chat.emailSkipped": "No problem! How can I help you?",
    "chat.emailError": "Your email couldn't be saved, but we can carry on. How can I help you?",
    "chat.error": "Sorry, an error occurred. Please try again.",
    "chat.rateLimited": "Lots of questions in a short time! Please try again in a few minutes.",
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
    "chat.emailPrompt": "اختياري — يمكنك تخطي هذه الخطوة",
    "chat.emailAsk": "📧 إذا رغبت، اترك لي بريدك الإلكتروني لتلقي نصائحنا وعروضنا حول الإجراءات الإدارية. هذا اختياري: يمكنك أيضًا التخطي وطرح سؤالك مباشرة.",
    "chat.emailSuccess": "شكرًا! 🎉 تم تسجيل بريدك الإلكتروني. كيف يمكنني مساعدتك؟",
    "chat.emailInvalid": "هذا لا يبدو كعنوان بريد إلكتروني صحيح. 🤔 هل يمكنك المحاولة مرة أخرى؟",
    "chat.emailConsent": "أوافق على تلقي نصائح وعروض IA-DAF عبر البريد الإلكتروني. يُحتفظ بالعنوان 3 سنوات كحد أقصى، ويمكن إلغاء الاشتراك في أي وقت.",
    "chat.emailSkip": "تخطي",
    "chat.emailSkipped": "لا مشكلة! كيف يمكنني مساعدتك؟",
    "chat.emailError": "تعذّر حفظ بريدك الإلكتروني، لكن يمكننا المتابعة. كيف يمكنني مساعدتك؟",
    "chat.error": "عذرًا، حدث خطأ. يرجى المحاولة مرة أخرى.",
    "chat.rateLimited": "أسئلة كثيرة في وقت قصير! يرجى المحاولة مرة أخرى بعد بضع دقائق.",
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
    "chat.emailPrompt": "Opcional — puedes saltar este paso",
    "chat.emailAsk": "📧 Si quieres, déjame tu correo electrónico para recibir nuestros consejos y ofertas sobre trámites. Es opcional: también puedes saltarlo y hacer tu pregunta directamente.",
    "chat.emailSuccess": "¡Gracias! 🎉 Tu correo ha sido registrado. ¿En qué puedo ayudarte?",
    "chat.emailInvalid": "Hmm, eso no parece una dirección de correo válida. 🤔 ¿Puedes intentar de nuevo? (ej: tu.email@ejemplo.com)",
    "chat.emailConsent": "Acepto recibir por correo los consejos y ofertas de IA-DAF. Dirección conservada 3 años como máximo, baja posible en cualquier momento.",
    "chat.emailSkip": "Saltar",
    "chat.emailSkipped": "¡Sin problema! ¿En qué puedo ayudarte?",
    "chat.emailError": "No se ha podido guardar tu correo, pero podemos seguir. ¿En qué puedo ayudarte?",
    "chat.error": "Lo siento, ha ocurrido un error. Por favor, inténtalo de nuevo.",
    "chat.rateLimited": "¡Muchas preguntas en poco tiempo! Inténtalo de nuevo en unos minutos.",
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

export function LanguageProvider({
  children,
  /**
   * Read server-side from the cookie by the root layout. Passing it in — rather
   * than reading localStorage in an effect — avoids a hydration mismatch and a
   * flash of French before the real preference applies.
   */
  initialLang = "fr",
}: {
  children: ReactNode;
  initialLang?: LangCode;
}) {
  const [lang, setLangState] = useState<LangCode>(initialLang);

  const setLang = useCallback((next: LangCode) => {
    setLangState(next);
    if (typeof document !== "undefined") {
      // One year, same-site: a display preference, nothing sensitive.
      document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    }
  }, []);

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
