"use client";

import Link from "next/link";
import { useState } from "react";

type PresenceStatus = "in" | "out" | "open";

type NextSessionAttendanceCardProps = {
  sessionId: number;
  title: string;
  text: string;
  href: string;
  initialStatus: PresenceStatus;
  initialPresentCount: number;
  participantNames?: string[];
};

function getStatusLabel(status: PresenceStatus) {
  if (status === "in") return "Du bist dabei";
  if (status === "out") return "Du bist diesmal nicht dabei";
  return "Noch offen";
}

function formatPresentCount(count: number) {
  if (count === 1) return "1 Zusage";
  return `${count} Zusagen`;
}

export default function NextSessionAttendanceCard({
  sessionId,
  title,
  text,
  href,
  initialStatus,
  initialPresentCount,
  participantNames = [],
}: NextSessionAttendanceCardProps) {
  const [status, setStatus] = useState<PresenceStatus>(initialStatus);
  const [presentCount, setPresentCount] = useState<number>(initialPresentCount);
  const [busy, setBusy] = useState(false);

  const visibleNames = participantNames.slice(0, 6);
  const hiddenNameCount = Math.max(0, participantNames.length - visibleNames.length);

  async function updateStatus(nextStatus: "in" | "out") {
    if (busy) return;

    try {
      setBusy(true);

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

      const previousStatus = status;
      setStatus(nextStatus);

      if (previousStatus !== "in" && nextStatus === "in") {
        setPresentCount((prev) => prev + 1);
      }

      if (previousStatus === "in" && nextStatus === "out") {
        setPresentCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setBusy(false);
    }
  }

  const inButtonActive = status === "in";
  const outButtonActive = status === "out";

  return (
    <section className="rounded-[28px] border border-black/10 bg-white p-4 shadow-sm">
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
        Nächstes Training
      </div>

      <h2 className="mt-2 text-2xl font-black leading-tight tracking-[-0.04em] text-slate-950">
        {title}
      </h2>

      <p className="mt-2 text-sm font-semibold leading-5 text-slate-500">
        {text}
      </p>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
              Deine Teilnahme
            </div>
            <div className="mt-1 text-sm font-black text-slate-950">
              {getStatusLabel(status)}
            </div>
          </div>

          <div className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm">
            {formatPresentCount(presentCount)}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => updateStatus("in")}
            disabled={busy}
            className={`rounded-2xl px-3 py-3 text-sm font-black transition disabled:opacity-60 ${
              inButtonActive
                ? "bg-emerald-600 text-white"
                : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
            }`}
          >
            {busy && inButtonActive ? "Speichert..." : "Ich bin dabei"}
          </button>

          <button
            type="button"
            onClick={() => updateStatus("out")}
            disabled={busy}
            className={`rounded-2xl px-3 py-3 text-sm font-black transition disabled:opacity-60 ${
              outButtonActive
                ? "bg-slate-950 text-white"
                : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
            }`}
          >
            {busy && outButtonActive ? "Speichert..." : "Diesmal nicht"}
          </button>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
              Wer ist dabei?
            </div>
            <div className="mt-1 text-sm font-black text-slate-950">
              {formatPresentCount(presentCount)}
            </div>
          </div>

          <Link
            href={href}
            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-700"
          >
            Alle ansehen
          </Link>
        </div>

        {visibleNames.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {visibleNames.map((name) => (
              <span
                key={name}
                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700"
              >
                {name}
              </span>
            ))}

            {hiddenNameCount > 0 ? (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
                +{hiddenNameCount}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
