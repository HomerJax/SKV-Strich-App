"use client";

import { CalendarDays, Check, X } from "lucide-react";
import { useState } from "react";

type PresenceStatus = "in" | "out" | "open";

type NextSessionAttendanceCardProps = {
  sessionId: number;
  title: string;
  text: string;
  href: string;
  initialStatus: PresenceStatus;
  initialPresentCount: number;
  initialAbsentCount?: number;
  participantNames?: string[];
};

export default function NextSessionAttendanceCard({
  sessionId,
  title,
  initialStatus,
  initialPresentCount,
  initialAbsentCount = 0,
}: NextSessionAttendanceCardProps) {
  const [status, setStatus] = useState<PresenceStatus>(initialStatus);
  const [presentCount, setPresentCount] = useState<number>(initialPresentCount);
  const [absentCount, setAbsentCount] = useState<number>(initialAbsentCount);
  const [busy, setBusy] = useState(false);

  async function updateStatus(nextStatus: "in" | "out") {
    if (busy || status === nextStatus) return;

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

      if (previousStatus !== "out" && nextStatus === "out") {
        setAbsentCount((prev) => prev + 1);
      }

      if (previousStatus === "out" && nextStatus === "in") {
        setAbsentCount((prev) => Math.max(0, prev - 1));
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
    <section className="rounded-[28px] bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.08)] ring-1 ring-slate-950/5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-600">
            Nächstes Training
          </div>

          <h2 className="mt-2 truncate text-2xl font-semibold leading-tight tracking-[-0.05em] text-slate-950">
            {title}
          </h2>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-600 ring-1 ring-slate-950/5">
          <CalendarDays className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-[24px] bg-slate-50 p-1.5 ring-1 ring-slate-950/5">
        <button
          type="button"
          onClick={() => updateStatus("in")}
          disabled={busy}
          className={[
            "flex w-full items-center justify-between rounded-[20px] px-3 py-3 text-left transition disabled:opacity-60",
            inButtonActive
              ? "bg-white shadow-[0_10px_24px_rgba(37,99,235,0.12)] ring-1 ring-blue-200"
              : "hover:bg-white/70",
          ].join(" ")}
        >
          <span className="flex min-w-0 items-center gap-3">
            <span
              className={[
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                inButtonActive
                  ? "bg-blue-100 text-blue-700"
                  : "bg-white text-slate-500 ring-1 ring-slate-200",
              ].join(" ")}
            >
              <Check className="h-4 w-4" />
            </span>

            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-slate-950">
                {busy && inButtonActive ? "Speichert…" : "Dabei"}
              </span>
              <span className="block text-xs font-medium text-slate-500">
                Zusagen
              </span>
            </span>
          </span>

          <span className="ml-3 rounded-xl bg-blue-100 px-2.5 py-1 text-sm font-semibold text-blue-700">
            {presentCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => updateStatus("out")}
          disabled={busy}
          className={[
            "mt-1 flex w-full items-center justify-between rounded-[20px] px-3 py-3 text-left transition disabled:opacity-60",
            outButtonActive
              ? "bg-white shadow-[0_10px_24px_rgba(244,63,94,0.10)] ring-1 ring-rose-200"
              : "hover:bg-white/70",
          ].join(" ")}
        >
          <span className="flex min-w-0 items-center gap-3">
            <span
              className={[
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                outButtonActive
                  ? "bg-rose-100 text-rose-600"
                  : "bg-white text-slate-500 ring-1 ring-slate-200",
              ].join(" ")}
            >
              <X className="h-4 w-4" />
            </span>

            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-slate-950">
                {busy && outButtonActive ? "Speichert…" : "Nicht dabei"}
              </span>
              <span className="block text-xs font-medium text-slate-500">
                Absagen
              </span>
            </span>
          </span>

          <span className="ml-3 rounded-xl bg-rose-100 px-2.5 py-1 text-sm font-semibold text-rose-600">
            {absentCount}
          </span>
        </button>
      </div>
    </section>
  );
}
