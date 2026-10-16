/**
 * API client for the IA-DAF backend (via API Gateway).
 *
 * Requests go through the frontend's own proxy route
 * (src/app/api/ai/[...path]), which rate-limits them and signs the internal
 * token the gateway requires.
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

/** A non-2xx answer, with its status so callers can tell a 429 from a crash. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** A streamed answer that broke off; `partial` is what had arrived. */
export class ChatStreamError extends Error {
  constructor(
    message: string,
    readonly partial: string,
  ) {
    super(message);
  }
}

export type ChatStreamResult = {
  conversation_id: string;
  sources: string[];
};

/** How often the answer so far is handed over: re-rendering Markdown for every piece is wasted work. */
const STREAM_RENDER_INTERVAL_MS = 50;

function parseEvent(block: string): { type: string; data: Record<string, unknown> } {
  let type = "message";
  let data = "";
  for (const line of block.split("\n")) {
    if (line.startsWith("event: ")) type = line.slice(7);
    else if (line.startsWith("data: ")) data += line.slice(6);
  }
  return { type, data: data ? JSON.parse(data) : {} };
}

async function chatStream(
  req: ChatRequest,
  onText: (answerSoFar: string) => void,
  signal?: AbortSignal,
): Promise<ChatStreamResult> {
  const res = await fetch("/api/ai/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(req),
    signal,
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "Unknown error");
    throw new ApiError(res.status, `API ${res.status}: ${text}`);
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let answer = "";
  let conversationId = "";
  let timer: ReturnType<typeof setTimeout> | undefined;
  const render = () => {
    clearTimeout(timer);
    timer = undefined;
    onText(answer);
  };

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      let end: number;
      while ((end = buffer.indexOf("\n\n")) !== -1) {
        const event = parseEvent(buffer.slice(0, end));
        buffer = buffer.slice(end + 2);
        if (event.type === "meta") {
          conversationId = String(event.data.conversation_id ?? "");
        } else if (event.type === "token") {
          answer += String(event.data.text ?? "");
          timer ??= setTimeout(render, STREAM_RENDER_INTERVAL_MS);
        } else if (event.type === "done") {
          render();
          return { conversation_id: conversationId, sources: (event.data.sources as string[]) ?? [] };
        } else if (event.type === "error") {
          render();
          throw new ChatStreamError(String(event.data.message ?? ""), answer);
        }
      }
    }
  } finally {
    clearTimeout(timer);
  }
  // The connection closed before `done`.
  onText(answer);
  throw new ChatStreamError("Réponse interrompue.", answer);
}

async function post<TReq, TRes>(url: string, body: TReq): Promise<TRes> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new ApiError(res.status, `API ${res.status}: ${text}`);
  }

  return res.json();
}

// ── Public API ───────────────────────────────────────────────────────────

export const api = {
  /** Send a chat message and get an AI response. */
  chat(req: ChatRequest) {
    return post<ChatRequest, ChatResponse>("/api/ai/chat", req);
  },

  /**
   * Same as `chat`, the answer shown as it is generated: `onText` receives
   * the answer so far, a few times per second. Throws `ApiError` when the
   * request is refused (429 included), `ChatStreamError` when the answer
   * breaks off.
   */
  chatStream,

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

