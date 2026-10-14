"use client";

import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileText,
  FolderOpen,
  Upload,
} from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import {
  Alert,
  Button,
  Card,
  EmptyState,
  PageContainer,
  StatCard,
} from "../../components/ui/primitives";

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
      <PageHeader
        title="Mes Documents"
        subtitle="Déposez vos pièces justificatives : elles sont vérifiées automatiquement."
      />

      <PageContainer>
        <div className="space-y-6">
          <div className="stagger grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Total"
              value={stats.total}
              icon={<FolderOpen className="h-5 w-5" />}
              tone="neutral"
            />
            <StatCard
              label="Conformes"
              value={stats.conformes}
              icon={<CheckCircle2 className="h-5 w-5" />}
              tone="success"
            />
            <StatCard
              label="En analyse"
              value={stats.enAnalyse}
              icon={<Clock3 className="h-5 w-5" />}
              tone="info"
            />
            <StatCard
              label="À corriger"
              value={stats.aCorriger}
              icon={<AlertTriangle className="h-5 w-5" />}
              tone="warning"
            />
          </div>

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
            <Alert tone="danger">{errorMessage}</Alert>
          )}

          {uploadedFiles.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-6 w-6" />}
              title="Aucun document"
              description="Déposez vos premiers fichiers ci-dessus pour lancer leur vérification."
            />
          ) : (
            <section className="stagger grid grid-cols-1 md:grid-cols-2 gap-4">
              {uploadedFiles.map((document) => (
                <DocumentCard key={document.id} file={document.file} />
              ))}
            </section>
          )}
        </div>
      </PageContainer>
    </div>
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
      className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-white p-12 text-center transition ${
        isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
      }`}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
        <Upload className="h-6 w-6" />
      </span>
      <h2 className="text-lg font-semibold text-gray-900">
        Déposez vos fichiers
      </h2>
      <p className="text-sm text-gray-500">
        Glissez-les ici, ou parcourez votre appareil.
      </p>
      <Button onClick={onSelectFiles}>Sélectionner des fichiers</Button>
      <p className="text-xs text-gray-400">
        Formats acceptés : PDF, JPG, PNG — 10 Mo maximum
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
    <Card className="flex items-center gap-3 p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
        <FileText className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">
          {file.name}
        </p>
        <p className="text-xs text-gray-500">
          {extension} • {sizeInMb} Mo
        </p>
      </div>
    </Card>
  );
}
