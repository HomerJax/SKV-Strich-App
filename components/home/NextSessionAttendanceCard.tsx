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

function getStatusMeta(status: PresenceStatus) {
  if (status === "in") {
    return {
      label: "Du bist dabei",
      description: "Du bist aktuell für das Training eingeplant.",
      tone: "emerald" as const,
    };
  }

  if (status === "out") {
    return {
      label: "Du setzt dieses Mal aus",
      description: "Du bist aktuell für dieses Training nicht dabei.",
      tone: "slate" as const,
    };
  }

  return {
    label: "Noch keine Rückmeldung",
    description: "Gib kurz Bescheid, ob du beim nächsten Training dabei bist.",
    tone: "amber" as const,
  };
}

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

  const statusMeta = getStatusMeta(status);

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

  const statusClasses =
    statusMeta.tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : statusMeta.tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-slate-200 bg-slate-100 text-slate-900";

  const inButtonActive = status === "in";
  const outButtonActive = status === "out";

  return (
    <section className="rounded-[24px] border border-black/10 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-500">
              Nächstes Training
            </div>

            <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
              {title}
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
          </div>

          <a
            href={href}
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Zur Session
          </a>
        </div>

        <div className={`rounded-2xl border px-4 py-3 ${statusClasses}`}>
          <div className="text-sm font-semibold">{statusMeta.label}</div>
          <div className="mt-1 text-xs leading-5 opacity-80">
            {statusMeta.description}
          </div>
        </div>

        {message ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            {message}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => updateStatus("in")}
            disabled={busy}
            className={`inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
              inButtonActive
                ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {busy && inButtonActive ? "Speichert..." : "Ich bin dabei"}
          </button>

          <button
            type="button"
            onClick={() => updateStatus("out")}
            disabled={busy}
            className={`inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
              outButtonActive
                ? "border border-slate-300 bg-slate-100 text-slate-900"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {busy && outButtonActive ? "Speichert..." : "Diesmal nicht"}
          </button>
        </div>
      </div>
    </section>
  );
}