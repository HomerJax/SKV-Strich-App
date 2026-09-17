"use client";

import { useEffect, useState } from "react";

type PresenceStatus = "in" | "out" | "open";

export default function SessionRsvpButtons({
  sessionId,
  initialStatus,
}: {
  sessionId: number;
  initialStatus: PresenceStatus;
}) {
  const [status, setStatus] = useState<PresenceStatus>(initialStatus);
  const [busy, setBusy] = useState<PresenceStatus | null>(null);
  const [error, setError] = useState("");
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [notNominated, setNotNominated] = useState(false);

  useEffect(() => {
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
  }, [sessionId]);

  async function setPresence(nextStatus: "in" | "out", absenceReason = "") {
    if (busy || notNominated) return;
    const target: PresenceStatus = status === nextStatus ? "open" : nextStatus;

    try {
      setBusy(nextStatus);
      setError("");

      const formData = new FormData();
      formData.set("intent", "set_self_presence");
      formData.set("status", target);

      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });
      const raw = await response.text();
      const payload = raw ? JSON.parse(raw) : null;
      if (!response.ok) throw new Error(payload?.error || "Rückmeldung konnte nicht gespeichert werden.");

      if (target === "out") {
        const reasonResponse = await fetch(`/api/sessions/${sessionId}/rsvp-reason`, {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: absenceReason.trim().slice(0, 80) }),
        });
        const reasonPayload = await reasonResponse.json().catch(() => null) as { error?: string } | null;
        if (!reasonResponse.ok) throw new Error(reasonPayload?.error || "Absagegrund konnte nicht gespeichert werden.");
      }

      setStatus(target);
      setReasonOpen(false);
      if (target !== "out") setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rückmeldung konnte nicht gespeichert werden.");
    } finally {
      setBusy(null);
    }
  }

  if (notNominated) {
    return (
      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
        Nicht im Event-Kader
      </div>
    );
  }

  return (
    <div className="mt-3" onClick={(event) => event.preventDefault()}>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={busy !== null} onClick={(event) => { event.preventDefault(); event.stopPropagation(); void setPresence("in"); }} className={["rounded-xl border px-3 py-2 text-xs font-bold transition disabled:opacity-60", status === "in" ? "border-emerald-600 bg-emerald-600 text-white" : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"].join(" ")}>
          {busy === "in" ? "Speichert…" : status === "in" ? "✓ Zugesagt" : "Zusagen"}
        </button>
        <button type="button" disabled={busy !== null} onClick={(event) => { event.preventDefault(); event.stopPropagation(); if (status === "out") void setPresence("out"); else setReasonOpen(true); }} className={["rounded-xl border px-3 py-2 text-xs font-bold transition disabled:opacity-60", status === "out" ? "border-rose-600 bg-rose-600 text-white" : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"].join(" ")}>
          {busy === "out" ? "Speichert…" : status === "out" ? "✓ Abgesagt" : "Absagen"}
        </button>
      </div>

      {reasonOpen ? (
        <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5" onClick={(event) => event.stopPropagation()}>
          <div className="text-[11px] font-bold text-rose-800">Warum bist du nicht dabei? <span className="font-medium text-rose-500">(optional)</span></div>
          <input autoFocus value={reason} maxLength={80} onChange={(event) => setReason(event.target.value)} placeholder="z. B. Urlaub, Rücken, Frau sagt nein 😄" className="mt-2 w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs outline-none focus:border-rose-400" />
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={() => { setReasonOpen(false); setReason(""); }} className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-500">Abbrechen</button>
            <button type="button" disabled={busy !== null} onClick={() => void setPresence("out", reason)} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-black text-white disabled:opacity-60">Absage speichern</button>
          </div>
        </div>
      ) : null}

      {error ? <div className="mt-2 text-xs font-semibold text-rose-700">{error}</div> : null}
    </div>
  );
}
