"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, MessageSquare, Upload } from "lucide-react";
import { getPackBySlug } from "../packsData";
import { isPackUnlocked } from "../../../lib/mockPayment";
import HeaderPage from "../../../components/ui/PageHeader";

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

  const [filesByDocument, setFilesByDocument] = useState<
    Record<string, File | null>
  >({});
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "ai",
      content:
        "Paiement validé ! Tu peux désormais déposer les fichiers demandés directement dans les champs à gauche. Si tu as la moindre question ou si tu es bloqué(é), n'hésite pas !",
    },
  ]);
  const dropInputRef = useRef<HTMLInputElement>(null);

  const uploadedCount = useMemo(() => {
    return (
      Object.values(filesByDocument).filter(Boolean).length +
      droppedFiles.length
    );
  }, [filesByDocument, droppedFiles]);

  useEffect(() => {
    setHasAccess(isPackUnlocked(slug));
  }, [slug]);

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

  const handleSendMessage = () => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", content: trimmed },
      {
        role: "ai",
        content:
          "Message reçu. Continue à déposer tes documents, je t'aide ensuite pour la vérification.",
      },
    ]);
    setChatInput("");
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
                      Assistant IA
                    </h3>
                    <p className="text-green-600 text-sm">En ligne</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {messages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={`rounded-lg p-3 text-sm ${
                        message.role === "ai"
                          ? "bg-gray-100 text-gray-800"
                          : "bg-red-50 text-red-900 ml-auto max-w-[90%]"
                      }`}
                    >
                      {message.content}
                    </div>
                  ))}
                </div>

                <div className="border border-gray-200 rounded-xl p-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Posez votre question..."
                    className="flex-1 bg-transparent outline-none px-2 py-2 text-gray-700 placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    className="h-10 w-10 rounded-lg bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition"
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
