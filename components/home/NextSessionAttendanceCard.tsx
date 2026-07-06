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
    <section className="rounded-[32px] bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.09)] ring-1 ring-slate-950/5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-600">
            Nächstes Training
          </div>

          <h2 className="mt-3 text-[30px] font-semibold leading-none tracking-[-0.05em] text-slate-950">
            {title}
          </h2>
        </div>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 ring-1 ring-slate-950/5">
          <CalendarDays className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => updateStatus("in")}
          disabled={busy}
          className={[
            "min-h-[86px] rounded-[24px] border px-4 py-4 text-left transition disabled:opacity-60",
            inButtonActive
              ? "border-blue-300 bg-blue-50/80 shadow-[0_10px_24px_rgba(37,99,235,0.10)]"
              : "border-slate-200 bg-white hover:bg-slate-50",
          ].join(" ")}
        >
          <div className="flex items-center gap-3">
            <span
              className={[
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
                inButtonActive
                  ? "bg-blue-100 text-blue-700 ring-1 ring-blue-300"
                  : "bg-slate-50 text-slate-500 ring-1 ring-slate-200",
              ].join(" ")}
            >
              <Check className="h-6 w-6" />
            </span>

            <span className="min-w-0">
              <span className="block text-base font-semibold tracking-[-0.03em] text-slate-950">
                {busy && inButtonActive ? "Speichert…" : "Dabei"}
              </span>
              <span className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-500">
                <span className="rounded-lg bg-blue-100 px-2 py-0.5 font-semibold text-blue-700">
                  {presentCount}
                </span>
                Zusagen
              </span>
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => updateStatus("out")}
          disabled={busy}
          className={[
            "min-h-[86px] rounded-[24px] border px-4 py-4 text-left transition disabled:opacity-60",
            outButtonActive
              ? "border-rose-200 bg-rose-50/80 shadow-[0_10px_24px_rgba(244,63,94,0.08)]"
              : "border-slate-200 bg-white hover:bg-slate-50",
          ].join(" ")}
        >
          <div className="flex items-center gap-3">
            <span
              className={[
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
                outButtonActive
                  ? "bg-rose-100 text-rose-600 ring-1 ring-rose-300"
                  : "bg-slate-50 text-slate-500 ring-1 ring-slate-200",
              ].join(" ")}
            >
              <X className="h-6 w-6" />
            </span>

            <span className="min-w-0">
              <span className="block text-base font-semibold tracking-[-0.03em] text-slate-950">
                {busy && outButtonActive ? "Speichert…" : "Nicht dabei"}
              </span>
              <span className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-500">
                <span className="rounded-lg bg-rose-100 px-2 py-0.5 font-semibold text-rose-600">
                  {absentCount}
                </span>
                Absagen
              </span>
            </span>
          </div>
        </button>
      </div>
    </section>
  );
}
