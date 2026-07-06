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

  const showPrimaryIn = status === "in" || status === "open";
  const showPrimaryOut = status === "out";

  return (
    <section className="relative overflow-hidden rounded-[32px] bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.10)] ring-1 ring-slate-950/5">
      <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-blue-100/50 blur-3xl" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-blue-600">
            Nächstes Training
          </div>

          <h2 className="mt-2 text-[25px] font-semibold leading-none tracking-[-0.05em] text-slate-950">
            {title}
          </h2>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.08)] ring-1 ring-slate-950/5">
          <CalendarDays className="h-4 w-4" />
        </div>
      </div>

      <div className="relative mt-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => updateStatus("in")}
          disabled={busy}
          className={[
            "min-h-[92px] rounded-[26px] px-3 py-3 text-left transition disabled:opacity-60",
            showPrimaryIn
              ? "bg-slate-950 text-white shadow-[0_16px_34px_rgba(15,23,42,0.22)]"
              : "border border-slate-200 bg-white text-slate-950 shadow-[0_10px_24px_rgba(15,23,42,0.04)] hover:bg-slate-50",
          ].join(" ")}
        >
          <div className="flex h-full items-center gap-2.5">
            <span
              className={[
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                showPrimaryIn
                  ? "bg-white/12 text-white ring-1 ring-white/20"
                  : "bg-blue-50 text-blue-600 ring-1 ring-blue-100",
              ].join(" ")}
            >
              <Check className="h-5 w-5" />
            </span>

            <span className="min-w-0">
              <span className="block text-sm font-semibold tracking-[-0.03em]">
                {busy && status === "in" ? "Speichert…" : "Dabei"}
              </span>
              <span
                className={[
                  "mt-1 flex items-center gap-1.5 text-xs font-medium",
                  showPrimaryIn ? "text-white/70" : "text-slate-500",
                ].join(" ")}
              >
                <span
                  className={[
                    "rounded-lg px-2 py-0.5 font-semibold",
                    showPrimaryIn
                      ? "bg-white/12 text-white"
                      : "bg-blue-100 text-blue-700",
                  ].join(" ")}
                >
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
            "min-h-[92px] rounded-[26px] px-3 py-3 text-left transition disabled:opacity-60",
            showPrimaryOut
              ? "bg-rose-50 text-slate-950 shadow-[0_16px_34px_rgba(244,63,94,0.12)] ring-1 ring-rose-200"
              : "border border-slate-200 bg-white text-slate-950 shadow-[0_10px_24px_rgba(15,23,42,0.04)] hover:bg-slate-50",
          ].join(" ")}
        >
          <div className="flex h-full items-center gap-2.5">
            <span
              className={[
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                showPrimaryOut
                  ? "bg-rose-500 text-white shadow-[0_10px_22px_rgba(244,63,94,0.25)]"
                  : "bg-rose-50 text-rose-500 ring-1 ring-rose-100",
              ].join(" ")}
            >
              <X className="h-5 w-5" />
            </span>

            <span className="min-w-0">
              <span className="block text-sm font-semibold leading-tight tracking-[-0.03em]">
                {busy && status === "out" ? "Speichert…" : "Nicht dabei"}
              </span>
              <span className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
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
