"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

type Membership = {
  user_id: string;
  club_id: string;
  role: string;
};

function getCookie(name: string) {
  if (typeof document === "undefined") return null;

  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name.replace(/[$()*+./?[\\\]^{|}-]/g, "\\$&")}=([^;]*)`)
  );

  return match ? decodeURIComponent(match[1]) : null;
}

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

      if (!date) {
        throw new Error("Bitte Datum auswählen.");
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user?.id) {
        router.push("/login?next=/sessions/new");
        return;
      }

      const { data: membershipsData, error: membershipError } = await supabase
        .from("club_memberships")
        .select("user_id, club_id, role")
        .eq("user_id", user.id);

      if (membershipError) {
        throw new Error(
          "Membership konnte nicht geladen werden: " + membershipError.message
        );
      }

      const memberships = (membershipsData ?? []) as Membership[];

      if (memberships.length === 0) {
        router.push("/club-setup");
        return;
      }

      const validClubIds = new Set(memberships.map((m) => m.club_id));
      const activeClubIdFromCookie = getCookie("active_club_id");

      const clubId =
        memberships.length === 1
          ? memberships[0].club_id
          : activeClubIdFromCookie && validClubIds.has(activeClubIdFromCookie)
            ? activeClubIdFromCookie
            : null;

      if (!clubId) {
        router.push("/select-club");
        return;
      }

      const { data: season, error: seasonErr } = await supabase
        .from("seasons")
        .select("id, start_date, end_date")
        .eq("club_id", clubId)
        .lte("start_date", date)
        .gte("end_date", date)
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (seasonErr) {
        throw seasonErr;
      }

      const { data: created, error: insErr } = await supabase
        .from("sessions")
        .insert({
          date,
          notes: notes.trim() === "" ? null : notes.trim(),
          season_id: season?.id ?? null,
          club_id: clubId,
        })
        .select("id")
        .single();

      if (insErr) {
        throw insErr;
      }

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

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <label className="block">
          <div className="mb-1 text-xs font-semibold text-slate-700">Datum</div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <div className="mb-1 text-xs font-semibold text-slate-700">Notiz</div>
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