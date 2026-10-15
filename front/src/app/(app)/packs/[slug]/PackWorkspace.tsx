"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Check,
  FileText,
  Loader2,
  MessageSquare,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getPackBySlug } from "../packsData";
import HeaderPage from "../../../components/ui/PageHeader";
import { api, type ChatResponse } from "../../../lib/api";
import { useToast } from "../../../components/ui/Toast";
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

/**
 * Interactive workspace for a pack the user owns.
 *
 * Access is enforced by the server component in `page.tsx` — by the time this
 * renders, entitlement has already been verified against the database.
 */
export default function PackWorkspace() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const pack = getPackBySlug(slug);
  const { lang, t } = useLanguage();
  const { toast } = useToast();

  const [filesByDocument, setFilesByDocument] = useState<
    Record<string, File | null>
  >({});
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // Language the chat was opened in. A change restarts the conversation —
  // done during render, as React recommends for state derived from a prop,
  // rather than in an effect that would render twice.
  const [chatLang, setChatLang] = useState(lang);
  if (chatLang !== lang) {
    setChatLang(lang);
    setMessages([]);
    setConversationId(undefined);
  }
  // No message yet means the welcome is still on its way.
  const isWelcoming = Boolean(pack) && messages.length === 0;
  const isBusy = isLoading || isWelcoming;
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const dropInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Envoie un message de bienvenue contextuel au pack choisi, à l'ouverture
  // puis à chaque changement de langue.
  useEffect(() => {
    if (!pack) return;
    // Une réponse arrivée après un changement de langue est ignorée.
    let cancelled = false;

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
        if (cancelled) return;
        setConversationId(res.conversation_id);
        setMessages([{ role: "ai", content: res.response }]);
      })
      .catch(() => {
        if (cancelled) return;
        const fallbackDocs = pack.requiredDocuments.map((d) => `- ${d}`).join("\n");
        setMessages([
          {
            role: "ai",
            content: `Bienvenue ! 🎉 Je suis là pour t'accompagner dans ta démarche **${pack.title}**.\n\n📋 **Documents à préparer :**\n${fallbackDocs}\n\nN'hésite pas à me poser tes questions, je suis là pour t'aider ! 💬`,
          },
        ]);
      });

    return () => {
      cancelled = true;
    };
  }, [pack, lang]);

  const uploadedCount = useMemo(() => {
    return (
      Object.values(filesByDocument).filter(Boolean).length +
      droppedFiles.length
    );
  }, [filesByDocument, droppedFiles]);

  /**
   * Demande à l'IA de vérifier la complétude du dossier.
   *
   * L'endpoint analyse du texte, pas des fichiers : on lui transmet l'état du
   * dossier (pièces fournies, pièces manquantes) plutôt que le contenu des
   * PDF, qui exigerait une extraction OCR. Le résultat arrive dans le fil de
   * discussion, là où l'utilisateur lit déjà les réponses de l'assistant.
   */
  const handleAnalyze = useCallback(async () => {
    if (!pack || isAnalyzing) return;

    const provided = pack.requiredDocuments.filter((d) => filesByDocument[d]);
    const missing = pack.requiredDocuments.filter((d) => !filesByDocument[d]);

    const summary = [
      `Démarche : ${pack.title}`,
      "",
      `Pièces fournies (${provided.length}/${pack.requiredDocuments.length}) :`,
      ...(provided.length ? provided.map((d) => `- ${d}`) : ["- aucune"]),
      "",
      `Pièces encore manquantes (${missing.length}) :`,
      ...(missing.length ? missing.map((d) => `- ${d}`) : ["- aucune"]),
      ...(droppedFiles.length
        ? ["", `Fichiers supplémentaires : ${droppedFiles.length}`]
        : []),
    ].join("\n");

    setIsAnalyzing(true);
    try {
      const res = await api.analyzeDocument({
        document_content: summary,
        document_type: pack.slug,
        language: lang.toUpperCase(),
      });

      const parts = [res.analysis];
      if (res.missing_info?.length) {
        parts.push(
          "\n**Points à compléter :**\n" +
            res.missing_info.map((item) => `- ${item}`).join("\n"),
        );
      }
      if (res.recommendations?.length) {
        parts.push(
          "\n**Recommandations :**\n" +
            res.recommendations.map((item) => `- ${item}`).join("\n"),
        );
      }

      setMessages((prev) => [
        ...prev,
        { role: "ai", content: parts.join("\n") },
      ]);
      toast("Analyse de votre dossier terminée.");
    } catch {
      toast("L’analyse a échoué. Réessayez dans un instant.", "danger");
    } finally {
      setIsAnalyzing(false);
    }
  }, [pack, isAnalyzing, filesByDocument, droppedFiles, lang, toast]);

  const handleSendMessage = useCallback(async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || isBusy) return;

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
  }, [chatInput, conversationId, isBusy, pack, lang, t]);

  if (!pack) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-12">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Pack introuvable
          </h1>
          <p className="text-gray-600 mt-2">
            Le pack demandé n’existe pas ou n’est plus disponible.
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

  const removeDocument = (documentName: string) => {
    setFilesByDocument((prev) => ({ ...prev, [documentName]: null }));
  };

  const removeDroppedFile = (index: number) => {
    setDroppedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const totalDocs = pack.requiredDocuments.length;
  const filledDocs = pack.requiredDocuments.filter(
    (doc) => filesByDocument[doc],
  ).length;
  const progressPct = totalDocs ? Math.round((filledDocs / totalDocs) * 100) : 0;
  const allUploaded = filledDocs === totalDocs;

  return (
    <div>
      <HeaderPage title={pack.title} subtitle={pack.shortDescription} />

      {/* Largeur alignée sur PageContainer width="wide" : la page utilisait
          un max-w-[1600px] qui ne correspondait à aucune autre. */}
      <div className="bg-gray-50 min-h-full px-4 md:px-8 py-8">
        <div className="max-w-7xl mx-auto animate-fade-up">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-6 items-start">

            {/* SECTION 2 - UPLOAD DES DOCUMENTS */}
            <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
              {/* Header + progression */}
              <div className="flex items-start gap-3 mb-5">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shrink-0 shadow-md shadow-blue-200">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Vos documents
                  </h3>
                  <p className="text-sm text-gray-500">
                    Ajoutez les pièces demandées pour votre démarche.
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">
                    Progression
                  </span>
                  <span className="text-sm font-semibold text-blue-700">
                    {filledDocs}/{totalDocs} documents
                  </span>
                </div>
                <div
                  className="h-2 w-full bg-gray-100 rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={filledDocs}
                  aria-valuemin={0}
                  aria-valuemax={totalDocs}
                  aria-label="Documents déposés"
                >
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              {/* Cartes documents */}
              <div className="space-y-3">
                {pack.requiredDocuments.map((document) => {
                  const file = filesByDocument[document];
                  return (
                    <label
                      key={document}
                      className={`group flex items-center gap-4 p-3.5 rounded-xl border cursor-pointer transition duration-200 ease-out active:scale-[0.99] motion-reduce:active:scale-100 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 ${
                        file
                          ? "border-emerald-200 bg-emerald-50/60"
                          : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/40"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition ${
                          file
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-gray-100 text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-500"
                        }`}
                      >
                        {file ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          <FileText className="w-5 h-5" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {document}
                        </p>
                        {file ? (
                          <p className="text-xs text-emerald-600 truncate">
                            {file.name} · {formatSize(file.size)}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-400">
                            PDF, JPG, PNG · max 10MB
                          </p>
                        )}
                      </div>

                      {file ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            removeDocument(document);
                          }}
                          className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                          aria-label="Retirer le fichier"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="shrink-0 text-xs font-medium bg-blue-600 group-hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition">
                          Parcourir
                        </span>
                      )}

                      <input
                        type="file"
                        hidden
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(event) =>
                          handleDocumentInput(
                            document,
                            event.target.files?.[0] ?? null,
                          )
                        }
                      />
                    </label>
                  );
                })}
              </div>

              {/* Dropzone documents supplémentaires */}
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
                className={`border-dashed border-2 rounded-xl p-5 text-center mt-4 cursor-pointer transition ${
                  isDragging
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                }`}
              >
                <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1.5" />
                <p className="text-sm text-gray-500">
                  Glissez d’autres fichiers ici ou cliquez pour ajouter
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

              {/* Fichiers supplémentaires ajoutés */}
              {droppedFiles.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {droppedFiles.map((file, index) => (
                    <li
                      key={`${file.name}-${file.lastModified}`}
                      className="flex items-center gap-3 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
                    >
                      <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                      <span className="flex-1 truncate text-gray-700">
                        {file.name}
                      </span>
                      <span className="text-xs text-gray-400 shrink-0">
                        {formatSize(file.size)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeDroppedFile(index)}
                        className="text-gray-400 hover:text-red-500 transition"
                        aria-label="Retirer le fichier"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {errorMessage && (
                <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {errorMessage}
                </p>
              )}

              {/* Intitulé « vérifier » et non « analyser » : l'IA contrôle la
                  complétude du dossier, elle ne lit pas le contenu des PDF. */}
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={uploadedCount === 0 || isAnalyzing}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 font-semibold text-white transition duration-200 ease-out hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-[0.98] motion-reduce:active:scale-100 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 disabled:active:scale-100"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Vérification en cours…
                  </>
                ) : (
                  <>
                    {allUploaded && <Check className="h-5 w-5" />}
                    Vérifier mon dossier
                  </>
                )}
              </button>

              <p className="mt-2 text-center text-xs text-gray-400">
                {uploadedCount === 0
                  ? "Déposez au moins une pièce pour lancer la vérification."
                  : "L’assistant vérifie que votre dossier est complet."}
              </p>
            </section>

            {/* SECTION 3 - CHAT IA */}
            <aside className="w-full">
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col lg:sticky lg:top-6 h-[600px] lg:h-[calc(100vh-3rem)] p-4 gap-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                    <MessageSquare className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-2xl text-gray-900 leading-tight">
                      {t("pack.chat.assistant")}
                    </h3>
                    <p className="text-emerald-600 text-sm">{t("pack.chat.online")}</p>
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
                        <div className="w-9 h-9 bg-gray-200 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md shadow-orange-200">
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

                  {isBusy && (
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
                    disabled={isBusy}
                    className="flex-1 bg-transparent outline-none px-2 py-2 text-gray-700 placeholder:text-gray-400 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={isBusy || chatInput.trim().length === 0}
                    className="h-10 w-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition disabled:opacity-50"
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
