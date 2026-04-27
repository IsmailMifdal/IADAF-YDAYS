"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Bot, Loader2, MessageSquare, Sparkles, Upload } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getPackBySlug } from "../packsData";
import { isPackUnlocked } from "../../../lib/mockPayment";
import HeaderPage from "../../../components/ui/PageHeader";
import { api, type ChatResponse } from "../../../lib/api";
import { useLanguage } from "../../../context/LanguageContext";
import LanguageSelector from "../../../components/ui/LanguageSelector";

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_SIZE = 10 * 1024 * 1024;

function formatSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function validateFile(file: File) {
  const isValidType = ALLOWED_TYPES.includes(file.type);
  const isValidSize = file.size <= MAX_SIZE;

  if (!isValidType) {
    return "Type de fichier non supporté. Utilisez PDF, JPG ou PNG.";
  }

  if (!isValidSize) {
    return "Fichier trop volumineux. Taille maximale : 10MB.";
  }

  return null;
}

type ChatMessage = {
  role: "ai" | "user";
  content: string;
};

export default function PackDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const pack = getPackBySlug(slug);
  const { lang, t } = useLanguage();

  const [filesByDocument, setFilesByDocument] = useState<
    Record<string, File | null>
  >({});
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [welcomeSent, setWelcomeSent] = useState(false);
  const dropInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Reset chat when language changes so welcome is re-sent in new language
  useEffect(() => {
    if (!hasAccess) return;
    setMessages([]);
    setConversationId(undefined);
    setWelcomeSent(false);
  }, [lang]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Envoie un message de bienvenue contextuel au pack choisi
  useEffect(() => {
    if (!pack || !hasAccess || welcomeSent) return;
    setWelcomeSent(true);
    setIsLoading(true);

    const docsList = pack.requiredDocuments.map((d) => `- ${d}`).join("\n");

    const langPrompts: Record<string, string> = {
      fr: `CONTEXTE OBLIGATOIRE : L'utilisateur a choisi le pack "${pack.title}" — ${pack.shortDescription}
Tu dois UNIQUEMENT parler de la démarche "${pack.title}". Ne parle JAMAIS d'une autre démarche.

Génère un court message de bienvenue en français avec ce format EXACT :
1. Une ligne d'accueil chaleureuse avec un emoji (max 1 phrase) qui mentionne la démarche "${pack.title}"
2. Une ligne vide
3. Le texte "📋 **Documents à préparer :**" suivi d'une liste à puces des documents suivants :
${docsList}
4. Une ligne vide
5. Une phrase finale courte invitant à poser des questions sur cette démarche précise

Règles : reste bref (max 8 lignes), tutoiement, positif. Réponds en français.`,
      en: `MANDATORY CONTEXT: The user chose the pack "${pack.title}" — ${pack.shortDescription}
You must ONLY talk about the "${pack.title}" procedure. NEVER mention another procedure.

Generate a short welcome message in English with this EXACT format:
1. A warm greeting line with an emoji (max 1 sentence) mentioning "${pack.title}"
2. A blank line
3. The text "📋 **Documents to prepare:**" followed by a bullet list of these documents:
${docsList}
4. A blank line
5. A short closing sentence inviting questions about this specific procedure

Rules: keep it brief (max 8 lines), friendly, positive. Respond in English.`,
      ar: `السياق الإلزامي: اختار المستخدم باقة "${pack.title}" — ${pack.shortDescription}
يجب أن تتحدث فقط عن إجراء "${pack.title}". لا تذكر أبدًا إجراءً آخر.

أنشئ رسالة ترحيب قصيرة بالعربية بهذا التنسيق:
1. سطر ترحيب دافئ مع إيموجي يذكر "${pack.title}"
2. سطر فارغ
3. النص "📋 **المستندات المطلوبة:**" متبوعًا بقائمة نقطية للمستندات التالية:
${docsList}
4. سطر فارغ
5. جملة ختامية قصيرة تدعو لطرح الأسئلة

أجب بالعربية.`,
      es: `CONTEXTO OBLIGATORIO: El usuario eligió el pack "${pack.title}" — ${pack.shortDescription}
Debes hablar ÚNICAMENTE del trámite "${pack.title}". NUNCA menciones otro trámite.

Genera un mensaje de bienvenida corto en español con este formato EXACTO:
1. Una línea de saludo cálida con un emoji (máx 1 frase) que mencione "${pack.title}"
2. Una línea en blanco
3. El texto "📋 **Documentos a preparar:**" seguido de una lista con viñetas:
${docsList}
4. Una línea en blanco
5. Una frase final corta invitando a hacer preguntas sobre este trámite

Reglas: breve (máx 8 líneas), informal, positivo. Responde en español.`,
    };

    const prompt = langPrompts[lang] || langPrompts.fr;

    api
      .chat({ message: prompt, conversation_id: undefined, language: lang })
      .then((res) => {
        setConversationId(res.conversation_id);
        setMessages([{ role: "ai", content: res.response }]);
      })
      .catch(() => {
        const fallbackDocs = pack.requiredDocuments.map((d) => `- ${d}`).join("\n");
        setMessages([
          {
            role: "ai",
            content: `Bienvenue ! 🎉 Je suis là pour t'accompagner dans ta démarche **${pack.title}**.\n\n📋 **Documents à préparer :**\n${fallbackDocs}\n\nN'hésite pas à me poser tes questions, je suis là pour t'aider ! 💬`,
          },
        ]);
      })
      .finally(() => setIsLoading(false));
  }, [pack, hasAccess, welcomeSent]);

  const uploadedCount = useMemo(() => {
    return (
      Object.values(filesByDocument).filter(Boolean).length +
      droppedFiles.length
    );
  }, [filesByDocument, droppedFiles]);

  useEffect(() => {
    setHasAccess(isPackUnlocked(slug));
  }, [slug]);

  const handleSendMessage = useCallback(async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || isLoading) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setChatInput("");
    setIsLoading(true);

    try {
      const packContext = pack
        ? `[CONTEXTE : L'utilisateur travaille sur la démarche "${pack.title}" (${pack.shortDescription}). Réponds UNIQUEMENT en rapport avec cette démarche. Ne parle pas d'autres démarches.]\n\nQuestion de l'utilisateur : `
        : "";
      const res: ChatResponse = await api.chat({
        message: packContext + trimmed,
        conversation_id: conversationId,
        language: lang,
      });

      setConversationId(res.conversation_id);
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: res.response },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: t("pack.chat.error"),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [chatInput, conversationId, isLoading, pack, lang, t]);

  if (!pack) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-12">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Pack introuvable
          </h1>
          <p className="text-gray-600 mt-2">
            Le pack demandé n'existe pas ou n'est plus disponible.
          </p>
          <Link
            href="/nosPacks"
            className="inline-block mt-6 bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Retour aux packs
          </Link>
        </div>
      </div>
    );
  }

  if (hasAccess === null) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-12">
          <div className="bg-white border rounded-xl p-10 text-center">
            <p className="text-gray-600">Vérification d'accès...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-12">
          <div className="bg-white border rounded-xl p-10 text-center">
            <h1 className="text-2xl font-bold text-gray-900">Accès bloqué</h1>
            <p className="text-gray-600 mt-3">
              Ce pack nécessite un paiement pour être accessible.
            </p>
            <Link
              href={`/payment/${slug}`}
              className="inline-block mt-6 bg-red-500 hover:bg-red-600 text-white py-3 px-5 rounded-lg"
            >
              Aller au paiement
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleDocumentInput = (documentName: string, file: File | null) => {
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setErrorMessage("");
    setFilesByDocument((prev) => ({ ...prev, [documentName]: file }));
  };

  const addDroppedFiles = (fileList: File[]) => {
    const validFiles: File[] = [];

    fileList.forEach((file) => {
      const validationError = validateFile(file);
      if (validationError) {
        setErrorMessage(validationError);
        return;
      }
      validFiles.push(file);
    });

    if (validFiles.length > 0) {
      setErrorMessage("");
      setDroppedFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const files = Array.from(event.dataTransfer.files ?? []);
    if (files.length === 0) return;
    addDroppedFiles(files);
  };

  return (
    <div>
      <HeaderPage
        title={pack.title}
        subtitle="Vue d’ensemble de vos démarches, dossiers et documents."
      />
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-12">
          <h2 className="text-gray-600 text-xl mt-2">
            {pack.shortDescription}
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-8 items-stretch mt-10">
            {/* SECTION 1 - DOCUMENTS A PREPARER */}
            {/* <section className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">
                Veuillez préparer ces documents
              </h2>
              <ul className="space-y-2">
                {pack.requiredDocuments.map((document) => (
                  <li key={document} className="flex items-center gap-2">
                    <span className="text-green-500">✔</span>
                    <span className="text-gray-700">{document}</span>
                  </li>
                ))}
              </ul>
            </section> */}

            {/* SECTION 2 - UPLOAD DES DOCUMENTS */}
            <section className="bg-white border border-gray-200 rounded-xl p-6 h-full flex flex-col">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Upload des documents
                </h3>

                <div className="space-y-4">
                  {pack.requiredDocuments.map((document) => (
                    <div key={document}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {document}
                      </label>
                      <input
                        type="file"
                        onChange={(event) =>
                          handleDocumentInput(
                            document,
                            event.target.files?.[0] ?? null,
                          )
                        }
                        className="w-full border border-gray-300 rounded-lg px-4 py-2"
                        accept=".pdf,.jpg,.jpeg,.png"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Format accepté : PDF, JPG, PNG (max 10MB)
                      </p>
                    </div>
                  ))}
                </div>

                <div
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={handleDrop}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    setIsDragging(false);
                  }}
                  onClick={() => dropInputRef.current?.click()}
                  className={`border-dashed border-2 rounded-xl p-8 text-center mt-4 cursor-pointer transition ${
                    isDragging
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-300"
                  }`}
                >
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">
                    Déposez vos fichiers ici ou cliquez pour sélectionner
                  </p>
                  <input
                    ref={dropInputRef}
                    type="file"
                    hidden
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(event) =>
                      addDroppedFiles(Array.from(event.target.files ?? []))
                    }
                  />
                </div>

                {errorMessage && (
                  <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {errorMessage}
                  </p>
                )}
              </div>

              {uploadedCount > 0 && (
                <div className="mt-6 border border-gray-200 rounded-xl p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Fichiers ajoutés
                  </h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    {Object.entries(filesByDocument)
                      .filter(([, file]) => Boolean(file))
                      .map(([documentName, file]) => (
                        <li key={`${documentName}-${file?.name}`}>
                          {documentName}: {file?.name} (
                          {file ? formatSize(file.size) : "0 MB"})
                        </li>
                      ))}
                    {droppedFiles.map((file) => (
                      <li key={`${file.name}-${file.lastModified}`}>
                        Dropzone: {file.name} ({formatSize(file.size)})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                type="button"
                className="mt-10 w-full bg-red-500 hover:bg-red-600 text-white py-4 rounded-xl font-semibold text-lg"
              >
                Analyser mes documents
              </button>
            </section>

            {/* SECTION 3 - CHAT IA */}
            <aside className="w-full h-full">
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm h-full flex flex-col md:sticky md:top-0 p-4 gap-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                    <MessageSquare className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-2xl text-gray-900 leading-tight">
                      {t("pack.chat.assistant")}
                    </h3>
                    <p className="text-green-600 text-sm">{t("pack.chat.online")}</p>
                  </div>
                  <div className="ml-auto">
                    <LanguageSelector />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                  {messages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={`flex items-start gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
                    >
                      {message.role === "ai" ? (
                        <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md shadow-blue-200">
                          <Bot className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-pink-500 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md shadow-orange-200">
                          <span className="text-xs font-bold">U</span>
                        </div>
                      )}
                      <div className={`max-w-[85%] ${message.role === "user" ? "text-right" : ""}`}>
                        {message.role === "ai" ? (
                          <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm prose prose-sm prose-blue max-w-none
                            prose-headings:text-blue-800 prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1 prose-headings:text-sm
                            prose-h2:border-b prose-h2:border-blue-100 prose-h2:pb-1
                            prose-p:text-gray-700 prose-p:leading-relaxed prose-p:text-sm
                            prose-li:text-gray-700 prose-li:leading-relaxed prose-li:text-sm prose-li:marker:text-blue-500
                            prose-strong:text-blue-900
                            prose-a:text-blue-600 prose-a:underline prose-a:decoration-blue-300 hover:prose-a:text-blue-800
                            prose-ul:my-1 prose-ol:my-1"
                          >
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl px-4 py-2.5 shadow-sm text-sm">
                            {message.content}
                          </div>
                        )}
                        {message.role === "ai" && index > 0 && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-gray-400 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5 flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" /> OpenAI
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md shadow-blue-200">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm text-gray-500 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                        <span className="text-sm">{t("pack.chat.loading")}</span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                <div className="border border-gray-200 rounded-xl p-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={t("pack.chat.placeholder")}
                    disabled={isLoading}
                    className="flex-1 bg-transparent outline-none px-2 py-2 text-gray-700 placeholder:text-gray-400 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={isLoading || chatInput.trim().length === 0}
                    className="h-10 w-10 rounded-lg bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition disabled:opacity-50"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
