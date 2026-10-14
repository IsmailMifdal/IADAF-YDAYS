"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, Bot, MessageSquare, X, Mail } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { api, ApiError, type ChatResponse } from "../../lib/api";
import { useLanguage, type LangCode } from "../../context/LanguageContext";
import LanguageSelector from "../ui/LanguageSelector";
import { packs } from "../../(app)/packs/packsData";

type ChatMessage = {
  role: "ai" | "user";
  content: string;
};

const MAX_USER_MESSAGES = 3;

const isRateLimited = (error: unknown) =>
  error instanceof ApiError && error.status === 429;

// Interpolated into every system prompt so the assistant can never advertise a
// pack that is not actually on sale.
const PACK_COUNT = packs.length;
const PACK_NAMES = packs.map((pack) => pack.title).join(", ");

const SYSTEM_CONTEXTS: Record<LangCode, string> = {
  fr: `Tu es l'assistant du site IA-DAF. Tu parles comme un ami, pas comme un robot.

TON RÔLE : Présenter le site IA-DAF et ses fonctionnalités, c'est TOUT.

RÈGLES ABSOLUES :
- MAX 2 phrases par réponse
- Tu présentes UNIQUEMENT ce que le site fait et ses fonctionnalités
- Tu NE donnes JAMAIS de démarches à suivre, d'étapes, de procédures ou de conseils administratifs
- Tu NE détailles JAMAIS comment faire une démarche
- Si on te demande comment faire quelque chose → "Pour ça, nos packs t'accompagnent étape par étape 😉"
- JAMAIS de listes, JAMAIS de gras (**), JAMAIS de titres markdown
- Tu tutoies, ton décontracté, 1 emoji max
- JAMAIS "nous proposons", "notre plateforme", "n'hésite pas"

CE QUE TU PEUX DIRE : IA-DAF simplifie les démarches administratives françaises grâce à l'IA. Il y a ${PACK_COUNT} packs (${PACK_NAMES}), un assistant IA multilingue, du suivi de dossier, de l'analyse de documents.
CE QUE TU NE DIS PAS : les étapes des démarches, les documents nécessaires, les procédures, les délais.`,
  en: `You are the IA-DAF website assistant. Talk like a friendly human, not a robot.

YOUR ROLE: Present the IA-DAF website and its features, that's ALL.

ABSOLUTE RULES:
- MAX 2 sentences per response
- You present ONLY what the site does and its features
- You NEVER give steps, procedures, or administrative advice
- You NEVER explain how to do a procedure
- If asked how to do something → "For that, our packs guide you step by step 😉"
- NEVER lists, NEVER bold (**), NEVER markdown headings
- Casual tone, 1 emoji max
- NEVER "we offer", "our platform", "don't hesitate"

WHAT YOU CAN SAY: IA-DAF simplifies French administrative procedures with AI. There are ${PACK_COUNT} packs (${PACK_NAMES}), a multilingual AI assistant, file tracking, document analysis.
WHAT YOU DON'T SAY: procedure steps, required documents, processes, timelines.
IMPORTANT: Always respond in English.`,
  ar: `أنت مساعد موقع IA-DAF. تحدث كصديق وليس كروبوت.

دورك: تقديم موقع IA-DAF وميزاته فقط.

القواعد المطلقة:
- حد أقصى جملتين لكل رد
- تقدم فقط ما يفعله الموقع وميزاته
- لا تعطي أبدًا خطوات أو إجراءات أو نصائح إدارية
- لا تشرح أبدًا كيفية القيام بإجراء
- إذا سُئلت كيف تفعل شيئًا ← "لذلك، باقاتنا ترشدك خطوة بخطوة 😉"
- لا قوائم أبدًا، لا خط عريض، لا عناوين
- نبرة ودية، إيموجي واحد كحد أقصى

ما يمكنك قوله: IA-DAF يبسط الإجراءات الإدارية الفرنسية بالذكاء الاصطناعي. هناك ${PACK_COUNT} باقات (${PACK_NAMES})، مساعد ذكاء اصطناعي متعدد اللغات، تتبع الملفات، تحليل المستندات.
مهم: أجب دائمًا بالعربية.`,
  es: `Eres el asistente del sitio web IA-DAF. Habla como un amigo, no como un robot.

TU ROL: Presentar el sitio IA-DAF y sus funcionalidades, eso es TODO.

REGLAS ABSOLUTAS:
- MÁX 2 frases por respuesta
- Solo presentas lo que hace el sitio y sus funcionalidades
- NUNCA das pasos, procedimientos ni consejos administrativos
- NUNCA explicas cómo hacer un trámite
- Si preguntan cómo hacer algo → "Para eso, nuestros packs te guían paso a paso 😉"
- NUNCA listas, NUNCA negrita (**), NUNCA encabezados markdown
- Tono informal, 1 emoji máx
- NUNCA "ofrecemos", "nuestra plataforma", "no dudes en"

LO QUE PUEDES DECIR: IA-DAF simplifica los trámites administrativos franceses con IA. Hay ${PACK_COUNT} packs (${PACK_NAMES}), asistente IA multilingüe, seguimiento de expedientes, análisis de documentos.
IMPORTANTE: Responde siempre en español.`,
};

const FIRST_WELCOME_MESSAGES: Record<LangCode, string> = {
  fr: "Salut ! IA-DAF est là pour vous accompagner et simplifier vos démarches administratives françaises grâce à l’intelligence artificielle. Comment puis-je vous aider aujourd’hui ?",
  en: "Hi! IA-DAF is here to support you and simplify your French administrative procedures with artificial intelligence. How can I help you today?",
  ar: "مرحبًا! IA-DAF هنا لمرافقتك وتبسيط إجراءاتك الإدارية الفرنسية بفضل الذكاء الاصطناعي. كيف يمكنني مساعدتك اليوم؟",
  es: "¡Hola! IA-DAF está aquí para acompañarte y simplificar tus trámites administrativos franceses gracias a la inteligencia artificial. ¿Cómo puedo ayudarte hoy?",
};

export default function AccueilChat() {
  const { lang, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [userMessageCount, setUserMessageCount] = useState(0);
  const [waitingForEmail, setWaitingForEmail] = useState(false);
  // Unticked by default: consent must be an explicit act (RGPD, art. 7).
  const [emailConsent, setEmailConsent] = useState(false);
  const [chatEnded, setChatEnded] = useState(false);
  const [welcomeSent, setWelcomeSent] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Reset chat when language changes so welcome is re-sent in new language
  useEffect(() => {
    setMessages([]);
    setConversationId(undefined);
    setUserMessageCount(0);
    setWaitingForEmail(false);
    setEmailConsent(false);
    setChatEnded(false);
    setWelcomeSent(false);
  }, [lang]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Welcome message when chat opens
  useEffect(() => {
    if (!isOpen || welcomeSent) return;
    setWelcomeSent(true);
    setMessages([
      {
        role: "ai",
        content: FIRST_WELCOME_MESSAGES[lang],
      },
    ]);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: t("chat.emailAsk"),
        },
      ]);
      setWaitingForEmail(true);
    }, 1500);
  }, [isOpen, welcomeSent, t, lang]);

  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  /** Returns whether the address was stored — the chat goes on either way. */
  const saveEmail = async (email: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "accueil_chat", consent: true }),
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  // Giving an e-mail is optional: the chat must never be conditional on it,
  // or the consent would not be freely given (RGPD, art. 7.4).
  const skipEmail = () => {
    setWaitingForEmail(false);
    setInputValue("");
    setMessages((prev) => [...prev, { role: "ai", content: t("chat.emailSkipped") }]);
  };

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading || chatEnded) return;
      // Enter bypasses the disabled send button: no address without consent.
      if (waitingForEmail && !emailConsent) return;

      setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
      setInputValue("");

      // Handle email collection
      if (waitingForEmail) {
        if (isValidEmail(trimmed)) {
          const saved = await saveEmail(trimmed);
          setWaitingForEmail(false);
          setMessages((prev) => [
            ...prev,
            {
              role: "ai",
              content: t(saved ? "chat.emailSuccess" : "chat.emailError"),
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              role: "ai",
              content: t("chat.emailInvalid"),
            },
          ]);
        }
        return;
      }

      // Check message limit
      const newCount = userMessageCount + 1;
      setUserMessageCount(newCount);

      if (newCount >= MAX_USER_MESSAGES) {
        setChatEnded(true);
        setIsLoading(true);

        try {
          const res: ChatResponse = await api.chat({
            message: `${SYSTEM_CONTEXTS[lang]}\n\nQuestion de l'utilisateur : ${trimmed}\n\nC'est son dernier message. Réponds BRIÈVEMENT à sa question en 1 phrase, puis enchaîne naturellement en l'invitant à découvrir nos packs pour aller plus loin. 1 emoji max, 2-3 lignes max.`,
            conversation_id: conversationId,
            language: lang,
          });
          setConversationId(res.conversation_id);
          setMessages((prev) => [...prev, { role: "ai", content: res.response }]);
        } catch (error) {
          setMessages((prev) => [
            ...prev,
            {
              role: "ai",
              content: t(isRateLimited(error) ? "chat.rateLimited" : "chat.fallbackEnd"),
            },
          ]);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // Normal message — send to AI
      setIsLoading(true);
      try {
        const res: ChatResponse = await api.chat({
          message: `${SYSTEM_CONTEXTS[lang]}\n\nQuestion de l'utilisateur : ${trimmed}`,
          conversation_id: conversationId,
          language: lang,
        });
        setConversationId(res.conversation_id);
        setMessages((prev) => [...prev, { role: "ai", content: res.response }]);
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            content: t(isRateLimited(error) ? "chat.rateLimited" : "chat.error"),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, chatEnded, waitingForEmail, emailConsent, userMessageCount, conversationId, lang, t],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          title="Ouvrir le chat"
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110"
        >
          <MessageSquare className="w-7 h-7" />
        </button>
      )}

      {/* Chat window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[400px] h-[560px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{t("chat.assistant")}</h3>
                <p className="text-blue-200 text-xs">{t("chat.online")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSelector variant="compact" />
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Fermer le chat"
                className="p-1.5 rounded-lg hover:bg-white/20 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                {msg.role === "ai" && (
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center text-white shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div className={`max-w-[80%] ${msg.role === "user" ? "text-right" : ""}`}>
                  {msg.role === "ai" ? (
                    <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 border border-blue-100/60 rounded-2xl rounded-tl-sm px-4 py-3 text-[13.5px] text-gray-700 leading-relaxed shadow-sm">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-[13.5px] shadow-sm">
                      {msg.content}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center text-white shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  <span className="text-xs text-gray-500">{t("chat.loading")}</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* CTA after chat ended */}
          {chatEnded && (
            <div className="border-t border-gray-100 p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
              <Link
                href="/nosPacks"
                className="block w-full rounded-xl bg-blue-600 py-3 text-center text-sm font-medium text-white transition hover:bg-blue-700"
              >
                {t("chat.discoverPacks")}
              </Link>
            </div>
          )}

          {/* Input */}
          {!chatEnded && (
            <div className="border-t border-gray-100 p-3">
              {waitingForEmail && (
                <div className="mb-2 space-y-2 px-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-blue-600">
                      <Mail className="w-3.5 h-3.5" />
                      <span>{t("chat.emailPrompt")}</span>
                    </div>
                    <button
                      type="button"
                      onClick={skipEmail}
                      className="rounded-xl px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition"
                    >
                      {t("chat.emailSkip")}
                    </button>
                  </div>
                  <label className="flex items-start gap-2 text-[11px] leading-snug text-gray-500">
                    <input
                      type="checkbox"
                      checked={emailConsent}
                      onChange={(e) => setEmailConsent(e.target.checked)}
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-blue-600"
                    />
                    <span>{t("chat.emailConsent")}</span>
                  </label>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type={waitingForEmail ? "email" : "text"}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    waitingForEmail
                      ? t("chat.emailPlaceholder")
                      : t("chat.placeholder")
                  }
                  disabled={isLoading}
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                />
                <button
                  type="button"
                  disabled={
                    inputValue.trim().length === 0 ||
                    isLoading ||
                    (waitingForEmail && !emailConsent)
                  }
                  onClick={() => sendMessage(inputValue)}
                  title="Envoyer"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white p-2.5 rounded-xl transition"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
