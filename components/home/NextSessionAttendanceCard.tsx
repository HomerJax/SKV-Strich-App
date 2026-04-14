"use client";

import { useState } from "react";

type PresenceStatus = "in" | "out" | "open";

type NextSessionAttendanceCardProps = {
  sessionId: number;
  title: string;
  text: string;
  href: string;
  initialStatus: PresenceStatus;
};

export default function NextSessionAttendanceCard({
  sessionId,
  title,
  text,
  href,
  initialStatus,
}: NextSessionAttendanceCardProps) {
  const [status, setStatus] = useState<PresenceStatus>(initialStatus);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function updateStatus(nextStatus: "in" | "out") {
    if (busy) return;

    try {
      setBusy(true);
      setMessage(null);

      const formData = new FormData();
      formData.set("intent", "set_self_presence");
      formData.set("status", nextStatus);

      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });

      const raw = await response.text();
      const payload = raw ? JSON.parse(raw) : null;

      if (!response.ok) {
        throw new Error(
          payload?.error || "Status konnte nicht gespeichert werden."
        );
      }

      setStatus(nextStatus);
      setMessage(
        nextStatus === "in"
          ? "Du bist dabei beim Training."
          : "Du setzt dieses Mal aus."
      );
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : "Status konnte nicht gespeichert werden.";
      setMessage(msg);
    } finally {
      setBusy(false);
    }
  }

  const statusLabel =
    status === "in"
      ? "Du bist dabei beim Training"
      : status === "out"
        ? "Du setzt dieses Mal aus"
        : "Noch keine Rückmeldung";

  return (
    <section className="rounded-[24px] border border-black/10 bg-white p-5 shadow-sm">
      <div className="text-sm font-semibold text-slate-500">Nächstes Training</div>

      <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
        {title}
      </h2>

      <p className="mt-3 text-sm leading-7 text-slate-600">{text}</p>

      <div className="mt-4 inline-flex rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
        {statusLabel}
      </div>

      {message ? (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          {message}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => updateStatus("in")}
          disabled={busy}
          className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Speichert..." : "Ich bin dabei"}
        </button>

        <button
          type="button"
          onClick={() => updateStatus("out")}
          disabled={busy}
          className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Speichert..." : "Diesmal nicht"}
        </button>

        <a
          href={href}
          className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Zur Session
        </a>
      </div>
    </section>
  );
}