"use client";

export default function Settings() {
  return (
    <div className="space-y-10">
      {/* HERO */}
      <section className="bg-blue-800 text-white p-10 rounded-2xl">
        <h1 className="text-4xl font-bold mb-4">⚙️ Paramètres</h1>

        <p className="text-lg max-w-2xl text-blue-100">
          Gérez vos préférences et informations personnelles.
        </p>
      </section>

      {/* PARAMÈTRES */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SettingCard
          title="🌍 Langue"
          description="Choisissez la langue d’affichage."
          action="Changer"
        />

        <SettingCard
          title="🔔 Notifications"
          description="Recevoir des rappels pour vos démarches."
          action="Gérer"
        />

        <SettingCard
          title="🔐 Sécurité"
          description="Modifier votre mot de passe."
          action="Modifier"
        />

        <SettingCard
          title="🗑️ Compte"
          description="Supprimer votre compte."
          action="Supprimer"
          danger
        />
      </section>

      {/* MESSAGE RASSURANT */}
      <section className="bg-white dark:bg-blue-500 p-6 shadow rounded-xl">
        <p className="text-zinc-700 dark:text-blue-100 text-lg">
          💡 Vos paramètres peuvent être modifiés à tout moment.
        </p>
      </section>
    </div>
  );
}

/* --- Composant interne --- */
function SettingCard({
  title,
  description,
  action,
  danger = false,
}: {
  title: string;
  description: string;
  action: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl bg-white dark:bg-blue-500 p-6 shadow hover:shadow-md transition flex justify-between items-center">
      <div>
        <h2 className="text-xl font-semibold text-blue-800 dark:text-white mb-1">
          {title}
        </h2>

        <p className="text-zinc-600 dark:text-blue-100">{description}</p>
      </div>

      <button
        className={`
          rounded-xl px-4 py-2 font-semibold transition
          ${
            danger
              ? "bg-red-500 hover:bg-red-600 text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }
        `}
      >
        {action}
      </button>
    </div>
  );
}
