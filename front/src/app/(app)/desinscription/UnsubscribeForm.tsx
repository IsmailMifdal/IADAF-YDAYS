"use client";

import { useState } from "react";

import { Alert, Button, ButtonLink, Card } from "../../components/ui/primitives";
import { useLanguage } from "../../context/LanguageContext";

type Status = "idle" | "pending" | "done" | "error";

export default function UnsubscribeForm({ token }: { token: string }) {
  const { m } = useLanguage();
  const t = m.unsubscribe;
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
        setError(data.error ?? m.errors.unsubscribeFailed);
        setStatus("error");
        return;
      }
      setStatus("done");
    } catch {
      setError(m.common.networkError);
      setStatus("error");
    }
  }

  if (!token) {
    return (
      <Card className="p-6 space-y-4">
        <Alert tone="warning">{t.incomplete}</Alert>
        <ButtonLink href="/" variant="secondary">
          {t.backHome}
        </ButtonLink>
      </Card>
    );
  }

  if (status === "done") {
    return (
      <Card className="p-6 space-y-4">
        <Alert tone="success">{t.done}</Alert>
        <ButtonLink href="/" variant="secondary">
          {t.backHome}
        </ButtonLink>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-4">
      <p className="text-sm text-gray-700">{t.explain}</p>
      {status === "error" && <Alert tone="danger">{error}</Alert>}
      <Button
        onClick={handleUnsubscribe}
        isLoading={status === "pending"}
        loadingLabel={t.pending}
      >
        {t.submit}
      </Button>
    </Card>
  );
}
