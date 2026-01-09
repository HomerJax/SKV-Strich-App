"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

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

const ageScore = (a: string | null) => (a === "Ü32" ? 1 : a === "AH" ? -1 : 0);
const posScore = (p: string | null) => (p === "attack" ? 1 : p === "defense" ? -1 : 0);

// Sortierung & Zusammenfassung für Teams
function sortPlayersInTeam(players: Player[]) {
  const order = (p: Player) => {
    switch (p.preferred_position) {
      case "goalkeeper":
        return 0;
      case "defense":
        return 1;
      case "attack":
        return 2;
      default:
        return 3;
    }
  };

  return [...players].sort((a, b) => {
    const oa = order(a);
    const ob = order(b);
    if (oa !== ob) return oa - ob;
    return a.name.localeCompare(b.name);
  });
}

function summarizeTeam(players: Player[]) {
  const backs = players.filter((p) => p.preferred_position === "defense").length;
  const fronts = players.filter((p) => p.preferred_position === "attack").length;
  const keepers = players.filter((p) => p.preferred_position === "goalkeeper").length;
  const ah = players.filter((p) => p.age_group === "AH").length;
  const u32 = players.filter((p) => p.age_group === "Ü32").length;
  return { backs, fronts, keepers, ah, u32 };
}

export default function SessionDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const sessionId = Number(params.id);

  const resultRef = useRef<HTMLDivElement | null>(null);

  const [session, setSession] = useState<SessionRow | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [presentIds, setPresentIds] = useState<number[]>([]);

  const [manualTeams, setManualTeams] = useState<Record<number, "A" | "B" | null>>(
    {}
  );

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

        // Session
        const { data: sData, error: sErr } = await supabase
          .from("sessions")
          .select("id, date, notes")
          .eq("id", sessionId)
          .single();
        if (sErr) throw sErr;

        // Spieler
        const { data: pData, error: pErr } = await supabase
          .from("players")
          .select("id, name, is_active, age_group, preferred_position")
          .order("name");
        if (pErr) throw pErr;

        const active = (pData ?? []).filter((p) => p.is_active !== false) as Player[];

        // Anwesenheit
        const { data: spData, error: spErr } = await supabase
          .from("session_players")
          .select("player_id")
          .eq("session_id", sessionId);
        if (spErr) throw spErr;

        const present = (spData ?? []).map((r) => r.player_id as number);

        // Ergebnis
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

  // Hilfssetter: Team setzen
  function setTeam(playerId: number, team: "A" | "B" | null) {
    setManualTeams((m) => ({ ...m, [playerId]: team }));
  }

  const present = players.filter((p) => presentIds.includes(p.id));
  const unassigned = present.filter((p) => !manualTeams[p.id]);
  const teamA = present.filter((p) => manualTeams[p.id] === "A");
  const teamB = present.filter((p) => manualTeams[p.id] === "B");

  const teamASorted = sortPlayersInTeam(teamA);
  const teamBSorted = sortPlayersInTeam(teamB);
  const summaryA = summarizeTeam(teamA);
  const summaryB = summarizeTeam(teamB);

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

    keepers.forEach((k, i) => (i % 2 === 0 ? a.push(k) : b.push(k)));

    function evaluate(A: Player[], B: Player[]) {
      const ad =
        Math.abs(
          A.reduce((s, p) => s + ageScore(p.age_group), 0) -
            B.reduce((s, p) => s + ageScore(p.age_group), 0)
        ) * 3;

      const pd =
        Math.abs(
          A.reduce((s, p) => s + posScore(p.preferred_position), 0) -
            B.reduce((s, p) => s + posScore(p.preferred_position), 0)
        ) * 2;

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
    setMsg("Teams automatisch verteilt. Du kannst danach manuell anpassen.");
  }

  // ---------- Ergebnis speichern ----------
  async function saveResult() {
    try {
      setSaving(true);
      setErr(null);
      setMsg(null);

      const A = present.filter((p) => manualTeams[p.id] === "A");
      const B = present.filter((p) => manualTeams[p.id] === "B");

      if (A.length === 0 || B.length === 0) {
        throw new Error("Beide Teams brauchen mindestens einen Spieler.");
      }

      const { data: existing } = await supabase
        .from("results")
        .select("id")
        .eq("session_id", sessionId)
        .maybeSingle();

      async function ensureTeam(name: string) {
        const { data } = await supabase
          .from("teams")
          .select("id")
          .eq("session_id", sessionId)
          .eq("name", name)
          .maybeSingle();

        if (data) return data.id;

        const { data: ins } = await supabase
          .from("teams")
          .insert({ session_id: sessionId, name })
          .select()
          .single();

        return ins!.id as number;
      }

      const teamAId = await ensureTeam("Team 1");
      const teamBId = await ensureTeam("Team 2");

      // team_players neu schreiben
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

  // ✅ Ergebnis löschen: results + teams (damit keine Punkte zählen & alles wieder wie neu)
  async function deleteResult() {
    try {
      setSaving(true);
      setErr(null);
      setMsg(null);

      await supabase.from("results").delete().eq("session_id", sessionId);
      await supabase.from("teams").delete().eq("session_id", sessionId);

      setGoalsA("");
      setGoalsB("");
      setHasResult(false);

      const reset: Record<number, "A" | "B" | null> = {};
      presentIds.forEach((pid) => (reset[pid] = null));
      setManualTeams(reset);

      setMsg("Ergebnis gelöscht. Du kannst es jetzt neu eintragen.");
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
      <button onClick={() => router.push("/sessions")} className="text-xs text-slate-500 hover:text-slate-700">
        ← Zurück zu Trainings
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">
            Training {new Date(session!.date).toLocaleDateString("de-DE")}
          </h1>
          {session?.notes && <div className="text-[11px] text-slate-500">{session.notes}</div>}
        </div>

        <button
          onClick={() => resultRef.current?.scrollIntoView({ behavior: "smooth" })}
          className="rounded-lg border px-3 py-1.5 text-xs shadow-sm bg-white"
        >
          Zum Ergebnis ↓
        </button>
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
              <span>{p.name}</span>
              <span className={`px-2 py-0.5 rounded-md text-[11px] ${badgeColor(p.preferred_position)}`}>
                {positionLabel(p.preferred_position)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Manuelle Bearbeitung: Nicht zugewiesen */}
      <div className="rounded-xl border bg-white p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-semibold">Manuell bearbeiten</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const next: Record<number, "A" | "B" | null> = {};
                present.forEach((p) => (next[p.id] = "A"));
                setManualTeams(next);
                setMsg("Alle anwesenden Spieler in Team 1 gesetzt.");
              }}
              className="rounded-lg border px-2 py-1 text-[11px] bg-white hover:bg-slate-50"
              type="button"
            >
              Alle → Team 1
            </button>
            <button
              onClick={() => {
                const next: Record<number, "A" | "B" | null> = {};
                present.forEach((p) => (next[p.id] = "B"));
                setManualTeams(next);
                setMsg("Alle anwesenden Spieler in Team 2 gesetzt.");
              }}
              className="rounded-lg border px-2 py-1 text-[11px] bg-white hover:bg-slate-50"
              type="button"
            >
              Alle → Team 2
            </button>
          </div>
        </div>

        {unassigned.length === 0 ? (
          <div className="text-[11px] text-slate-500">Alle anwesenden Spieler sind einem Team zugewiesen.</div>
        ) : (
          <ul className="space-y-1">
            {unassigned
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium text-slate-900">{p.name}</div>
                    <div className="text-[10px] text-slate-500">
                      {p.age_group ?? "?"} · {positionLabel(p.preferred_position)}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setTeam(p.id, "A")}
                      className="rounded-md border px-2 py-1 text-[11px] bg-white hover:bg-slate-100"
                      type="button"
                    >
                      Team 1
                    </button>
                    <button
                      onClick={() => setTeam(p.id, "B")}
                      className="rounded-md border px-2 py-1 text-[11px] bg-white hover:bg-slate-100"
                      type="button"
                    >
                      Team 2
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </div>

      {/* Teams */}
      <div className="rounded-xl border bg-white p-3 space-y-3">
        <div className="flex justify-between items-center">
          <div className="text-xs font-semibold">Teams</div>
          <button
            onClick={generateTeams}
            className="text-xs border px-2 py-1 rounded-lg bg-slate-50 hover:bg-slate-100"
          >
            Teams generieren
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Team 1 */}
          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold text-slate-900">Team 1</div>
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-600">
                {summaryA.keepers > 0 && <span className="rounded-full bg-slate-100 px-2 py-0.5">TW: {summaryA.keepers}</span>}
                {summaryA.backs > 0 && <span className="rounded-full bg-slate-100 px-2 py-0.5">Hinten: {summaryA.backs}</span>}
                {summaryA.fronts > 0 && <span className="rounded-full bg-slate-100 px-2 py-0.5">Vorne: {summaryA.fronts}</span>}
                {summaryA.ah > 0 && <span className="rounded-full bg-zinc-50 px-2 py-0.5 text-zinc-800">AH: {summaryA.ah}</span>}
                {summaryA.u32 > 0 && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-800">Ü32: {summaryA.u32}</span>}
              </div>
            </div>

            {teamASorted.length === 0 ? (
              <div className="text-[11px] text-slate-400">Noch kein Spieler zugewiesen.</div>
            ) : (
              <ul className="space-y-1 text-xs">
                {teamASorted.map((p) => (
                  <li
                    key={p.id}
                    onClick={() => setTeam(p.id, null)}
                    className="flex cursor-pointer items-center justify-between rounded-md border border-slate-200 bg-white px-2 py-1"
                    title="Tippen = aus Team entfernen"
                  >
                    <span className="text-[13px] font-medium text-slate-900">{p.name}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeColor(p.preferred_position)}`}>
                        {positionLabel(p.preferred_position)}
                      </span>
                      {p.age_group && (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                          {p.age_group}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Team 2 */}
          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold text-slate-900">Team 2</div>
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-600">
                {summaryB.keepers > 0 && <span className="rounded-full bg-slate-100 px-2 py-0.5">TW: {summaryB.keepers}</span>}
                {summaryB.backs > 0 && <span className="rounded-full bg-slate-100 px-2 py-0.5">Hinten: {summaryB.backs}</span>}
                {summaryB.fronts > 0 && <span className="rounded-full bg-slate-100 px-2 py-0.5">Vorne: {summaryB.fronts}</span>}
                {summaryB.ah > 0 && <span className="rounded-full bg-zinc-50 px-2 py-0.5 text-zinc-800">AH: {summaryB.ah}</span>}
                {summaryB.u32 > 0 && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-800">Ü32: {summaryB.u32}</span>}
              </div>
            </div>

            {teamBSorted.length === 0 ? (
              <div className="text-[11px] text-slate-400">Noch kein Spieler zugewiesen.</div>
            ) : (
              <ul className="space-y-1 text-xs">
                {teamBSorted.map((p) => (
                  <li
                    key={p.id}
                    onClick={() => setTeam(p.id, null)}
                    className="flex cursor-pointer items-center justify-between rounded-md border border-slate-200 bg-white px-2 py-1"
                    title="Tippen = aus Team entfernen"
                  >
                    <span className="text-[13px] font-medium text-slate-900">{p.name}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeColor(p.preferred_position)}`}>
                        {positionLabel(p.preferred_position)}
                      </span>
                      {p.age_group && (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                          {p.age_group}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="text-[11px] text-slate-500">
          Tipp: Spieler antippen = aus dem Team raus. Nicht zugewiesene Spieler oben per Button in Team 1/2 schieben.
        </div>
      </div>

      {/* Ergebnis */}
      <div ref={resultRef} className="rounded-xl border bg-white p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold">Ergebnis</div>
          {hasResult && (
            <button
              disabled={saving}
              onClick={deleteResult}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700 shadow-sm hover:bg-red-100"
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

        {msg && <div className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded-md">{msg}</div>}
        {err && <div className="text-xs text-red-700 bg-red-50 p-2 rounded-md">{err}</div>}
      </div>
    </div>
  );
}
