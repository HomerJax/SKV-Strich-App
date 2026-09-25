"use client";

import { useEffect, useState } from "react";
import LateRsvpModal from "@/components/sessions/LateRsvpModal";
import { useI18n } from "@/components/i18n/I18nProvider";
import {
  getRequiredRsvpReasonError,
  isMeaningfulRsvpReason,
} from "@/lib/rsvp-reason";

type PresenceStatus = "in" | "out" | "open";

export default function SessionRsvpButtons({
  sessionId,
  initialStatus,
  deadlineEpochMs = null,
  onStatusChange,
  requireAbsenceReason = false,
  readOnly = false,
}: {
  sessionId: number;
  initialStatus: PresenceStatus;
  deadlineEpochMs?: number | null;
  onStatusChange?: (status: PresenceStatus) => void;
  requireAbsenceReason?: boolean;
  readOnly?: boolean;
}) {
  const { t } = useI18n();
  const [status, setStatus] = useState<PresenceStatus>(initialStatus);
  const [busy, setBusy] = useState<PresenceStatus | null>(null);
  const [error, setError] = useState("");
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [notNominated, setNotNominated] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [latePenaltyMessage, setLatePenaltyMessage] = useState<string | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (readOnly) {
      setNotNominated(false);
      return;
    }

    let active = true;
    fetch(`/api/sessions/${sessionId}/event-roster`, { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json() as Promise<{ isEvent?: boolean; currentPlayerNominated?: boolean }>;
      })
      .then((payload) => {
        if (!active || !payload?.isEvent) return;
        setNotNominated(payload.currentPlayerNominated === false);
      })
      .catch(() => null);
    return () => { active = false; };
  }, [sessionId, readOnly]);

  const deadlinePassed = deadlineEpochMs !== null && now >= deadlineEpochMs;

  async function setPresence(nextStatus: "in" | "out", absenceReason = "") {
    if (readOnly || busy || notNominated) return;
    const target: PresenceStatus = status === nextStatus ? "open" : nextStatus;

    if (target === "out" && requireAbsenceReason) {
      const reasonError = getRequiredRsvpReasonError(absenceReason);
      if (reasonError) {
        setError(reasonError);
        return;
      }
    }

    if (deadlinePassed && status === "in" && target !== "in") {
      setError(t("session.deadlineLockedError"));
      return;
    }

    try {
      setBusy(nextStatus);
      setError("");

      const formData = new FormData();
      formData.set("intent", "set_self_presence");
      formData.set("status", target);
      if (target === "out") formData.set("reason", absenceReason.trim().slice(0, 80));

      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });
      const raw = await response.text();
      const payload = raw ? JSON.parse(raw) : null;
      if (!response.ok) throw new Error(payload?.error || t("session.responseSaveError"));

      setStatus(target);
      onStatusChange?.(target);
      if (target === "in" && payload?.latePenalty?.message) {
        setLatePenaltyMessage(String(payload.latePenalty.message));
      }
      setReasonOpen(false);
      if (target !== "out") setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("session.responseSaveError"));
    } finally {
      setBusy(null);
    }
  }

  const reasonValid =
    !requireAbsenceReason || isMeaningfulRsvpReason(reason);

  if (notNominated) {
    return (
      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
        {t("session.notInRoster")}
      </div>
    );
  }

  return (
    <div className="mt-3" onClick={(event) => event.preventDefault()}>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={readOnly || busy !== null || (deadlinePassed && status === "in")} onClick={(event) => { event.preventDefault(); event.stopPropagation(); void setPresence("in"); }} className={["rounded-xl border px-3 py-2 text-xs font-bold transition disabled:opacity-60", status === "in" ? "border-emerald-600 bg-emerald-600 text-white" : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"].join(" ")}>
          {busy === "in" ? t("session.saving") : status === "in" ? t("session.confirmed") : t("session.confirm")}
        </button>
        <button type="button" disabled={readOnly || busy !== null || (deadlinePassed && status === "in")} onClick={(event) => { event.preventDefault(); event.stopPropagation(); if (status === "out") void setPresence("out"); else setReasonOpen(true); }} className={["rounded-xl border px-3 py-2 text-xs font-bold transition disabled:opacity-60", status === "out" ? "border-rose-600 bg-rose-600 text-white" : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"].join(" ")}>
          {busy === "out" ? t("session.saving") : deadlinePassed && status === "in" ? t("session.cantCancel") : status === "out" ? t("session.cancelled") : t("session.decline")}
        </button>
      </div>

      {readOnly ? (
        <div className="mt-2 text-[11px] font-semibold text-violet-700">
          {t("session.supportView", { label: "" })}
        </div>
      ) : deadlinePassed && status === "in" ? (
        <div className="mt-2 text-[11px] font-semibold text-slate-500">
          {t("session.commitmentLocked")}
        </div>
      ) : null}

      {reasonOpen ? (
        <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5" onClick={(event) => event.stopPropagation()}>
          <div className="text-[11px] font-bold text-rose-800">
            {t("session.whyOut")}{" "}
            <span className="font-medium text-rose-500">
              {requireAbsenceReason ? t("session.required") : t("session.optional")}
            </span>
          </div>
          <input autoFocus value={reason} maxLength={80} onChange={(event) => { setReason(event.target.value); setError(""); }} placeholder={t("session.reasonPlaceholder")} className="mt-2 w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs outline-none focus:border-rose-400" />
          {requireAbsenceReason ? (
            <div className={`mt-1.5 text-[10px] font-semibold ${reason.length > 0 && !reasonValid ? "text-rose-700" : "text-slate-500"}`}>
              {t("session.reasonHint")}
            </div>
          ) : null}
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={() => { setReasonOpen(false); setReason(""); setError(""); }} className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-500">{t("common.cancel")}</button>
            <button type="button" disabled={busy !== null || !reasonValid} onClick={() => void setPresence("out", reason)} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-black text-white disabled:opacity-40">{t("session.saveAbsence")}</button>
          </div>
        </div>
      ) : null}

      {error ? <div className="mt-2 text-xs font-semibold text-rose-700">{error}</div> : null}
      <LateRsvpModal
        open={latePenaltyMessage !== null}
        message={latePenaltyMessage ?? ""}
        onClose={() => setLatePenaltyMessage(null)}
      />
    </div>
  );
}
