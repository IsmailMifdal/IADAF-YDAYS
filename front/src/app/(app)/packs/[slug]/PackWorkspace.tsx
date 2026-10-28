"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import type { PackData } from "../packsData";
import {
  CHECK_LABELS,
  DOCUMENT_RETENTION_DAYS,
  EXTRA_DOCUMENT_PREFIX,
  MAX_DOCUMENT_BYTES,
  type CheckStatus,
  type DocumentAnalysis,
  type StoredDocument,
} from "../../../lib/documentTypes";
import HeaderPage from "../../../components/ui/PageHeader";
import { api, ChatStreamError } from "../../../lib/api";
import { useToast } from "../../../components/ui/Toast";
import { useLanguage } from "../../../context/LanguageContext";
import { fmt, type Messages } from "../../../i18n";
import { precheckMessage } from "../../../lib/precheckMessages";
import LanguageSelector from "../../../components/ui/LanguageSelector";

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_SIZE = MAX_DOCUMENT_BYTES;

function formatSize(bytes: number, t: Messages["workspace"]) {
  return fmt(t.sizeMb, { size: (bytes / (1024 * 1024)).toFixed(2) });
}

function validateFile(file: File, t: Messages["workspace"]) {
  if (!ALLOWED_TYPES.includes(file.type)) return t.badType;
  if (file.size > MAX_SIZE) return t.tooLarge;
  return null;
}

const CHECK_STYLE: Record<CheckStatus, string> = {
  ok: "text-emerald-700",
  warning: "text-amber-700",
  error: "text-red-700",
  unknown: "text-gray-500",
};

const CHECK_MARK: Record<CheckStatus, string> = {
  ok: "✓",
  warning: "!",
  error: "✕",
  unknown: "?",
};

/**
 * Result of the automated pre-check, under a filed piece. Each verdict can be
 * reported as wrong: an anonymous count that measures how reliable each check
 * is (see /api/precheck/disputes).
 */
function PrecheckResult({ analysis }: { analysis: DocumentAnalysis }) {
  const { m, lang } = useLanguage();
  const t = m.workspace;
  const [reported, setReported] = useState<Record<string, "sending" | "sent" | "failed">>({});

  const report = async (check: DocumentAnalysis["checks"][number]) => {
    setReported((prev) => ({ ...prev, [check.id]: "sending" }));
    const res = await fetch("/api/precheck/disputes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: analysis.category, checkId: check.id, status: check.status }),
    }).catch(() => null);
    setReported((prev) => ({ ...prev, [check.id]: res?.ok ? "sent" : "failed" }));
  };

  return (
    <ul className="mt-1.5 mb-1 ms-14 space-y-0.5 text-xs" aria-label={t.precheckLabel}>
      {analysis.checks.map((check) => (
        <li key={check.id} className={`flex flex-wrap gap-x-1.5 ${CHECK_STYLE[check.status]}`}>
          <span aria-hidden className="font-semibold">{CHECK_MARK[check.status]}</span>
          <span>{precheckMessage(m, lang, check)}</span>
          {check.status !== "unknown" &&
            (reported[check.id] === "sent" ? (
              <span className="text-gray-500">{t.reported}</span>
            ) : (
              <button
                type="button"
                disabled={reported[check.id] === "sending"}
                onClick={() => report(check)}
                className="text-gray-500 underline decoration-dotted hover:text-gray-700 disabled:opacity-50"
              >
                {reported[check.id] === "failed" ? t.reportRetry : t.reportWrong}
              </button>
            ))}
        </li>
      ))}
    </ul>
  );
}

type ChatMessage = {
  role: "ai" | "user";
  content: string;
};

/**
 * A pack with its paid content, handed over by the server once access is
 * verified: the pieces to file (French names, the keys they are stored under)
 * and their labels in the visitor's language.
 */
export type PackWithContent = PackData & {
  requiredDocuments: string[];
  documentLabels: Record<string, string>;
};

/**
 * Interactive workspace for a pack the user owns.
 *
 * Access is enforced by the server component in `page.tsx` — by the time this
 * renders, entitlement has already been verified against the database, and the
 * paid content arrives as props rather than from a module in the bundle.
 */
export default function PackWorkspace({
  pack,
  initialDocuments,
}: {
  pack: PackWithContent;
  /** Pieces already filed, or null when the document service was unreachable. */
  initialDocuments: StoredDocument[] | null;
}) {
  const { lang, m } = useLanguage();
  const t = m.workspace;
  const { toast } = useToast();
  const labelOf = (name: string) => pack.documentLabels[name] ?? name;

  // Filed on the server as soon as they are chosen: nothing is kept only in
  // the browser, where a reload would lose it.
  const [documents, setDocuments] = useState<StoredDocument[]>(initialDocuments ?? []);
  /** Slot (document type) being uploaded or removed, for its spinner. */
  const [busySlot, setBusySlot] = useState<string | null>(null);
  const bySlot = useMemo(
    () => Object.fromEntries(documents.map((d) => [d.documentType, d])) as Record<string, StoredDocument>,
    [documents],
  );
  /** Latest pre-check per document id. */
  const [analyses, setAnalyses] = useState<Record<string, DocumentAnalysis>>({});
  /** Set when the automated pre-check is switched off on this server. */
  const [precheckUnavailable, setPrecheckUnavailable] = useState(false);
  const extraDocuments = useMemo(
    () => documents.filter((d) => d.documentType.startsWith(EXTRA_DOCUMENT_PREFIX)),
    [documents],
  );
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
  const isWelcoming = messages.length === 0;
  const isBusy = isLoading || isWelcoming;
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const dropInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fait défiler la liste des messages, pas la page : scrollIntoView amenait
  // aussi la fenêtre en bas, sous le titre du pack, dès l'accueil de l'assistant.
  useEffect(() => {
    const list = messagesEndRef.current?.parentElement;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Envoie un message de bienvenue contextuel au pack choisi, à l'ouverture
  // puis à chaque changement de langue.
  useEffect(() => {
    // Une réponse arrivée après un changement de langue est ignorée.
    let cancelled = false;

    const docsList = pack.requiredDocuments
      .map((d) => `- ${pack.documentLabels[d] ?? d}`)
      .join("\n");

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
        setMessages([
          {
            role: "ai",
            content: fmt(t.fallbackWelcome, { title: pack.title, docs: docsList }),
          },
        ]);
      });

    return () => {
      cancelled = true;
    };
  }, [pack, lang, t]);

  const uploadedCount = documents.length;

  /**
   * Demande à l'IA de vérifier la complétude du dossier.
   *
   * L'endpoint analyse du texte, pas des fichiers : on lui transmet l'état du
   * dossier (pièces fournies, pièces manquantes) plutôt que le contenu des
   * PDF, qui exigerait une extraction OCR. Le résultat arrive dans le fil de
   * discussion, là où l'utilisateur lit déjà les réponses de l'assistant.
   */
  const handleAnalyze = useCallback(async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);

    // 1. Automated pre-check of each filed piece, one at a time.
    const results: Record<string, DocumentAnalysis> = {};
    let unavailable = false;
    for (const document of documents) {
      try {
        const res = await fetch(`/api/documents/${document.id}/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentType: document.documentType }),
        });
        if (res.status === 503) {
          unavailable = true;
          break;
        }
        if (res.ok) results[document.id] = await res.json();
      } catch {
        // A failed piece keeps no result; the others still get theirs.
      }
    }
    setAnalyses(results);
    setPrecheckUnavailable(unavailable);

    // 2. Completeness advice from the assistant. It gets the pieces' names and
    //    which checks raised a point — never a date, name or number read in
    //    a document.
    const flagged = documents
      .map((d) => [d, results[d.id]] as const)
      .filter(([, a]) => a && (a.status === "error" || a.status === "warning"))
      .map(([d, a]) => {
        const points = a!.checks
          .filter((c) => c.status === "error" || c.status === "warning")
          .map((c) => `${c.status === "error" ? "problème" : "à vérifier"} (${CHECK_LABELS[c.id] ?? c.id})`);
        return `- ${d.documentType} : ${points.join(", ")}`;
      });

    const provided = pack.requiredDocuments.filter((d) => bySlot[d]);
    const missing = pack.requiredDocuments.filter((d) => !bySlot[d]);

    const summary = [
      `Démarche : ${pack.title}`,
      "",
      `Pièces fournies (${provided.length}/${pack.requiredDocuments.length}) :`,
      ...(provided.length ? provided.map((d) => `- ${d}`) : ["- aucune"]),
      "",
      `Pièces encore manquantes (${missing.length}) :`,
      ...(missing.length ? missing.map((d) => `- ${d}`) : ["- aucune"]),
      ...(extraDocuments.length
        ? ["", `Fichiers supplémentaires : ${extraDocuments.length}`]
        : []),
      ...(flagged.length
        ? ["", "Points relevés par la pré-vérification automatique :", ...flagged]
        : []),
    ].join("\n");

    try {
      const res = await api.analyzeDocument({
        document_content: summary,
        document_type: pack.slug,
        language: lang.toUpperCase(),
      });

      const parts = [res.analysis];
      if (res.missing_info?.length) {
        parts.push(
          `\n**${t.toComplete}**\n` +
            res.missing_info.map((item) => `- ${item}`).join("\n"),
        );
      }
      if (res.recommendations?.length) {
        parts.push(
          `\n**${t.recommendations}**\n` +
            res.recommendations.map((item) => `- ${item}`).join("\n"),
        );
      }

      setMessages((prev) => [
        ...prev,
        { role: "ai", content: parts.join("\n") },
      ]);
      toast(t.analysisDone);
    } catch {
      toast(t.analysisFailed, "danger");
    } finally {
      setIsAnalyzing(false);
    }
  }, [pack, isAnalyzing, documents, bySlot, extraDocuments, lang, toast, t]);

  const handleSendMessage = useCallback(async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || isBusy) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setChatInput("");
    setIsLoading(true);

    // Streamed: a long answer takes longer to generate than the gateway
    // waits for a silent response (30 s), and would end in an error.
    setMessages((prev) => [...prev, { role: "ai", content: "" }]);
    const showAnswer = (content: string) =>
      setMessages((prev) => [...prev.slice(0, -1), { ...prev[prev.length - 1], content }]);

    try {
      const packContext = pack
        ? `[CONTEXTE : L'utilisateur travaille sur la démarche "${pack.title}" (${pack.shortDescription}). Réponds UNIQUEMENT en rapport avec cette démarche. Ne parle pas d'autres démarches.]\n\nQuestion de l'utilisateur : `
        : "";
      const res = await api.chatStream(
        { message: packContext + trimmed, conversation_id: conversationId, language: lang },
        showAnswer,
      );
      setConversationId(res.conversation_id);
    } catch (error) {
      showAnswer(
        error instanceof ChatStreamError && error.partial
          ? `${error.partial}\n\n_${m.chat.interrupted}_`
          : m.packChat.error,
      );
    } finally {
      setIsLoading(false);
    }
  }, [chatInput, conversationId, isBusy, pack, lang, m]);

  const uploadDocument = async (documentType: string, file: File) => {
    const validationError = validateFile(file, t);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setErrorMessage("");
    setBusySlot(documentType);
    try {
      const form = new FormData();
      form.set("packSlug", pack.slug);
      form.set("documentType", documentType);
      form.set("file", file);
      const res = await fetch("/api/documents", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMessage(data.error ?? m.errors.uploadFailed);
        return;
      }
      setDocuments((prev) => [...prev.filter((d) => d.documentType !== documentType), data]);
      toast(t.filed);
    } catch {
      setErrorMessage(m.common.networkError);
    } finally {
      setBusySlot(null);
    }
  };

  const removeStoredDocument = async (document: StoredDocument) => {
    setErrorMessage("");
    setBusySlot(document.documentType);
    try {
      const query = new URLSearchParams({ packSlug: pack.slug, documentType: document.documentType });
      const res = await fetch(`/api/documents/${document.id}?${query}`, { method: "DELETE" });
      // 404: already gone — the outcome the user asked for.
      if (!res.ok && res.status !== 404) {
        setErrorMessage(m.errors.deleteFailed);
        return;
      }
      setDocuments((prev) => prev.filter((d) => d.id !== document.id));
      toast(t.removed);
    } catch {
      setErrorMessage(m.common.networkError);
    } finally {
      setBusySlot(null);
    }
  };

  const handleDocumentInput = (documentName: string, file: File | null) => {
    if (file) void uploadDocument(documentName, file);
  };

  const addDroppedFiles = async (fileList: File[]) => {
    // One at a time: the spinner, the toasts and the rate limit stay readable.
    for (const file of fileList) {
      const name = file.name.slice(0, 200 - EXTRA_DOCUMENT_PREFIX.length) || "file";
      await uploadDocument(`${EXTRA_DOCUMENT_PREFIX}${name}`, file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const files = Array.from(event.dataTransfer.files ?? []);
    if (files.length === 0) return;
    void addDroppedFiles(files);
  };

  const removeDocument = (documentName: string) => {
    const document = bySlot[documentName];
    if (document) void removeStoredDocument(document);
  };

  const totalDocs = pack.requiredDocuments.length;
  const filledDocs = pack.requiredDocuments.filter((doc) => bySlot[doc]).length;
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
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-indigo-700 flex items-center justify-center text-white shrink-0 shadow-md shadow-brand-200">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{t.yourDocuments}</h3>
                  <p className="text-sm text-gray-500">{t.yourDocumentsText}</p>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">{m.folders.progress}</span>
                  <span className="text-sm font-semibold text-brand-700">
                    {fmt(t.documentsCount, { done: filledDocs, total: totalDocs })}
                  </span>
                </div>
                <div
                  className="h-2 w-full bg-gray-100 rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={filledDocs}
                  aria-valuemin={0}
                  aria-valuemax={totalDocs}
                  aria-label={t.filedLabel}
                >
                  <div
                    className="h-full bg-gradient-to-r from-brand-500 to-indigo-600 rounded-full transition-all duration-500 rtl:bg-gradient-to-l"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              {/* Cartes documents */}
              <div className="space-y-3">
                {pack.requiredDocuments.map((document) => {
                  const file = bySlot[document];
                  const isBusy = busySlot === document;
                  const analysis = file ? analyses[file.id] : undefined;
                  return (
                    <div key={document}>
                    <label
                      className={`group flex items-center gap-4 p-3.5 rounded-xl border cursor-pointer transition duration-200 ease-out active:scale-[0.99] motion-reduce:active:scale-100 focus-within:ring-2 focus-within:ring-brand-500 focus-within:ring-offset-2 ${
                        file
                          ? "border-emerald-200 bg-emerald-50/60"
                          : "border-gray-200 hover:border-brand-300 hover:bg-brand-50/40"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition ${
                          file
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-gray-100 text-gray-400 group-hover:bg-brand-100 group-hover:text-brand-500"
                        }`}
                      >
                        {isBusy ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : file ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          <FileText className="w-5 h-5" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {labelOf(document)}
                        </p>
                        {/* Le nom français : celui des sites et courriers de l'administration. */}
                        {labelOf(document) !== document && (
                          <p className="text-[11px] text-gray-400 truncate" lang="fr" dir="ltr">
                            {document}
                          </p>
                        )}
                        {file ? (
                          <p className="text-xs text-emerald-600 truncate">
                            {file.originalFilename} · {formatSize(file.sizeBytes, t)} ·{" "}
                            <a
                              href={`/api/documents/${file.id}`}
                              onClick={(event) => event.stopPropagation()}
                              className="underline hover:text-emerald-700"
                            >
                              {t.download}
                            </a>
                          </p>
                        ) : (
                          <p className="text-xs text-gray-400">
                            {t.formats}
                          </p>
                        )}
                      </div>

                      {file ? (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={(event) => {
                            event.preventDefault();
                            removeDocument(document);
                          }}
                          className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                          aria-label={t.removeFile}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="shrink-0 text-xs font-medium bg-brand-600 group-hover:bg-brand-700 text-white px-3 py-1.5 rounded-lg transition">
                          {t.browse}
                        </span>
                      )}

                      <input
                        type="file"
                        hidden
                        disabled={isBusy}
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(event) => {
                          handleDocumentInput(document, event.target.files?.[0] ?? null);
                          // Allows choosing the same file again after an error.
                          event.target.value = "";
                        }}
                      />
                    </label>
                    {analysis && <PrecheckResult analysis={analysis} />}
                    </div>
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
                    ? "border-brand-500 bg-brand-50"
                    : "border-gray-200 hover:border-brand-300 hover:bg-gray-50"
                }`}
              >
                <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1.5" />
                <p className="text-sm text-gray-500">
                  {t.dropzone}
                </p>
                <input
                  ref={dropInputRef}
                  type="file"
                  hidden
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(event) => {
                    void addDroppedFiles(Array.from(event.target.files ?? []));
                    event.target.value = "";
                  }}
                />
              </div>

              {/* Fichiers supplémentaires ajoutés */}
              {extraDocuments.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {extraDocuments.map((file) => (
                    <li
                      key={file.id}
                      className="flex items-center gap-3 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
                    >
                      <FileText className="w-4 h-4 text-brand-500 shrink-0" />
                      <a
                        href={`/api/documents/${file.id}`}
                        className="flex-1 truncate text-gray-700 hover:underline"
                      >
                        {file.originalFilename}
                      </a>
                      <span className="text-xs text-gray-400 shrink-0">
                        {formatSize(file.sizeBytes, t)}
                      </span>
                      <button
                        type="button"
                        disabled={busySlot === file.documentType}
                        onClick={() => void removeStoredDocument(file)}
                        className="text-gray-400 hover:text-red-500 transition"
                        aria-label={t.removeFile}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {initialDocuments === null && (
                <p className="mt-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  {t.loadError}
                </p>
              )}

              <p className="mt-4 text-xs text-gray-400">
                {fmt(t.retention, { days: DOCUMENT_RETENTION_DAYS })}
              </p>

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
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3.5 font-semibold text-white transition duration-200 ease-out hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 active:scale-[0.98] motion-reduce:active:scale-100 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 disabled:active:scale-100"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {t.checking}
                  </>
                ) : (
                  <>
                    {allUploaded && <Check className="h-5 w-5" />}
                    {t.check}
                  </>
                )}
              </button>

              {precheckUnavailable && (
                <p className="mt-3 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  {t.precheckClosed}
                </p>
              )}
              {Object.keys(analyses).length > 0 && (
                <p className="mt-3 text-xs text-gray-500">
                  {t.precheckDisclaimer}
                </p>
              )}

              <p className="mt-2 text-center text-xs text-gray-400">
                {uploadedCount === 0 ? t.checkNeedsOne : t.checkExplains}
              </p>
            </section>

            {/* SECTION 3 - CHAT IA */}
            <aside className="w-full">
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col lg:sticky lg:top-6 h-[600px] lg:h-[calc(100vh-3rem)] p-4 gap-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
                    <MessageSquare className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-2xl text-gray-900 leading-tight">
                      {m.packChat.assistant}
                    </h3>
                    <p className="text-emerald-600 text-sm">{m.packChat.online}</p>
                  </div>
                  <div className="ms-auto">
                    <LanguageSelector />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pe-1">
                  {messages.map((message, index) => message.content === "" ? null : (
                    <div
                      key={`${message.role}-${index}`}
                      className={`flex items-start gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
                    >
                      {message.role === "ai" ? (
                        <div className="w-9 h-9 bg-gradient-to-br from-brand-600 to-indigo-700 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md shadow-brand-200">
                          <Bot className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-9 h-9 bg-gray-200 rounded-xl flex items-center justify-center text-gray-600 shrink-0">
                          <span className="text-xs font-bold">U</span>
                        </div>
                      )}
                      <div className={`max-w-[85%] ${message.role === "user" ? "text-end" : ""}`}>
                        {message.role === "ai" ? (
                          <div dir="auto" className="bg-white border border-gray-200/80 rounded-xl rounded-ss-md px-4 py-3 shadow-xs prose prose-sm max-w-none
                            prose-headings:text-brand-800 prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1 prose-headings:text-sm
                            prose-h2:border-b prose-h2:border-brand-100 prose-h2:pb-1
                            prose-p:text-gray-700 prose-p:leading-relaxed prose-p:text-sm
                            prose-li:text-gray-700 prose-li:leading-relaxed prose-li:text-sm prose-li:marker:text-brand-500
                            prose-strong:text-brand-900
                            prose-a:text-brand-600 prose-a:underline prose-a:decoration-brand-300 hover:prose-a:text-brand-800
                            prose-ul:my-1 prose-ol:my-1"
                          >
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <div dir="auto" className="bg-brand-600 text-white rounded-xl rounded-se-md px-4 py-2.5 shadow-sm text-sm">
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

                  {/* Until the first words of the answer arrive. */}
                  {(isWelcoming || (isLoading && messages[messages.length - 1]?.content === "")) && (
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 bg-gradient-to-br from-brand-600 to-indigo-700 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md shadow-brand-200">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm text-gray-500 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
                        <span className="text-sm">{m.packChat.loading}</span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white p-2 shadow-xs transition focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/15">
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
                    placeholder={m.packChat.placeholder}
                    disabled={isBusy}
                    dir="auto"
                    className="flex-1 bg-transparent outline-none px-2 py-2 text-gray-700 placeholder:text-gray-400 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={isBusy || chatInput.trim().length === 0}
                    aria-label={m.common.send}
                    className="h-10 w-10 rounded-lg bg-brand-600 hover:bg-brand-700 text-white flex items-center justify-center shadow-sm transition disabled:opacity-50"
                  >
                    <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
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
