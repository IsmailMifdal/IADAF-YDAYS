"use client";

import { useState } from "react";
import { Sparkles, Send } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";

export default function ChatIa() {
  const [inputValue, setInputValue] = useState("");
  const isSendDisabled = inputValue.trim().length === 0;

  const suggestions = [
    "Comment obtenir une carte vitale ?",
    "Inscription à Pôle Emploi",
    "Demande d'allocations CAF",
    "Renouvellement titre de séjour",
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PageHeader
        title="Assistant IA"
        subtitle="Posez vos questions sur les démarches administratives"
        className="px-6 md:px-10"
        rightContent={
          <button
            type="button"
            className="bg-blue-700 px-4 py-2 rounded-lg text-sm flex items-center gap-2"
          >
            <span>🌐</span>
            Français
          </button>
        }
      />

      <section className="flex-1 min-h-0 w-full max-w-7xl mx-auto px-4 md:px-8 py-6 flex flex-col">
        <div className="flex-1 min-h-0 p-2 md:p-4 flex flex-col">
          <div className="flex-1 overflow-y-auto flex flex-col gap-6 pr-1">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                <Sparkles className="w-6 h-6" />
              </div>

              <div>
                <div className="bg-gray-100 rounded-xl px-5 py-3 text-gray-800">
                  Bonjour ! Je suis votre assistant IA. Je peux vous aider pour
                  vos démarches administratives. Que souhaitez-vous faire
                  aujourd’hui ?
                </div>
                <p className="text-xs text-gray-400 mt-2">10:24</p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4 border-b border-gray-200 pb-4 mt-4">
            <p className="text-sm text-gray-500 mb-3">Suggestions :</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setInputValue(suggestion)}
                  className="border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition text-left"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <input
              type="text"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder="Écrivez votre question ici..."
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              disabled={isSendDisabled}
              className="bg-orange-400 hover:bg-orange-500 disabled:bg-orange-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl flex items-center gap-2 transition"
            >
              <Send className="w-4 h-4" />
              <span>Envoyer</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
