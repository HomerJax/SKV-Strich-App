"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

export default function NewSessionPage() {
  const router = useRouter();

  const [date, setDate] = useState<string>(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });

  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function createSession() {
    try {
      setSaving(true);
      setErr(null);

      if (!date) throw new Error("Bitte Datum auswählen.");

      // 1) Saison anhand Datum ermitteln (optional)
      const { data: season, error: seasonErr } = await supabase
        .from("seasons")
        .select("id, start_date, end_date")
        .lte("start_date", date)
        .gte("end_date", date)
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (seasonErr) throw seasonErr;

      // 2) Session anlegen und ID sicher zurückholen
      const { data: created, error: insErr } = await supabase
        .from("sessions")
        .insert({
          date,
          notes: notes.trim() === "" ? null : notes.trim(),
          season_id: season?.id ?? null,
        })
        .select("id")
        .single();

      if (insErr) throw insErr;

      // 3) Direkt zur Session-Detailseite
      router.push(`/sessions/${created.id}`);
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Fehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => router.push("/sessions")}
        className="text-xs text-slate-500 hover:text-slate-700"
      >
        ← Zurück zu Trainings
      </button>

      <div>
        <h1 className="text-lg font-semibold text-slate-900">Neues Training</h1>
        <p className="text-xs text-slate-500">
          Saison wird automatisch über das Datum erkannt.
        </p>
      </div>

      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {err}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <label className="block">
          <div className="text-xs font-semibold text-slate-700 mb-1">Datum</div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <div className="text-xs font-semibold text-slate-700 mb-1">Notiz</div>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="optional"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </label>

        <button
          onClick={createSession}
          disabled={saving}
          className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Speichere…" : "Training anlegen"}
        </button>
      </div>
    </div>
  );
}
