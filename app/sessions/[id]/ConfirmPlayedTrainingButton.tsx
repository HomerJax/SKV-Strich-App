"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ConfirmPlayedTrainingButton({ sessionId }: { sessionId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function confirmPlayed() {
    if (!window.confirm("Hat dieses Training wirklich stattgefunden? Nur tatsächliche Teilnahmen dürfen in die Statistik. Eine bloße Zusage zählt nicht.")) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("intent", "complete_training_no_score");
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: "POST", body: form, credentials: "same-origin",
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Abschluss konnte nicht gespeichert werden.");
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Abschluss fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-5xl px-4 pt-3">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <div className="font-black">Training noch nicht abgeschlossen</div>
        <p className="mt-1 leading-6">Für diesen Termin sind Spieler eingetragen, aber kein Ergebnis und kein bestätigter Trainingsabschluss vorhanden. Eine Zusage allein ist keine Teilnahme.</p>
        {done ? <p className="mt-2 font-bold text-emerald-800">Training als durchgeführt bestätigt.</p> : (
          <button type="button" disabled={busy} onClick={() => void confirmPlayed()}
            className="mt-3 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
            {busy ? "Speichere Abschluss…" : "Training hat stattgefunden – ohne Ergebnis abschließen"}
          </button>
        )}
        {error ? <p role="alert" className="mt-2 text-sm font-bold text-red-700">{error}</p> : null}
      </div>
    </section>
  );
}
