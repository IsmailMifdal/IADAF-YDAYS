"use client";

import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileText,
  FolderOpen,
  Upload,
  type LucideIcon,
} from "lucide-react";
import HeaderPage from "../../components/ui/PageHeader";

type AnalysisStatus = "Conforme" | "En analyse";

type UploadedDocument = {
  id: string;
  file: File;
  status: AnalysisStatus;
};

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function Documents() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedDocument[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [rejectedCount, setRejectedCount] = useState(0);

  const stats = useMemo(() => {
    const total = uploadedFiles.length;
    const conformes = uploadedFiles.filter(
      (doc) => doc.status === "Conforme",
    ).length;
    const enAnalyse = uploadedFiles.filter(
      (doc) => doc.status === "En analyse",
    ).length;

    return {
      total,
      conformes,
      enAnalyse,
      aCorriger: rejectedCount,
    };
  }, [uploadedFiles, rejectedCount]);

  const addFiles = (files: File[]) => {
    const validFiles: UploadedDocument[] = [];
    let hasInvalidFile = false;

    files.forEach((file) => {
      const isValidType = ALLOWED_TYPES.includes(file.type);
      const isValidSize = file.size <= MAX_FILE_SIZE;

      if (!isValidType || !isValidSize) {
        hasInvalidFile = true;
        return;
      }

      validFiles.push({
        id: `${file.name}-${file.lastModified}-${Math.random()}`,
        file,
        status: file.type === "application/pdf" ? "Conforme" : "En analyse",
      });
    });

    if (validFiles.length > 0) {
      setUploadedFiles((prev) => [...prev, ...validFiles]);
      setErrorMessage("");
    }

    if (hasInvalidFile) {
      setRejectedCount((prev) => prev + (files.length - validFiles.length));
      setErrorMessage(
        "Certains fichiers sont invalides. Formats acceptés : PDF, JPG, PNG (Max 10MB).",
      );
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    addFiles(files);
    event.target.value = "";
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    const files = Array.from(event.dataTransfer.files ?? []);
    if (files.length === 0) return;
    addFiles(files);
  };

  return (
    <div>
      <HeaderPage
        title="Mes Documents"
        subtitle="Gérez tous vos documents administratifs en un seul endroit."
      />

      <div className="bg-gray-50 min-h-screen px-4 md:px-8 py-10">
        <div className="max-w-6xl mx-auto w-full space-y-6">
          <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatsCard label="Total" value={stats.total} variant="neutral" />
            <StatsCard
              label="Conformes"
              value={stats.conformes}
              variant="green"
            />
            <StatsCard
              label="En analyse"
              value={stats.enAnalyse}
              variant="blue"
            />
            <StatsCard
              label="À corriger"
              value={stats.aCorriger}
              variant="orange"
            />
          </section>

          <UploadZone
            isDragActive={isDragActive}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onSelectFiles={() => inputRef.current?.click()}
          />

          <input
            ref={inputRef}
            type="file"
            hidden
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleInputChange}
          />

          {errorMessage && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {errorMessage}
            </p>
          )}

          {uploadedFiles.length === 0 ? (
            <section className="bg-white border border-gray-200 rounded-xl p-10 flex flex-col items-center justify-center gap-4 text-center">
              <FileText className="w-10 h-10 text-gray-400" />
              <h2 className="text-xl font-semibold text-gray-900">
                Aucun document
              </h2>
              <p className="text-gray-600">
                Ajoutez vos premiers fichiers pour commencer.
              </p>
            </section>
          ) : (
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {uploadedFiles.map((document) => (
                <DocumentCard key={document.id} file={document.file} />
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

type StatsCardProps = {
  label: string;
  value: number;
  variant: "neutral" | "green" | "blue" | "orange";
};

function StatsCard({ label, value, variant }: StatsCardProps) {
  const styles: Record<
    StatsCardProps["variant"],
    {
      card: string;
      label: string;
      value: string;
      icon: string;
      iconComponent: LucideIcon;
    }
  > = {
    neutral: {
      card: "bg-white border-gray-200",
      label: "text-gray-500",
      value: "text-gray-900",
      icon: "text-gray-400",
      iconComponent: FolderOpen,
    },
    green: {
      card: "bg-green-50 border-green-200",
      label: "text-green-700",
      value: "text-green-700",
      icon: "text-green-500",
      iconComponent: CheckCircle2,
    },
    blue: {
      card: "bg-blue-50 border-blue-200",
      label: "text-blue-700",
      value: "text-blue-700",
      icon: "text-blue-500",
      iconComponent: Clock3,
    },
    orange: {
      card: "bg-orange-50 border-orange-200",
      label: "text-orange-700",
      value: "text-orange-700",
      icon: "text-orange-500",
      iconComponent: AlertTriangle,
    },
  };

  const variantStyle = styles[variant];
  const Icon = variantStyle.iconComponent;

  return (
    <article
      className={`border rounded-xl p-5 flex flex-col gap-1 ${variantStyle.card}`}
    >
      <div className="flex items-center justify-between">
        <p className={`text-sm ${variantStyle.label}`}>{label}</p>
        <Icon className={`w-4 h-4 ${variantStyle.icon}`} />
      </div>
      <p className={`text-2xl font-semibold ${variantStyle.value}`}>{value}</p>
    </article>
  );
}

type UploadZoneProps = {
  isDragActive: boolean;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnter: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  onSelectFiles: () => void;
};

function UploadZone({
  isDragActive,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  onSelectFiles,
}: UploadZoneProps) {
  return (
    <section
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center gap-4 text-center bg-white transition ${
        isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
      }`}
    >
      <Upload className="w-10 h-10 text-gray-400" />
      <h2 className="text-2xl font-bold text-gray-900">Déposez vos fichier</h2>
      <p className="text-gray-600">ou cliquez pour sélectionner des fichiers</p>
      <button
        type="button"
        onClick={onSelectFiles}
        className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-lg transition"
      >
        Sélectionner des fichiers
      </button>
      <p className="text-sm text-gray-500">
        Formats acceptés : PDF, JPG, PNG (Max 10MB)
      </p>
    </section>
  );
}

type DocumentCardProps = {
  file: File;
};

function DocumentCard({ file }: DocumentCardProps) {
  const extension = file.name.split(".").pop()?.toUpperCase() ?? "Fichier";
  const sizeInMb = (file.size / (1024 * 1024)).toFixed(2);

  return (
    <article className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {file.name}
        </p>
        <p className="text-sm text-gray-500">
          {extension} • {sizeInMb} MB
        </p>
      </div>
      <FileText className="w-5 h-5 text-gray-400 shrink-0" />
    </article>
  );
}
