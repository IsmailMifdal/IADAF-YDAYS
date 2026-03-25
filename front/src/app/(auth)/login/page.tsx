"use client";

export default function Login() {
  return (
    <div className="space-y-10 w-full max-w-5xl">
      {/* HERO */}
      <section className="bg-blue-800 text-white p-10 rounded-2xl">
        <h1 className="text-4xl font-bold mb-4">Connexion / Inscription</h1>

        <p className="text-lg max-w-2xl text-blue-100">
          Connectez-vous ou créez un compte pour être accompagné dans vos
          démarches administratives en France.
        </p>
      </section>

      {/* ACTIONS */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AuthCard
          title="🔐 Se connecter"
          description="Accédez à votre espace personnel et suivez vos démarches."
          buttonLabel="Se connecter"
          variant="primary"
        />

        <AuthCard
          title="📝 Créer un compte"
          description="Créez un compte gratuitement pour commencer."
          buttonLabel="Créer un compte"
          variant="secondary"
        />
      </section>

      {/* MESSAGE RASSURANT */}
      <section className="bg-white dark:bg-blue-500 p-6 shadow rounded-xl">
        <p className="text-zinc-700 dark:text-zinc-100 text-lg">
          💡 Vous pouvez créer un compte même si vous ne parlez pas bien
          français. IA DAF vous accompagne étape par étape.
        </p>
      </section>
    </div>
  );
}

/* --- Composant interne --- */
function AuthCard({
  title,
  description,
  buttonLabel,
  variant,
}: {
  title: string;
  description: string;
  buttonLabel: string;
  variant: "primary" | "secondary";
}) {
  const buttonStyle =
    variant === "primary"
      ? "bg-blue-600 hover:bg-blue-700 text-white"
      : "bg-white hover:bg-zinc-100 text-blue-700";

  return (
    <div className="rounded-xl bg-white dark:bg-blue-500 p-6 shadow hover:shadow-md transition flex flex-col justify-between">
      <div>
        <h2 className="text-xl font-semibold text-blue-800 dark:text-white mb-2">
          {title}
        </h2>

        <p className="text-zinc-600 dark:text-blue-100 mb-6">{description}</p>
      </div>

      <button
        className={`w-full rounded-xl px-4 py-3 font-semibold transition ${buttonStyle}`}
      >
        {buttonLabel}
      </button>
    </div>
  );
}
