"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, Clock3, ChevronDown, UserCheck, UserX } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LateRsvpModal from "@/components/sessions/LateRsvpModal";
import { getSessionDeadlineEpochMs } from "@/lib/session-rsvp-deadline";
import { useI18n } from "@/components/i18n/I18nProvider";
import type { AppLocale } from "@/lib/i18n/config";
import {
  getRequiredRsvpReasonError,
  isMeaningfulRsvpReason,
} from "@/lib/rsvp-reason";

type PresenceStatus = "in" | "out" | "open";
type PendingAction = "in" | "out" | null;
// Home attendance UI
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
  participants?: { id: number; name: string; photoUrl: string | null; photoPositionX: number | null; photoPositionY: number | null; photoZoom: number | null }[];
  absentPlayers?: { id: number; name: string; reason: string | null; photoUrl: string | null; photoPositionX: number | null; photoPositionY: number | null; photoZoom: number | null }[];
  requireAbsenceReason?: boolean;
  readOnly?: boolean;
  supportViewLabel?: string | null;
};

type AttendanceAvatarPlayer = { name: string; photoUrl: string | null; photoPositionX: number | null; photoPositionY: number | null };

function AttendanceAvatar({ player, tone }: { player: AttendanceAvatarPlayer; tone: "cyan" | "rose" }) {
  const fallbackClasses = tone === "cyan" ? "bg-cyan-100 text-cyan-800" : "bg-rose-100 text-rose-800";
  return (
    <span className={`relative isolate flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-black uppercase ring-2 ring-white ${fallbackClasses}`}>
      {player.photoUrl ? (
        <img
          src={player.photoUrl}
          alt=""
          className="absolute inset-0 block h-full w-full max-w-none object-cover"
          style={{ objectPosition: `${player.photoPositionX ?? 50}% ${player.photoPositionY ?? 50}%` }}
        />
      ) : (player.name.trim().charAt(0) || "?")}
    </span>
  );
}

function formatDeadline(date: Date, locale: AppLocale) {
  return date.toLocaleString(locale === "de" ? "de-DE" : "en-GB", {
    timeZone: "Europe/Berlin",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getRemainingLabel(
  deadline: Date,
  now: Date,
  locale: AppLocale,
) {
  const diffMs = deadline.getTime() - now.getTime();
  if (diffMs <= 0) return locale === "de" ? "Frist vorbei" : "Deadline passed";
  const totalMinutes = Math.ceil(diffMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) {
    return locale === "de"
      ? `noch ${days} Tg ${hours} Std`
      : `${days}d ${hours}h left`;
  }
  if (hours > 0) {
    return locale === "de"
      ? `noch ${hours} Std ${minutes} Min`
      : `${hours}h ${minutes}m left`;
  }
  return locale === "de" ? `noch ${minutes} Min` : `${minutes}m left`;
}

function getDeadlineTone(deadline: Date | null, now: Date | null): DeadlineTone {
  if (!deadline || !now) return "normal";
  const diffMs = deadline.getTime() - now.getTime();
  if (diffMs <= 0) return "passed";
  if (diffMs <= 2 * 60 * 60 * 1000) return "urgent";
  if (diffMs <= 24 * 60 * 60 * 1000) return "soon";
  return "normal";
}

function deadlineTextClasses(tone: DeadlineTone) {
  if (tone === "passed") return "text-rose-700";
  if (tone === "urgent") return "text-amber-800";
  if (tone === "soon") return "text-amber-700";
  return "text-slate-500";
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
  participants = [],
  absentPlayers = [],
  requireAbsenceReason = false,
  readOnly = false,
  supportViewLabel = null,
}: NextSessionAttendanceCardProps) {
  const router = useRouter();
  const { locale, t } = useI18n();
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
  const [showAttendanceDetails, setShowAttendanceDetails] = useState(false);

  useEffect(() => {
    setNow(new Date());
    const interval = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    setStatus(initialStatus);
    setPresentCount(initialPresentCount);
    setAbsentCount(initialAbsentCount);
  }, [initialStatus, initialPresentCount, initialAbsentCount, sessionId]);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const refreshOnFocus = () => router.refresh();

    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshOnFocus);
    return () => {
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [router]);

  useEffect(() => {
    if (readOnly) {
      setNotNominated(false);
      return;
    }

    let active = true;
    fetch(`/api/sessions/${sessionId}/event-roster`, { credentials: "same-origin" })
      .then(async (response) => response.ok ? response.json() as Promise<{ isEvent?: boolean; currentPlayerNominated?: boolean }> : null)
      .then((payload) => {
        if (!active || !payload?.isEvent) return;
        setNotNominated(payload.currentPlayerNominated === false);
      })
      .catch(() => null);
    return () => { active = false; };
  }, [sessionId, readOnly]);

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
  const deadlineText = deadline ? t("session.rsvpUntil", { date: formatDeadline(deadline, locale) }) : null;
  const remainingText = deadline && now ? getRemainingLabel(deadline, now, locale) : null;

  async function updateStatus(nextStatus: PresenceStatus, action: Exclude<PendingAction, null>, absenceReason = "") {
    if (readOnly || busy || status === nextStatus || notNominated) return;

    if (nextStatus === "out" && requireAbsenceReason) {
      const reasonError = getRequiredRsvpReasonError(absenceReason, t("rsvp.reasonRequired"));
      if (reasonError) {
        setErrorMessage(reasonError);
        return;
      }
    }

    if (deadlineTone === "passed" && status === "in" && nextStatus !== "in") {
      setErrorMessage(t("session.deadlineLockedError"));
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
      if (!response.ok) throw new Error(payload?.error || t("session.saveError"));

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
      router.refresh();
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : t("session.saveError"));
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }

  const inActive = status === "in";
  const outActive = status === "out";
  const reasonValid =
    !requireAbsenceReason || isMeaningfulRsvpReason(reason);

  return (
    <section className="relative overflow-hidden rounded-[26px] border border-slate-200/80 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-cyan-100/55 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 bottom-0 h-40 w-40 rounded-full bg-slate-100/60 blur-3xl" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-600">{t("session.nextTraining")}</div>
          <h2 className="mt-1.5 text-[18px] font-semibold leading-tight tracking-[-0.035em] text-slate-950 sm:text-[21px]">{title}</h2>
          {text?.trim() ? <p className="mt-1.5 line-clamp-2 text-xs font-medium leading-5 text-slate-500">{text.trim()}</p> : null}
          {deadlineText ? (
            <div className={`mt-3 flex max-w-full items-start gap-1.5 text-[11px] font-semibold leading-4 ${deadlineTextClasses(deadlineTone)}`}>
              <Clock3 className="mt-px h-3.5 w-3.5 shrink-0" />
              <span>{deadlineText}{remainingText ? ` · ${remainingText}` : ""}</span>
            </div>
          ) : null}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 ring-1 ring-cyan-100"><CalendarDays className="h-4 w-4" /></div>
      </div>

      {notNominated ? (
        <div className="relative mt-4 rounded-[22px] border border-slate-200 bg-slate-50 px-3 py-3 text-xs font-bold text-slate-700">
          {t("session.notInRoster")}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="relative mt-4 rounded-[18px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">
          {errorMessage}
        </div>
      ) : null}

      {!notNominated ? (
        <div className="relative mt-4 rounded-[22px] bg-slate-50 p-1.5 ring-1 ring-slate-200">
          <div className="grid grid-cols-2 gap-1.5">
            <button type="button" onClick={() => void updateStatus(inActive ? "open" : "in", "in")} disabled={readOnly || busy || (deadlineTone === "passed" && inActive)} aria-busy={pendingAction === "in"} className={["min-h-[68px] rounded-[18px] px-3 py-2.5 text-left transition disabled:opacity-60", inActive ? "bg-cyan-500 text-white shadow-[0_8px_18px_rgba(6,182,212,0.18)]" : "bg-white text-slate-950 ring-1 ring-slate-200 hover:bg-cyan-50"].join(" ")}>
              <div className="flex items-center gap-2.5"><span className={["flex h-10 w-10 shrink-0 items-center justify-center rounded-full", inActive ? "bg-white/20 text-white ring-1 ring-white/25" : "bg-cyan-50 text-cyan-600 ring-1 ring-cyan-100"].join(" ")}><UserCheck className="h-5 w-5" /></span><span className="min-w-0"><span className="block text-sm font-semibold tracking-[-0.03em]">{pendingAction === "in" ? t("session.saving") : inActive ? t("session.going") : t("session.imGoing")}</span><span className={["mt-0.5 block text-xs font-medium", inActive ? "text-white/75" : "text-slate-500"].join(" ")}>{t("session.goingCount", { count: presentCount })}</span></span></div>
            </button>
            <button type="button" onClick={() => { if (outActive) void updateStatus("open", "out"); else setReasonOpen(true); }} disabled={readOnly || busy || (deadlineTone === "passed" && inActive)} aria-busy={pendingAction === "out"} className={["min-h-[76px] rounded-[24px] px-3 py-3 text-left transition disabled:opacity-60", outActive ? "bg-rose-500 text-white shadow-[0_8px_18px_rgba(244,63,94,0.16)]" : "bg-rose-50 text-slate-950 shadow-[0_8px_18px_rgba(244,63,94,0.08)] hover:bg-rose-100/70"].join(" ")}>
              <div className="flex items-center gap-2.5"><span className={["flex h-10 w-10 shrink-0 items-center justify-center rounded-full", outActive ? "bg-white/15 text-white ring-1 ring-white/20" : "bg-white text-rose-500 ring-1 ring-rose-100"].join(" ")}><UserX className="h-5 w-5" /></span><span className="min-w-0"><span className="block text-sm font-semibold tracking-[-0.03em]">{pendingAction === "out" ? t("session.saving") : deadlineTone === "passed" && inActive ? t("session.cantCancel") : outActive ? t("session.notGoing") : t("session.imOut")}</span><span className={["mt-0.5 block text-xs font-medium", outActive ? "text-white/75" : "text-rose-500"].join(" ")}>{t("session.outCount", { count: absentCount })}</span></span></div>
            </button>
          </div>
          {readOnly ? (
            <div className="m-1.5 mt-2 rounded-[18px] border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-violet-700">
              {t("session.supportView", { label: supportViewLabel ? ` · ${supportViewLabel}` : "" })}
            </div>
          ) : deadlineTone === "passed" && inActive ? (
            <div className="m-1.5 mt-2 rounded-[18px] border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
              {t("session.commitmentLocked")}
            </div>
          ) : null}
          {reasonOpen ? (
            <div className="m-1.5 mt-2 rounded-[20px] border border-rose-200 bg-white p-3">
              <div className="text-xs font-bold text-rose-800">
                {t("session.whyOut")}{" "}
                <span className="font-medium text-rose-500">
                  {requireAbsenceReason ? t("session.required") : t("session.optional")}
                </span>
              </div>
              <input autoFocus value={reason} maxLength={80} onChange={(event) => { setReason(event.target.value); setErrorMessage(""); }} placeholder={t("session.reasonPlaceholder")} className="mt-2 w-full rounded-xl border border-rose-200 px-3 py-2 text-xs outline-none focus:border-rose-400" />
              {requireAbsenceReason ? (
                <div className={`mt-1.5 text-[10px] font-semibold ${reason.length > 0 && !reasonValid ? "text-rose-700" : "text-slate-500"}`}>
                  {t("session.reasonHint")}
                </div>
              ) : null}
              <div className="mt-2 flex justify-end gap-2"><button type="button" onClick={() => { setReasonOpen(false); setReason(""); setErrorMessage(""); }} className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-500">{t("common.cancel")}</button><button type="button" disabled={busy || !reasonValid} onClick={() => void updateStatus("out", "out", reason)} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-black text-white disabled:opacity-40">{t("session.saveAbsence")}</button></div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="relative mt-3 grid grid-cols-2 gap-2">
        <div className="overflow-hidden rounded-[18px] border border-cyan-100 bg-cyan-50/45">
          <button
            type="button"
            onClick={() => setShowAttendanceDetails((value) => !value)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500 text-xs font-black text-white">
                {presentCount}
              </span>
              <div>
                <div className="text-sm font-black text-slate-950">{t("session.in")}</div>
                <div className="text-[11px] font-medium text-cyan-700">
                  {presentCount === 1 ? t("session.oneGoing") : t("session.manyGoing", { count: presentCount })}
                </div>
              </div>
            </div>
            <ChevronDown className={`h-4 w-4 text-cyan-700 transition ${showAttendanceDetails ? "rotate-180" : ""}`} />
          </button>

          {showAttendanceDetails ? (
            <div className="border-t border-cyan-100 bg-white/80 px-3 py-3">
              {participants.length > 0 ? (
                <div className="divide-y divide-cyan-100/70">
                  {participants.map((player) => (
                    <div key={`participant-${player.id}`} className="flex min-h-12 items-center gap-3 px-1 py-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cyan-100 text-xs font-black uppercase text-cyan-800 ring-2 ring-white">
                        {player.photoUrl ? (
                          <img src={player.photoUrl} alt="" className="h-full w-full object-cover" style={{ objectPosition: `${player.photoPositionX ?? 50}% ${player.photoPositionY ?? 50}%`, transformOrigin: `${player.photoPositionX ?? 50}% ${player.photoPositionY ?? 50}%`, transform: `scale(${player.photoZoom ?? 1})` }} />
                        ) : (player.name.trim().charAt(0) || "?")}
                      </span>
                      <span className="min-w-0 truncate text-sm font-bold text-slate-800">{player.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-1 py-1 text-xs font-medium text-slate-500">{t("session.noGoing")}</div>
              )}
            </div>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-[20px] border border-rose-100 bg-rose-50/60">
          <button
            type="button"
            onClick={() => setShowAttendanceDetails((value) => !value)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-600 text-xs font-black text-white">
                {absentCount}
              </span>
              <div>
                <div className="text-sm font-black text-slate-950">{t("session.out")}</div>
                <div className="text-[11px] font-medium text-rose-700">
                  {absentCount === 1 ? t("session.oneOut") : t("session.manyOut", { count: absentCount })}
                </div>
              </div>
            </div>
            <ChevronDown className={`h-4 w-4 text-rose-700 transition ${showAttendanceDetails ? "rotate-180" : ""}`} />
          </button>

          {showAttendanceDetails ? (
            <div className="border-t border-rose-100 bg-white/70 px-3 py-3">
              {absentPlayers.length > 0 ? (
                <div className="divide-y divide-rose-100/70">
                  {absentPlayers.map((player) => (
                    <div key={`absence-${player.id}`} className="flex min-h-12 items-center gap-3 px-1 py-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-rose-100 text-xs font-black uppercase text-rose-800 ring-2 ring-white">
                        {player.photoUrl ? (
                          <img src={player.photoUrl} alt="" className="h-full w-full object-cover" style={{ objectPosition: `${player.photoPositionX ?? 50}% ${player.photoPositionY ?? 50}%`, transformOrigin: `${player.photoPositionX ?? 50}% ${player.photoPositionY ?? 50}%`, transform: `scale(${player.photoZoom ?? 1})` }} />
                        ) : (player.name.trim().charAt(0) || "?")}
                      </span>
                      <div className="min-w-0">
                      <div className="truncate text-sm font-black text-slate-800">{player.name}</div>
                      <div className={`mt-0.5 text-[11px] leading-4 ${player.reason ? "font-normal text-slate-500" : "text-slate-400"}`}>
                        {player.reason ? player.reason : t("session.noReason")}
                      </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-1 py-1 text-xs font-medium text-slate-500">{t("session.noOut")}</div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <LateRsvpModal
        open={latePenaltyMessage !== null}
        message={latePenaltyMessage ?? ""}
        onClose={() => setLatePenaltyMessage(null)}
      />

      <div className="relative mt-3 flex justify-end">
        <Link href={href} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-slate-600 shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">{t("session.openTraining")}<ArrowRight className="h-3.5 w-3.5" /></Link>
      </div>
    </section>
  );
}
