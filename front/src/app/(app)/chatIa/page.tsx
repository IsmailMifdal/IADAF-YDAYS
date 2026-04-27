"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, Send, Loader2, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import PageHeader from "../../components/ui/PageHeader";
import { api, type ChatResponse } from "../../lib/api";

type Message = {
  role: "assistant" | "user";
  content: string;
  timestamp: string;
};

function timeNow(): string {
  return new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function ChatIa() {
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Set initial message on client only to avoid hydration mismatch (timeNow differs server/client)
  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content:
          "Bonjour ! Je suis votre assistant IA. Je peux vous aider pour vos d\u00e9marches administratives. Que souhaitez-vous faire aujourd\u2019hui ?",
        timestamp: timeNow(),
      },
    ]);
  }, []);

  const isSendDisabled = inputValue.trim().length === 0 || isLoading;

  const suggestions = [
    "Comment obtenir une carte vitale ?",
    "Inscription \u00e0 P\u00f4le Emploi",
    "Demande d\u2019allocations CAF",
    "Renouvellement titre de s\u00e9jour",
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMsg: Message = { role: "user", content: text.trim(), timestamp: timeNow() };
      setMessages((prev) => [...prev, userMsg]);
      setInputValue("");
      setIsLoading(true);

      try {
        const res: ChatResponse = await api.chat({
          message: text.trim(),
          conversation_id: conversationId,
          language: "fr",
        });

        setConversationId(res.conversation_id);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: res.response, timestamp: timeNow() },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "D\u00e9sol\u00e9, une erreur est survenue. Veuillez r\u00e9essayer.",
            timestamp: timeNow(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [conversationId, isLoading],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PageHeader
        title="Assistant IA"
        subtitle="Posez vos questions sur les d\u00e9marches administratives"
        className="px-6 md:px-10"
        rightContent={
          <button
            type="button"
            className="bg-blue-700 px-4 py-2 rounded-lg text-sm flex items-center gap-2"
          >
            <span>{"\ud83c\udf10"}</span>
            Fran\u00e7ais
          </button>
        }
      />

      <section className="flex-1 min-h-0 w-full max-w-7xl mx-auto px-4 md:px-8 py-6 flex flex-col">
        <div className="flex-1 min-h-0 p-2 md:p-4 flex flex-col">
          <div className="flex-1 overflow-y-auto flex flex-col gap-6 pr-1">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex items-start gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                {msg.role === "assistant" ? (
                  <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-200">
                    <Bot className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="w-11 h-11 bg-gradient-to-br from-orange-400 to-pink-500 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-orange-200">
                    <span className="text-sm font-bold">U</span>
                  </div>
                )}
                <div className={`max-w-[85%] ${msg.role === "user" ? "text-right" : ""}`}>
                  {msg.role === "assistant" ? (
                    <div className="bg-white border border-gray-100 rounded-2xl px-6 py-4 shadow-sm prose prose-sm prose-blue max-w-none
                      prose-headings:text-blue-800 prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2 prose-headings:text-base
                      prose-h2:border-b prose-h2:border-blue-100 prose-h2:pb-1
                      prose-p:text-gray-700 prose-p:leading-relaxed
                      prose-li:text-gray-700 prose-li:leading-relaxed prose-li:marker:text-blue-500
                      prose-strong:text-blue-900
                      prose-a:text-blue-600 prose-a:underline prose-a:decoration-blue-300 hover:prose-a:text-blue-800
                      prose-ul:my-1 prose-ol:my-1"
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl px-5 py-3 shadow-sm">
                      {msg.content}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <p className="text-xs text-gray-400">{msg.timestamp}</p>
                    {msg.role === "assistant" && idx > 0 && (
                      <span className="text-[10px] text-gray-400 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5 flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" /> OpenAI
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-200">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl px-6 py-4 shadow-sm text-gray-500 flex items-center gap-3">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  <span className="text-sm">L&apos;IA génère votre réponse…</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {messages.length === 1 && (
            <div className="border-t border-gray-100 pt-4 pb-4 mt-4">
              <p className="text-sm text-gray-500 mb-3 font-medium">💡 Suggestions :</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => sendMessage(suggestion)}
                    className="border border-blue-100 bg-blue-50/50 rounded-xl px-4 py-3 text-sm text-blue-700 hover:bg-blue-100 hover:border-blue-200 transition-all text-left"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <input
              type="text"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Posez votre question sur une démarche administrative…"
              disabled={isLoading}
              className="flex-1 border border-gray-200 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 shadow-sm"
            />
            <button
              type="button"
              disabled={isSendDisabled}
              onClick={() => sendMessage(inputValue)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white px-6 py-3.5 rounded-2xl flex items-center gap-2 transition-all shadow-sm hover:shadow-md"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span className="text-sm font-medium">Envoyer</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}