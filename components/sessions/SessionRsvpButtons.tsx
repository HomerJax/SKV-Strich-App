"use client";

import { useState } from "react";

type PresenceStatus = "in" | "out" | "open";

export default function SessionRsvpButtons({
  sessionId,
  initialStatus,
}: {
  sessionId: number;
  initialStatus: PresenceStatus;
}) {
  const [status, setStatus] = useState<PresenceStatus>(initialStatus);
  const [busy, setBusy] = useState<PresenceStatus | null>(null);
  const [error, setError] = useState("");

  async function setPresence(nextStatus: "in" | "out") {
    if (busy) return;

    const target: PresenceStatus = status === nextStatus ? "open" : nextStatus;

    try {
      setBusy(nextStatus);
      setError("");

      const formData = new FormData();
      formData.set("intent", "set_self_presence");
      formData.set("status", target);

      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });
      const raw = await response.text();
      const payload = raw ? JSON.parse(raw) : null;

      if (!response.ok) {
        throw new Error(payload?.error || "Rückmeldung konnte nicht gespeichert werden.");
      }

      setStatus(target);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rückmeldung konnte nicht gespeichert werden.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-3" onClick={(event) => event.preventDefault()}>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void setPresence("in");
          }}
          className={[
            "rounded-xl border px-3 py-2 text-xs font-bold transition disabled:opacity-60",
            status === "in"
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
          ].join(" ")}
        >
          {busy === "in" ? "Speichert…" : status === "in" ? "✓ Zugesagt" : "Zusagen"}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void setPresence("out");
          }}
          className={[
            "rounded-xl border px-3 py-2 text-xs font-bold transition disabled:opacity-60",
            status === "out"
              ? "border-rose-600 bg-rose-600 text-white"
              : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
          ].join(" ")}
        >
          {busy === "out" ? "Speichert…" : status === "out" ? "✓ Abgesagt" : "Absagen"}
        </button>
      </div>
      {error ? <div className="mt-2 text-xs font-semibold text-rose-700">{error}</div> : null}
    </div>
  );
}
