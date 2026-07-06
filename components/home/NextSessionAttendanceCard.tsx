"use client";

import { Check, X } from "lucide-react";
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
    <section className="rounded-[24px] border border-black/10 bg-white p-3 shadow-sm">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        Nächstes Training
      </div>

      <h2 className="mt-1.5 text-xl font-semibold leading-tight tracking-[-0.03em] text-slate-950">
        {title}
      </h2>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => updateStatus("in")}
          disabled={busy}
          className={[
            "group min-h-[72px] rounded-2xl border px-3 py-3 text-left transition disabled:opacity-60",
            inButtonActive
              ? "border-transparent text-white shadow-sm"
              : "border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100",
          ].join(" ")}
          style={
            inButtonActive
              ? { backgroundColor: "var(--club-primary, #0f172a)" }
              : undefined
          }
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className={[
                "flex h-8 w-8 items-center justify-center rounded-full",
                inButtonActive
                  ? "bg-white/15 text-white"
                  : "bg-white text-slate-600 shadow-sm",
              ].join(" ")}
            >
              <Check className="h-4 w-4" />
            </span>

            <span
              className={[
                "rounded-full px-2.5 py-1 text-xs font-semibold",
                inButtonActive
                  ? "bg-white/15 text-white"
                  : "bg-white text-slate-700 shadow-sm",
              ].join(" ")}
            >
              {presentCount}
            </span>
          </div>

          <div className="mt-2 text-sm font-semibold">
            {busy && inButtonActive ? "Speichert…" : "Dabei"}
          </div>
        </button>

        <button
          type="button"
          onClick={() => updateStatus("out")}
          disabled={busy}
          className={[
            "group min-h-[72px] rounded-2xl border px-3 py-3 text-left transition disabled:opacity-60",
            outButtonActive
              ? "border-transparent bg-slate-900 text-white shadow-sm"
              : "border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100",
          ].join(" ")}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className={[
                "flex h-8 w-8 items-center justify-center rounded-full",
                outButtonActive
                  ? "bg-white/15 text-white"
                  : "bg-white text-slate-600 shadow-sm",
              ].join(" ")}
            >
              <X className="h-4 w-4" />
            </span>

            <span
              className={[
                "rounded-full px-2.5 py-1 text-xs font-semibold",
                outButtonActive
                  ? "bg-white/15 text-white"
                  : "bg-white text-slate-700 shadow-sm",
              ].join(" ")}
            >
              {absentCount}
            </span>
          </div>

          <div className="mt-2 text-sm font-semibold">
            {busy && outButtonActive ? "Speichert…" : "Nicht dabei"}
          </div>
        </button>
      </div>
    </section>
  );
}
