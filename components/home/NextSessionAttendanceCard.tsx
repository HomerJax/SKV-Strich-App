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

function getStatusLabel(status: PresenceStatus) {
  if (status === "in") return "Zugesagt";
  if (status === "out") return "Abgesagt";
  return "Offen";
}

function getCountLabel(count: number, singular: string, plural: string) {
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
}

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
    <section className="rounded-[28px] bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.08)] ring-1 ring-slate-950/5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Nächstes Training
          </div>

          <h2 className="mt-1.5 truncate text-xl font-semibold leading-tight tracking-[-0.03em] text-slate-950">
            {title}
          </h2>
        </div>

        <div className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
          {getStatusLabel(status)}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-1.5 rounded-[24px] bg-slate-100 p-1.5">
        <button
          type="button"
          onClick={() => updateStatus("in")}
          disabled={busy}
          className={[
            "rounded-[20px] px-3 py-3 text-left transition disabled:opacity-60",
            inButtonActive
              ? "bg-slate-950 text-white shadow-sm"
              : "text-slate-700 hover:bg-white/70",
          ].join(" ")}
        >
          <div className="flex items-center gap-2">
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

            <span className="min-w-0">
              <span className="block text-sm font-semibold">
                {busy && inButtonActive ? "Speichert…" : "Dabei"}
              </span>
              <span
                className={[
                  "block text-[11px] font-medium",
                  inButtonActive ? "text-white/70" : "text-slate-500",
                ].join(" ")}
              >
                {getCountLabel(presentCount, "Zusage", "Zusagen")}
              </span>
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => updateStatus("out")}
          disabled={busy}
          className={[
            "rounded-[20px] px-3 py-3 text-left transition disabled:opacity-60",
            outButtonActive
              ? "bg-slate-950 text-white shadow-sm"
              : "text-slate-700 hover:bg-white/70",
          ].join(" ")}
        >
          <div className="flex items-center gap-2">
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

            <span className="min-w-0">
              <span className="block text-sm font-semibold">
                {busy && outButtonActive ? "Speichert…" : "Nicht dabei"}
              </span>
              <span
                className={[
                  "block text-[11px] font-medium",
                  outButtonActive ? "text-white/70" : "text-slate-500",
                ].join(" ")}
              >
                {getCountLabel(absentCount, "Absage", "Absagen")}
              </span>
            </span>
          </div>
        </button>
      </div>
    </section>
  );
}
