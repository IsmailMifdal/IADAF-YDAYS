/**
 * API client for the IA-DAF backend (via API Gateway).
 *
 * Requests are proxied by Next.js rewrites:
 *   /api/ai/*  →  http://localhost:8080/api/ai/*
 */

// ── Types ────────────────────────────────────────────────────────────────

export type ChatRequest = {
  message: string;
  conversation_id?: string;
  language?: string;
};

export type ChatResponse = {
  response: string;
  conversation_id: string;
  sources: string[];
};

export type TranslateRequest = {
  text: string;
  target_language: string;
  source_language?: string;
};

export type TranslateResponse = {
  translated_text: string;
  source_language: string;
  target_language: string;
};

export type DocumentAnalysisRequest = {
  document_content: string;
  document_type: string;
  language?: string;
};

export type DocumentAnalysisResponse = {
  analysis: string;
  missing_info: string[];
  recommendations: string[];
};

export type HealthResponse = {
  status: string;
  service: string;
  version: string;
};

// ── Helpers ──────────────────────────────────────────────────────────────

async function post<TReq, TRes>(url: string, body: TReq): Promise<TRes> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`API ${res.status}: ${text}`);
  }

  return res.json();
}

// ── Public API ───────────────────────────────────────────────────────────

export const api = {
  /** Send a chat message and get an AI response. */
  chat(req: ChatRequest) {
    return post<ChatRequest, ChatResponse>("/api/ai/chat", req);
  },

  /** Translate text between supported languages. */
  translate(req: TranslateRequest) {
    return post<TranslateRequest, TranslateResponse>("/api/ai/translate", req);
  },

  /**
   * Analyse la complétude d'un dossier.
   *
   * L'endpoint travaille sur du texte, pas sur des fichiers : on lui décrit
   * l'état du dossier (pièces fournies / manquantes) et il renvoie les points
   * bloquants et des recommandations. Analyser le contenu réel des PDF
   * demanderait une extraction OCR, qui n'existe pas encore.
   */
  analyzeDocument(req: DocumentAnalysisRequest) {
    return post<DocumentAnalysisRequest, DocumentAnalysisResponse>(
      "/api/ai/analyze-document",
      req,
    );
  },

  /** Health check. */
  async health(): Promise<HealthResponse> {
    const res = await fetch("/api/ai/health");
    if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
    return res.json();
  },
};

