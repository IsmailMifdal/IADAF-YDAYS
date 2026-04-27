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

  /** Health check. */
  async health(): Promise<HealthResponse> {
    const res = await fetch("/api/ai/health");
    if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
    return res.json();
  },
};

