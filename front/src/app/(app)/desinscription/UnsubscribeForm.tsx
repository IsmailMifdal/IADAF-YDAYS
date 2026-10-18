"use client";

import { useState } from "react";

import { Alert, Button, ButtonLink, Card } from "../../components/ui/primitives";

type Status = "idle" | "pending" | "done" | "error";

export default function UnsubscribeForm({ token }: { token: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function handleUnsubscribe() {
    setStatus("pending");
    try {
      const res = await fetch("/api/leads/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "La désinscription a échoué. Réessayez.");
        setStatus("error");
        return;
      }
      setStatus("done");
    } catch {
      setError("Une erreur réseau est survenue. Réessayez.");
      setStatus("error");
    }
  }

  if (!token) {
    return (
      <Card className="p-6 space-y-4">
        <Alert tone="warning">
          Ce lien de désinscription est incomplet. Utilisez le lien présent en
          bas de l’e-mail reçu.
        </Alert>
        <ButtonLink href="/" variant="secondary">
          Retour à l’accueil
        </ButtonLink>
      </Card>
    );
  }

  if (status === "done") {
    return (
      <Card className="p-6 space-y-4">
        <Alert tone="success">
          C’est fait : votre adresse a été supprimée et vous ne recevrez plus
          d’e-mails de notre part.
        </Alert>
        <ButtonLink href="/" variant="secondary">
          Retour à l’accueil
        </ButtonLink>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-4">
      <p className="text-sm text-gray-700">
        Votre adresse e-mail sera définitivement supprimée de notre liste de
        contacts.
      </p>
      {status === "error" && <Alert tone="danger">{error}</Alert>}
      <Button
        onClick={handleUnsubscribe}
        isLoading={status === "pending"}
        loadingLabel="Désinscription…"
      >
        Me désinscrire
      </Button>
    </Card>
  );
}
