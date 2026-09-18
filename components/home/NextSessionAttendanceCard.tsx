"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, Clock3, UserCheck, UserX } from "lucide-react";
import { useEffect, useState } from "react";
import LateRsvpModal from "@/components/sessions/LateRsvpModal";
import { getSessionDeadlineEpochMs } from "@/lib/session-rsvp-deadline";

type PresenceStatus = "in" | "out" | "open";
type PendingAction = "in" | "out" | null;
type DeadlineTone = "normal" | "soon" | "urgent" | "passed";

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
  sessionRsvpDeadlineMinutesBefore?: number | null;
  participantNames?: string[];
};

function formatDeadline(date: Date) {
  return date.toLocaleString("de-DE", {
    timeZone: "Europe/Berlin",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
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

function getDeadlineTone(deadline: Date | null, now: Date | null): DeadlineTone {
  if (!deadline || !now) return "normal";
  const diffMs = deadline.getTime() - now.getTime();
  if (diffMs <= 0) return "passed";
  if (diffMs <= 2 * 60 * 60 * 1000) return "urgent";
  if (diffMs <= 24 * 60 * 60 * 1000) return "soon";
  return "normal";
}

function deadlineClasses(tone: DeadlineTone) {
  if (tone === "passed") return "border-rose-200 bg-rose-50 text-rose-800";
  if (tone === "urgent") return "border-amber-300 bg-amber-100 text-amber-950";
  if (tone === "soon") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

export default function NextSessionAttendanceCard({
  sessionId,
  title,
  text,
  href,
  initialStatus,
  initialPresentCount,
  initialAbsentCount = 0,
  sessionDate,
  startTime,
  rsvpDeadlineMinutesBefore = 60,
  sessionRsvpDeadlineMinutesBefore = null,
}: NextSessionAttendanceCardProps) {
  const [status, setStatus] = useState<PresenceStatus>(initialStatus);
  const [presentCount, setPresentCount] = useState<number>(initialPresentCount);
  const [absentCount, setAbsentCount] = useState<number>(initialAbsentCount);
  const [busy, setBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [now, setNow] = useState<Date | null>(null);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [notNominated, setNotNominated] = useState(false);
  const [latePenaltyMessage, setLatePenaltyMessage] = useState<string | null>(null);

  useEffect(() => {
    setNow(new Date());
    const interval = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;
    fetch(`/api/sessions/${sessionId}/event-roster`, { credentials: "same-origin" })
      .then(async (response) => response.ok ? response.json() as Promise<{ isEvent?: boolean; currentPlayerNominated?: boolean }> : null)
      .then((payload) => {
        if (!active || !payload?.isEvent) return;
        setNotNominated(payload.currentPlayerNominated === false);
      })
      .catch(() => null);
    return () => { active = false; };
  }, [sessionId]);

  const deadlineEpochMs = sessionDate
    ? getSessionDeadlineEpochMs({
        date: sessionDate,
        startTime,
        sessionOverrideMinutes: sessionRsvpDeadlineMinutesBefore,
        clubDefaultMinutes: rsvpDeadlineMinutesBefore,
      })
    : null;
  const deadline = deadlineEpochMs !== null ? new Date(deadlineEpochMs) : null;
  const deadlineTone = getDeadlineTone(deadline, now);
  const deadlineText = deadline ? `Rückmeldung bis ${formatDeadline(deadline)} Uhr` : null;
  const remainingText = deadline && now ? getRemainingLabel(deadline, now) : null;

  async function updateStatus(nextStatus: PresenceStatus, action: Exclude<PendingAction, null>, absenceReason = "") {
    if (busy || status === nextStatus || notNominated) return;

    if (deadlineTone === "passed" && status === "in" && nextStatus !== "in") {
      setErrorMessage("Der Anmeldeschluss ist vorbei. Deine Zusage ist jetzt verbindlich – bitte wende dich für eine Änderung an einen Admin.");
      return;
    }

    const previousStatus = status;

    try {
      setBusy(true);
      setPendingAction(action);
      setErrorMessage("");

      const formData = new FormData();
      formData.set("intent", "set_self_presence");
      formData.set("status", nextStatus);
      if (nextStatus === "out") formData.set("reason", absenceReason.trim().slice(0, 80));
      const response = await fetch(`/api/sessions/${sessionId}`, { method: "POST", body: formData, credentials: "same-origin" });
      const raw = await response.text();
      const payload = raw ? JSON.parse(raw) : null;
      if (!response.ok) throw new Error(payload?.error || "Status konnte nicht gespeichert werden.");

      setStatus(nextStatus);
      if (nextStatus === "in" && payload?.latePenalty?.message) {
        setLatePenaltyMessage(String(payload.latePenalty.message));
      }
      setReasonOpen(false);
      if (nextStatus !== "out") setReason("");
      if (previousStatus === "in") setPresentCount((prev) => Math.max(0, prev - 1));
      if (previousStatus === "out") setAbsentCount((prev) => Math.max(0, prev - 1));
      if (nextStatus === "in") setPresentCount((prev) => prev + 1);
      if (nextStatus === "out") setAbsentCount((prev) => prev + 1);
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "Status konnte nicht gespeichert werden.");
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }

  const inActive = status === "in";
  const outActive = status === "out";
  const isOpen = status === "open";
  const reminderText = deadlineTone === "passed"
    ? "Deine Rückmeldung ist noch offen. Die angezeigte Frist ist bereits vorbei."
    : deadlineTone === "urgent"
      ? `Bitte jetzt kurz entscheiden${remainingText ? ` – ${remainingText}` : ""}.`
      : deadlineTone === "soon"
        ? `Bitte heute noch zu- oder absagen${remainingText ? ` – ${remainingText}` : ""}.`
        : "Bitte kurz zu- oder absagen, damit euer Training planbar bleibt.";

  return (
    <section className="relative overflow-hidden rounded-[32px] bg-white p-5 shadow-[0_20px_52px_rgba(15,23,42,0.12)] ring-1 ring-slate-950/5">
      <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-blue-200/50 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 bottom-0 h-40 w-40 rounded-full bg-rose-100/50 blur-3xl" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-blue-600">Nächstes Training</div>
          <h2 className="mt-2 text-[18px] font-semibold leading-tight tracking-[-0.045em] text-slate-950 sm:text-[22px]">{title}</h2>
          {text?.trim() ? <p className="mt-1.5 line-clamp-2 text-xs font-medium leading-5 text-slate-500">{text.trim()}</p> : null}
          {deadlineText ? (
            <div className={`mt-3 inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${deadlineClasses(deadlineTone)}`}>
              <Clock3 className="h-3.5 w-3.5 shrink-0" />
              <span>{deadlineText}{remainingText ? ` · ${remainingText}` : ""}</span>
            </div>
          ) : null}
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.08)] ring-1 ring-slate-950/5"><CalendarDays className="h-4 w-4" /></div>
      </div>

      {notNominated ? (
        <div className="relative mt-4 rounded-[22px] border border-slate-200 bg-slate-50 px-3 py-3 text-xs font-bold text-slate-700">Nicht im Event-Kader</div>
      ) : isOpen ? (
        <div className={`relative mt-4 rounded-[22px] border px-3 py-2.5 text-xs ${deadlineTone === "passed" ? "border-rose-200 bg-rose-50 text-rose-900" : deadlineTone === "urgent" || deadlineTone === "soon" ? "border-amber-200 bg-amber-50 text-amber-950" : "border-blue-100 bg-blue-50 text-blue-900"}`}>
          <div className="font-bold">Rückmeldung offen</div>
          <div className="mt-0.5 leading-5 opacity-85">{reminderText}</div>
        </div>
      ) : (
        <div className={`relative mt-4 flex items-center justify-between gap-3 rounded-[22px] border px-3 py-2.5 text-xs font-semibold ${inActive ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-rose-200 bg-rose-50 text-rose-900"}`}>
          <span>Deine Rückmeldung</span><span>{inActive ? "✓ Du bist dabei" : "Du bist raus"}</span>
        </div>
      )}

      {errorMessage ? <div className="relative mt-4 rounded-[18px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">{errorMessage}</div> : null}

      {!notNominated ? (
        <div className="relative mt-5 rounded-[28px] bg-slate-50 p-1.5 ring-1 ring-slate-950/5">
          <div className="grid grid-cols-2 gap-1.5">
            <button type="button" onClick={() => void updateStatus(inActive ? "open" : "in", "in")} disabled={busy || (deadlineTone === "passed" && inActive)} aria-busy={pendingAction === "in"} className={["min-h-[76px] rounded-[24px] px-3 py-3 text-left transition disabled:opacity-60", inActive ? "bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-500 text-white shadow-[0_16px_34px_rgba(56,189,248,0.24)]" : "bg-white text-slate-950 shadow-[0_8px_18px_rgba(15,23,42,0.05)] hover:bg-blue-50"].join(" ")}>
              <div className="flex items-center gap-2.5"><span className={["flex h-10 w-10 shrink-0 items-center justify-center rounded-full", inActive ? "bg-white/20 text-white ring-1 ring-white/25" : "bg-blue-50 text-blue-600 ring-1 ring-blue-100"].join(" ")}><UserCheck className="h-5 w-5" /></span><span className="min-w-0"><span className="block text-sm font-semibold tracking-[-0.03em]">{pendingAction === "in" ? "Speichert…" : inActive ? "Dabei ✓" : "Ich bin dabei"}</span><span className={["mt-0.5 block text-xs font-medium", inActive ? "text-white/75" : "text-slate-500"].join(" ")}>{presentCount} dabei</span></span></div>
            </button>
            <button type="button" onClick={() => { if (outActive) void updateStatus("open", "out"); else setReasonOpen(true); }} disabled={busy || (deadlineTone === "passed" && inActive)} aria-busy={pendingAction === "out"} className={["min-h-[76px] rounded-[24px] px-3 py-3 text-left transition disabled:opacity-60", outActive ? "bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-[0_18px_36px_rgba(244,63,94,0.24)]" : "bg-rose-50 text-slate-950 shadow-[0_8px_18px_rgba(244,63,94,0.08)] hover:bg-rose-100/70"].join(" ")}>
              <div className="flex items-center gap-2.5"><span className={["flex h-10 w-10 shrink-0 items-center justify-center rounded-full", outActive ? "bg-white/15 text-white ring-1 ring-white/20" : "bg-white text-rose-500 ring-1 ring-rose-100"].join(" ")}><UserX className="h-5 w-5" /></span><span className="min-w-0"><span className="block text-sm font-semibold tracking-[-0.03em]">{pendingAction === "out" ? "Speichert…" : deadlineTone === "passed" && inActive ? "Absage gesperrt" : outActive ? "Abgesagt ✓" : "Ich bin raus"}</span><span className={["mt-0.5 block text-xs font-medium", outActive ? "text-white/75" : "text-rose-500"].join(" ")}>{absentCount} raus</span></span></div>
            </button>
          </div>
          {deadlineTone === "passed" && inActive ? (
            <div className="m-1.5 mt-2 rounded-[18px] border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
              Anmeldeschluss vorbei · deine Zusage ist verbindlich.
            </div>
          ) : null}
          {reasonOpen ? (
            <div className="m-1.5 mt-2 rounded-[20px] border border-rose-200 bg-white p-3">
              <div className="text-xs font-bold text-rose-800">Warum bist du nicht dabei? <span className="font-medium text-rose-500">(optional)</span></div>
              <input autoFocus value={reason} maxLength={80} onChange={(event) => setReason(event.target.value)} placeholder="z. B. Urlaub, Rücken, Frau sagt nein 😄" className="mt-2 w-full rounded-xl border border-rose-200 px-3 py-2 text-xs outline-none focus:border-rose-400" />
              <div className="mt-2 flex justify-end gap-2"><button type="button" onClick={() => { setReasonOpen(false); setReason(""); }} className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-500">Abbrechen</button><button type="button" disabled={busy} onClick={() => void updateStatus("out", "out", reason)} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-black text-white disabled:opacity-60">Absage speichern</button></div>
            </div>
          ) : null}
        </div>
      ) : null}

      <LateRsvpModal
        open={latePenaltyMessage !== null}
        message={latePenaltyMessage ?? ""}
        onClose={() => setLatePenaltyMessage(null)}
      />

      <div className="relative mt-3 flex justify-end">
        <Link href={href} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-slate-600 shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">Training öffnen<ArrowRight className="h-3.5 w-3.5" /></Link>
      </div>
    </section>
  );
}
