"use client";

export default function Profil() {
  return (
    <div className="min-h-full flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 shadow-lg p-8 space-y-6">
        {/* Titre */}
        <h1 className="text-3xl font-bold text-zinc-800 dark:text-zinc-100">
          Mon profil
        </h1>

        {/* Infos utilisateur (placeholder) */}
        <div className="space-y-2 text-zinc-600 dark:text-zinc-400">
          <p>
            <span className="font-medium">Email :</span> user@email.com
          </p>
          <p>
            <span className="font-medium">Compte :</span> Actif
          </p>
        </div>

        {/* Séparation */}
        <div className="h-px bg-zinc-200 dark:bg-zinc-700" />

        {/* Bouton logout */}
        <button
          onClick={() => console.log("logout")}
          className="
            w-full flex items-center justify-center gap-2
            rounded-xl px-4 py-3
            bg-red-500 hover:bg-red-600
            text-white font-semibold
            transition
          "
        >
          🚪 Déconnexion
        </button>
      </div>
    </div>
  );
}
