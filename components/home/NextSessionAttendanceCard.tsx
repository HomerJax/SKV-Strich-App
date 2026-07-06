"use client";

import { CalendarDays, UserCheck, UserX } from "lucide-react";
import { useEffect, useState } from "react";

type PresenceStatus = "in" | "out" | "open";

type NextSessionAttendanceCardProps = {
  sessionId: number;
  title: string;
  text: string;
  href: string;
  initialStatus: PresenceStatus;
  initialPresentCount: number;
  initialAbsentCount?: number;
  sessionDate?: string;
  startTime?: string | null;
  rsvpDeadlineMinutesBefore?: number;
  participantNames?: string[];
};


function getDeadline(
  sessionDate: string | undefined,
  startTime: string | null | undefined,
  minutesBefore: number
) {
  if (!sessionDate || !startTime) return null;

  const [year, month, day] = sessionDate.split("-").map(Number);
  const [hour, minute] = startTime.slice(0, 5).split(":").map(Number);

  if (!year || !month || !day || !Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null;
  }

  const start = new Date(year, month - 1, day, hour, minute, 0);
  const deadline = new Date(start);
  deadline.setMinutes(deadline.getMinutes() - minutesBefore);

  return { start, deadline };
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getRemainingLabel(deadline: Date, now: Date) {
  const diffMs = deadline.getTime() - now.getTime();

  if (diffMs <= 0) return "Frist vorbei";

  const totalMinutes = Math.ceil(diffMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `noch ${days} Tg ${hours} Std`;
  if (hours > 0) return `noch ${hours} Std ${minutes} Min`;
  return `noch ${minutes} Min`;
}

export default function NextSessionAttendanceCard({
  sessionId,
  title,
  initialStatus,
  initialPresentCount,
  initialAbsentCount = 0,
  sessionDate,
  startTime,
  rsvpDeadlineMinutesBefore = 30,
}: NextSessionAttendanceCardProps) {
  const [status, setStatus] = useState<PresenceStatus>(initialStatus);
  const [presentCount, setPresentCount] = useState<number>(initialPresentCount);
  const [absentCount, setAbsentCount] = useState<number>(initialAbsentCount);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());

    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 30000);

    return () => window.clearInterval(interval);
  }, []);

  const deadlineInfo = getDeadline(
    sessionDate,
    startTime,
    rsvpDeadlineMinutesBefore
  );

  const deadlinePrefix =
    deadlineInfo &&
    deadlineInfo.deadline.toDateString() !== deadlineInfo.start.toDateString()
      ? "Zusage bis Vortag"
      : "Zusage bis";

  const deadlineText = deadlineInfo
    ? `${deadlinePrefix} ${formatTime(deadlineInfo.deadline)} Uhr`
    : null;

  const remainingText =
    deadlineInfo && now ? getRemainingLabel(deadlineInfo.deadline, now) : null;

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

  const inActive = status === "in" || status === "open";
  const outActive = status === "out";

  return (
    <section className="relative overflow-hidden rounded-[32px] bg-white p-5 shadow-[0_20px_52px_rgba(15,23,42,0.12)] ring-1 ring-slate-950/5">
      <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-blue-200/50 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 bottom-0 h-40 w-40 rounded-full bg-rose-100/50 blur-3xl" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-blue-600">
            Nächstes Training
          </div>

          <h2 className="mt-2 whitespace-nowrap text-[19px] font-semibold leading-tight tracking-[-0.04em] text-slate-950 sm:text-[22px]">
            {title}
          </h2>

          {deadlineText ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                {deadlineText}
              </span>

              {remainingText ? (
                <span className="rounded-full bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-100">
                  {remainingText}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.08)] ring-1 ring-slate-950/5">
          <CalendarDays className="h-4 w-4" />
        </div>
      </div>

      <div className="relative mt-5 rounded-[28px] bg-slate-50 p-1.5 ring-1 ring-slate-950/5">
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => updateStatus("in")}
            disabled={busy}
            className={[
              "min-h-[76px] rounded-[24px] px-3 py-3 text-left transition disabled:opacity-60",
              inActive
                ? "bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-500 text-white shadow-[0_16px_34px_rgba(56,189,248,0.24)]"
                : "bg-white text-slate-950 shadow-[0_8px_18px_rgba(15,23,42,0.05)] hover:bg-blue-50",
            ].join(" ")}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={[
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                  inActive
                    ? "bg-white/20 text-white ring-1 ring-white/25"
                    : "bg-blue-50 text-blue-600 ring-1 ring-blue-100",
                ].join(" ")}
              >
                <UserCheck className="h-5 w-5" />
              </span>

              <span className="min-w-0">
                <span className="block text-sm font-semibold tracking-[-0.03em]">
                  {busy && status === "in" ? "Speichert…" : "Zusagen"}
                </span>
                <span
                  className={[
                    "mt-0.5 block text-xs font-medium",
                    inActive ? "text-white/75" : "text-slate-500",
                  ].join(" ")}
                >
                  {presentCount} dabei
                </span>
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => updateStatus("out")}
            disabled={busy}
            className={[
              "min-h-[76px] rounded-[24px] px-3 py-3 text-left transition disabled:opacity-60",
              outActive
                ? "bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-[0_18px_36px_rgba(244,63,94,0.24)]"
                : "bg-rose-50 text-slate-950 shadow-[0_8px_18px_rgba(244,63,94,0.08)] hover:bg-rose-100/70",
            ].join(" ")}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={[
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                  outActive
                    ? "bg-white/15 text-white ring-1 ring-white/20"
                    : "bg-white text-rose-500 ring-1 ring-rose-100",
                ].join(" ")}
              >
                <UserX className="h-5 w-5" />
              </span>

              <span className="min-w-0">
                <span className="block text-sm font-semibold tracking-[-0.03em]">
                  {busy && status === "out" ? "Speichert…" : "Absagen"}
                </span>
                <span
                  className={[
                    "mt-0.5 block text-xs font-medium",
                    outActive ? "text-white/75" : "text-rose-500",
                  ].join(" ")}
                >
                  {absentCount} raus
                </span>
              </span>
            </div>
          </button>
        </div>
      </div>
    </section>
  );
}
