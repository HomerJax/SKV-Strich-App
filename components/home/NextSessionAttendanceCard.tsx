"use client";

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

function formatCount(count: number, singular: string, plural: string) {
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
            "min-h-11 rounded-2xl px-3 text-sm font-semibold transition disabled:opacity-60",
            inButtonActive
              ? "text-white shadow-sm"
              : "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
          ].join(" ")}
          style={
            inButtonActive
              ? { backgroundColor: "var(--club-primary, #0f172a)" }
              : undefined
          }
        >
          {busy && inButtonActive ? "Speichert…" : "Dabei"}
        </button>

        <button
          type="button"
          onClick={() => updateStatus("out")}
          disabled={busy}
          className={[
            "min-h-11 rounded-2xl px-3 text-sm font-semibold transition disabled:opacity-60",
            outButtonActive
              ? "bg-slate-900 text-white shadow-sm"
              : "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
          ].join(" ")}
        >
          {busy && outButtonActive ? "Speichert…" : "Nicht dabei"}
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
        <span>{formatCount(presentCount, "Zusage", "Zusagen")}</span>
        <span>{formatCount(absentCount, "Absage", "Absagen")}</span>
      </div>
    </section>
  );
}
