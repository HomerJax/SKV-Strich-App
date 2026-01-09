"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import ExportButtons from "@/components/ExportButtons";

type Player = {
  id: number;
  name: string;
  age_group: string | null;
  preferred_position: string | null;
  is_active: boolean | null;
};

type SessionRow = {
  id: number;
  date: string;
  notes: string | null;
};

function positionLabel(pos: string | null) {
  if (pos === "defense") return "Hinten";
  if (pos === "attack") return "Vorne";
  if (pos === "goalkeeper") return "Torwart";
  return "Unbekannt";
}

function badgeColor(pos: string | null) {
  if (pos === "defense") return "bg-sky-100 text-sky-800";
  if (pos === "attack") return "bg-orange-100 text-orange-800";
  if (pos === "goalkeeper") return "bg-purple-100 text-purple-800";
  return "bg-slate-100 text-slate-700";
}

function ageBadge(a: string | null) {
  if (a === "Ü32") return "bg-zinc-900 text-white";
  if (a === "AH") return "bg-zinc-100 text-zinc-900 border border-zinc-300";
  return "bg-slate-100 text-slate-700";
}

export default function SessionDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const sessionId = Number(params.id);

  const resultRef = useRef<HTMLDivElement | null>(null);

  const [session, setSession] = useState<SessionRow | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [presentIds, setPresentIds] = useState<number[]>([]);

  const [manualTeams, setManualTeams] = useState<Record<number, "A" | "B" | null>>({});

  const [goalsA, setGoalsA] = useState("");
  const [goalsB, setGoalsB] = useState("");
  const [hasResult, setHasResult] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // ---------- Laden ----------
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setErr(null);

        const { data: sData, error: sErr } = await supabase
          .from("sessions")
          .select("id, date, notes")
          .eq("id", sessionId)
          .single();
        if (sErr) throw sErr;

        const { data: pData, error: pErr } = await supabase
          .from("players")
          .select("id, name, is_active, age_group, preferred_position")
          .order("name");
        if (pErr) throw pErr;

        const active = (pData ?? []).filter((p) => p.is_active !== false) as Player[];

        const { data: spData, error: spErr } = await supabase
          .from("session_players")
          .select("player_id")
          .eq("session_id", sessionId);
        if (spErr) throw spErr;

        const present = (spData ?? []).map((r) => r.player_id as number);

        const { data: rData } = await supabase
          .from("results")
          .select("id, team_a_id, team_b_id, goals_team_a, goals_team_b")
          .eq("session_id", sessionId)
          .maybeSingle();

        let teamAssignment: Record<number, "A" | "B" | null> = {};
        present.forEach((pid) => (teamAssignment[pid] = null));

        if (rData && (rData.team_a_id || rData.team_b_id)) {
          const teamIds = [rData.team_a_id, rData.team_b_id].filter(Boolean) as number[];
          const { data: tpData } = await supabase
            .from("team_players")
            .select("team_id, player_id")
            .in("team_id", teamIds);

          for (const tp of tpData ?? []) {
            if (tp.team_id === rData.team_a_id) teamAssignment[tp.player_id] = "A";
            if (tp.team_id === rData.team_b_id) teamAssignment[tp.player_id] = "B";
          }

          if (rData.goals_team_a != null) setGoalsA(String(rData.goals_team_a));
          if (rData.goals_team_b != null) setGoalsB(String(rData.goals_team_b));

          setHasResult(true);
        }

        setSession(sData as SessionRow);
        setPlayers(active);
        setPresentIds(present);
        setManualTeams(teamAssignment);
      } catch (e: any) {
        setErr(e.message ?? "Fehler beim Laden.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [sessionId]);

  const present = players.filter((p) => presentIds.includes(p.id));
  const teamA = present.filter((p) => manualTeams[p.id] === "A");
  const teamB = present.filter((p) => manualTeams[p.id] === "B");

  // ---------- Anwesenheit ----------
  async function togglePresence(id: number) {
    setErr(null);
    const isPresent = presentIds.includes(id);

    if (isPresent) {
      await supabase.from("session_players").delete().eq("session_id", sessionId).eq("player_id", id);

      setPresentIds((x) => x.filter((p) => p !== id));
      setManualTeams((m) => {
        const copy = { ...m };
        delete copy[id];
        return copy;
      });
    } else {
      await supabase.from("session_players").insert({ session_id: sessionId, player_id: id });

      setPresentIds((x) => [...x, id]);
      setManualTeams((m) => ({ ...m, [id]: null }));
    }
  }

  // ---------- Teamgenerator ----------
  function generateTeams() {
    setMsg(null);
    setErr(null);

    if (present.length < 2) {
      setErr("Mindestens 2 Spieler nötig.");
      return;
    }

    const keepers = present.filter((p) => p.preferred_position === "goalkeeper");
    const field = present.filter((p) => p.preferred_position !== "goalkeeper");

    const a: Player[] = [];
    const b: Player[] = [];

    // Torwart-Verteilung
    keepers.forEach((k, i) => (i % 2 === 0 ? a.push(k) : b.push(k)));

    // Scores: Ü32 und AH fair, vorne/hinten fair
    const ageScore = (ag: string | null) => (ag === "Ü32" ? 1 : ag === "AH" ? -1 : 0);
    const posScore = (p: string | null) => (p === "attack" ? 1 : p === "defense" ? -1 : 0);

    function evaluate(A: Player[], B: Player[]) {
      const ad =
        Math.abs(A.reduce((s, p) => s + ageScore(p.age_group), 0) - B.reduce((s, p) => s + ageScore(p.age_group), 0)) *
        3;

      const pd =
        Math.abs(A.reduce((s, p) => s + posScore(p.preferred_position), 0) - B.reduce((s, p) => s + posScore(p.preferred_position), 0)) *
        2;

      const sd = Math.abs(A.length - B.length);

      return ad + pd + sd;
    }

    function shuffle<T>(x: T[]) {
      const c = [...x];
      for (let i = c.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [c[i], c[j]] = [c[j], c[i]];
      }
      return c;
    }

    let bestA: Player[] = [];
    let bestB: Player[] = [];
    let best = Infinity;

    for (let k = 0; k < 250; k++) {
      const A = [...a];
      const B = [...b];

      for (const p of shuffle(field)) {
        (A.length > B.length ? B : A).push(p);
      }

      const score = evaluate(A, B);
      if (score < best) {
        best = score;
        bestA = A;
        bestB = B;
      }
    }

    const next: Record<number, "A" | "B" | null> = {};
    present.forEach((p) => {
      if (bestA.some((x) => x.id === p.id)) next[p.id] = "A";
      else if (bestB.some((x) => x.id === p.id)) next[p.id] = "B";
      else next[p.id] = null;
    });

    setManualTeams(next);
    setMsg("Teams automatisch verteilt. Du kannst manuell anpassen.");
  }

  // ---------- Ergebnis speichern ----------
  async function saveResult() {
    try {
      setSaving(true);
      setErr(null);
      setMsg(null);

      const A = present.filter((p) => manualTeams[p.id] === "A");
      const B = present.filter((p) => manualTeams[p.id] === "B");

      if (A.length === 0 || B.length === 0) throw new Error("Beide Teams brauchen mindestens einen Spieler.");

      const { data: existing } = await supabase
        .from("results")
        .select("id")
        .eq("session_id", sessionId)
        .maybeSingle();

      async function ensureTeam(name: string) {
        const { data } = await supabase.from("teams").select("id").eq("session_id", sessionId).eq("name", name).maybeSingle();
        if (data) return data.id;

        const { data: ins } = await supabase.from("teams").insert({ session_id: sessionId, name }).select().single();
        return ins!.id as number;
      }

      const teamAId = await ensureTeam("Team 1");
      const teamBId = await ensureTeam("Team 2");

      await supabase.from("team_players").delete().in("team_id", [teamAId, teamBId]);

      await supabase.from("team_players").insert([
        ...A.map((p) => ({ team_id: teamAId, player_id: p.id })),
        ...B.map((p) => ({ team_id: teamBId, player_id: p.id })),
      ]);

      const payload = {
        session_id: sessionId,
        team_a_id: teamAId,
        team_b_id: teamBId,
        goals_team_a: goalsA === "" ? null : Number(goalsA),
        goals_team_b: goalsB === "" ? null : Number(goalsB),
      };

      if (existing) {
        await supabase.from("results").update(payload).eq("session_id", sessionId);
      } else {
        await supabase.from("results").insert(payload);
      }

      setHasResult(true);
      setMsg("Ergebnis gespeichert.");
    } catch (e: any) {
      setErr(e.message ?? "Fehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  }

  // ---------- Ergebnis löschen (Punkte weg + neu eingeben) ----------
  async function deleteResult() {
    try {
      setSaving(true);
      setErr(null);
      setMsg(null);

      const { data: rData, error: rErr } = await supabase
        .from("results")
        .select("team_a_id, team_b_id")
        .eq("session_id", sessionId)
        .maybeSingle();
      if (rErr) throw rErr;

      const teamIds = [rData?.team_a_id, rData?.team_b_id].filter(Boolean) as number[];

      await supabase.from("results").delete().eq("session_id", sessionId);

      if (teamIds.length > 0) {
        await supabase.from("team_players").delete().in("team_id", teamIds);
        await supabase.from("teams").delete().eq("session_id", sessionId);
      }

      setGoalsA("");
      setGoalsB("");
      setHasResult(false);
      setMsg("Ergebnis gelöscht. Du kannst neu eintragen.");
    } catch (e: any) {
      setErr(e.message ?? "Fehler beim Löschen.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-4 text-sm text-slate-500">Lade…</div>;
  if (err) return <div className="p-4 text-sm text-red-700 bg-red-50">{err}</div>;

  return (
    <div className="space-y-4">
      {/* Zurück */}
      <button onClick={() => router.push("/sessions")} className="text-xs text-slate-500 hover:text-slate-700">
        ← Zurück zu Trainings
      </button>

      {/* Kopf + Export */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">
            Training {new Date(session!.date).toLocaleDateString("de-DE")}
          </h1>
          {session?.notes && <div className="text-[11px] text-slate-500">{session.notes}</div>}
        </div>

        {/* Export: Teams + Ergebnis */}
        <ExportButtons targetId="export-session" fileBaseName="skv-ergebnis" />
      </div>

      {/* Anwesenheit */}
      <div className="rounded-xl border p-3 bg-white space-y-2">
        <div className="text-xs font-semibold">Anwesend</div>
        {players.map((p) => {
          const on = presentIds.includes(p.id);
          return (
            <button
              key={p.id}
              onClick={() => togglePresence(p.id)}
              className={`w-full flex items-center justify-between rounded-lg border px-3 py-1.5 text-sm ${
                on ? "bg-emerald-50" : "bg-white"
              }`}
            >
              <span className="font-medium text-slate-900">{p.name}</span>

              <span className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-md text-[11px] ${ageBadge(p.age_group)}`}>
                  {p.age_group ?? "?"}
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[11px] ${badgeColor(p.preferred_position)}`}>
                  {positionLabel(p.preferred_position)}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* EXPORT TARGET: Teams + Ergebnis */}
      <div id="export-session" className="space-y-4">
        {/* Teams */}
        <div className="rounded-xl border bg-white p-3 space-y-3">
          <div className="flex justify-between items-center">
            <div className="text-xs font-semibold">Teams</div>
            <button onClick={generateTeams} className="text-xs border px-2 py-1 rounded-lg">
              Teams generieren
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 rounded-lg border p-2">
              <div className="text-xs font-semibold">Team 1</div>
              {teamA.length === 0 ? (
                <div className="text-[11px] text-slate-400">Noch kein Spieler zugewiesen.</div>
              ) : (
                teamA.map((p) => (
                  <button
                    key={p.id}
                    onClick={() =>
                      setManualTeams((m) => ({
                        ...m,
                        [p.id]: m[p.id] === "A" ? null : "A",
                      }))
                    }
                    className="w-full text-left rounded-md px-2 py-1 text-xs bg-blue-50"
                  >
                    {p.name}
                  </button>
                ))
              )}
            </div>

            <div className="space-y-1 rounded-lg border p-2">
              <div className="text-xs font-semibold">Team 2</div>
              {teamB.length === 0 ? (
                <div className="text-[11px] text-slate-400">Noch kein Spieler zugewiesen.</div>
              ) : (
                teamB.map((p) => (
                  <button
                    key={p.id}
                    onClick={() =>
                      setManualTeams((m) => ({
                        ...m,
                        [p.id]: m[p.id] === "B" ? null : "B",
                      }))
                    }
                    className="w-full text-left rounded-md px-2 py-1 text-xs bg-blue-50"
                  >
                    {p.name}
                  </button>
                ))
              )}
            </div>
          </div>

          {msg && <div className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded-md">{msg}</div>}
        </div>

        {/* Ergebnis */}
        <div ref={resultRef} className="rounded-xl border bg-white p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold">Ergebnis</div>

            {hasResult && (
              <button
                disabled={saving}
                onClick={deleteResult}
                className="rounded-lg border px-3 py-1.5 text-xs shadow-sm bg-red-50 border-red-200 text-red-700"
              >
                Ergebnis löschen
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              value={goalsA}
              onChange={(e) => setGoalsA(e.target.value)}
              placeholder="Team 1"
              className="w-16 rounded-md border px-2 py-1 text-center"
            />
            <span className="text-sm">:</span>
            <input
              value={goalsB}
              onChange={(e) => setGoalsB(e.target.value)}
              placeholder="Team 2"
              className="w-16 rounded-md border px-2 py-1 text-center"
            />
          </div>

          <button
            disabled={saving}
            onClick={saveResult}
            className="rounded-lg border px-3 py-1.5 text-xs shadow-sm bg-emerald-50"
          >
            {saving ? "Speichere…" : "Ergebnis speichern"}
          </button>

          {err && <div className="text-xs text-red-700 bg-red-50 p-2 rounded-md">{err}</div>}
        </div>
      </div>
    </div>
  );
}
