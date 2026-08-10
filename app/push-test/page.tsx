"use client";

import { useState } from "react";

type TestPushResult = {
  ok?: boolean;
  error?: string;
  result?: {
    sent?: number;
    failed?: number;
    skipped?: boolean;
    errors?: string[];
  };
};

export default function PushTestPage() {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function sendTestPush() {
    if (sending) return;

    setSending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/push/test", {
        method: "POST",
        credentials: "same-origin",
      });

      const payload = (await response.json()) as TestPushResult;

      if (!response.ok) {
        throw new Error(payload.error ?? "Test-Push konnte nicht gesendet werden.");
      }

      const sent = payload.result?.sent ?? 0;
      const failed = payload.result?.failed ?? 0;
      const skipped = payload.result?.skipped ?? false;
      const errors = payload.result?.errors ?? [];

      if (skipped) {
        setMessage("Kein aktives Push-Gerät für diesen Account gefunden.");
        return;
      }

      if (failed > 0) {
        const errorText = errors.length > 0 ? ` Fehler: ${errors.join(", ")}.` : "";
        setMessage(`Push fehlgeschlagen: ${failed}. Erfolgreich: ${sent}.${errorText}`);
        return;
      }

      setMessage(`Push gesendet (${sent}). Jetzt aufs iPhone schauen.`);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Test-Push konnte nicht gesendet werden.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-6 px-4 py-10">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Push-Test
        </p>
        <h1 className="mt-1 text-2xl font-bold text-neutral-950">
          Test-Push an meinen Account senden
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Der Test wird an die aktiven Push-Geräte des aktuell angemeldeten strikr-Accounts gesendet.
        </p>
      </div>

      <button
        type="button"
        onClick={sendTestPush}
        disabled={sending}
        className="rounded-xl bg-black px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {sending ? "Sende Test-Push …" : "Test-Push senden"}
      </button>

      {message ? (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-800">
          {message}
        </div>
      ) : null}
    </main>
  );
}
