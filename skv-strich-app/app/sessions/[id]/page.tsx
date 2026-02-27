"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

type Player = {
  id: number;
  name: string;
  age_group: "AH" | "Ü32" | null;
  preferred_position: "defense" | "attack" | "goalkeeper" | null;
  strength: number | null; // bleibt in DB, wird NICHT angezeigt
  is_active: boolean | null;
};

type SessionRow = {
  id: number;
  date: string; // YYYY-MM-DD
  notes: string | null;
};

type TeamSide = "A" | "B";
type TeamMap = Record<number, TeamSide | null>;

function positionLabel(pos: Player["preferred_position"]) {
  if (pos === "defense") return "Hinten";
  if (pos === "attack") return "Vorne";
  if (pos === "goalkeeper") return "Torwart";
  return "Unbekannt";
}

function badgeColor(pos: Player["preferred_position"]) {
  if (pos === "defense") return "bg-sky-100 text-sky-800";
  if (pos === "attack") return "bg-orange-100 text-orange-800";
  if (pos === "goalkeeper") return "bg-purple-100 text-purple-800";
  return "bg-slate-100 text-slate-700";
}

function ageBadgeColor(age: Player["age_group"]) {
  if (age === "Ü32") return "bg-amber-100 text-amber-800";
  if (age === "AH") return "bg-emerald-100 text-emerald-800";
  return "bg-slate-100 text-slate-700";
}

// Balance-Helfer: AH eher -1, Ü32 eher +1 (nur fürs Balancing)
const ageScore = (a: Player["age_group"]) => (a === "Ü32" ? 1 : a === "AH" ? -1 : 0);
// Position: vorne +1, hinten -1 (Torwart 0)
const posScore = (p: Player["preferred_position"]) =>
  p === "attack" ? 1 : p === "defense" ? -1 : 0;

// Strength intern (default 3, falls leer)
const strengthScore = (s: number | null) => {
  if (typeof s !== "number" || Number.isNaN(s)) return 3;
  return Math.max(1, Math.min(5, s));
};

function shuffle<T>(arr: T[]) {
  const c = [...arr];
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c;
}

function sumStrength(team: Player[]) {
  return team.reduce((s, p) => s + strengthScore(p.strength), 0);
}
function sumAge(team: Player[]) {
  return team.reduce((s, p) => s + ageScore(p.age_group), 0);
}
function sumPos(team: Player[]) {
  return team.reduce((s, p) => s + posScore(p.preferred_position), 0);
}

/**
 * Sortierung für Anzeige:
 * 1) Torwart
 * 2) Hinten
 * 3) Vorne
 * 4) Unbekannt
 * innerhalb alphabetisch
 */
function positionRank(pos: Player["preferred_position"]) {
  if (pos === "goalkeeper") return 0;
  if (pos === "defense") return 1;
  if (pos === "attack") return 2;
  return 3;
}
function sortForTeamView(a: Player, b: Player) {
  const ra = positionRank(a.preferred_position);
  const rb = positionRank(b.preferred_position);
  if (ra !== rb) return ra - rb;
  return a.name.localeCompare(b.name, "de");
}

export default function SessionDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const sessionId = Number(params.id);

  const resultRef = useRef<HTMLDivElement | null>(null);

  const [session, setSession] = useState<SessionRow | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [presentIds, setPresentIds] = useState<number[]>([]);
  const [manualTeams, setManualTeams] = useState<TeamMap>({});

  const [goalsA, setGoalsA] = useState("");
  const [goalsB, setGoalsB] = useState("");
  const [hasResult, setHasResult] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // ---------- Load ----------
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setErr(null);
        setMsg(null);

        // Session
        const { data: sData, error: sErr } = await supabase
          .from("sessions")
          .select("id, date, notes")
          .eq("id", sessionId)
          .single();
        if (sErr) throw sErr;

        // Players (active)
        const { data: pData, error: pErr } = await supabase
          .from("players")
          .select("id, name, is_active, age_group, preferred_position, strength")
          .order("name");
        if (pErr) throw pErr;

        const active = (pData ?? []).filter((p) => p.is_active !== false) as Player[];

        // Presence
        const { data: spData, error: spErr } = await supabase
          .from("session_players")
          .select("player_id")
          .eq("session_id", sessionId);
        if (spErr) throw spErr;

        const present = (spData ?? []).map((r) => r.player_id as number);

        // Result
        const { data: rData } = await supabase
          .from("results")
          .select("id, team_a_id, team_b_id, goals_team_a, goals_team_b")
          .eq("session_id", sessionId)
          .maybeSingle();

        let teamAssignment: TeamMap = {};
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
        } else {
          setHasResult(false);
          setGoalsA("");
          setGoalsB("");
        }

        setSession(sData as SessionRow);
        setPlayers(active);
        setPresentIds(present);
        setManualTeams(teamAssignment);
      } catch (e: any) {
        setErr(e?.message ?? "Fehler beim Laden.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [sessionId]);

  const presentPlayers = useMemo(
    () => players.filter((p) => presentIds.includes(p.id)),
    [players, presentIds]
  );

  // ✅ Teams jetzt sortiert für die Anzeige
  const teamA = useMemo(
    () => presentPlayers.filter((p) => manualTeams[p.id] === "A").slice().sort(sortForTeamView),
    [presentPlayers, manualTeams]
  );
  const teamB = useMemo(
    () => presentPlayers.filter((p) => manualTeams[p.id] === "B").slice().sort(sortForTeamView),
    [presentPlayers, manualTeams]
  );
  const unassigned = useMemo(
    () => presentPlayers.filter((p) => !manualTeams[p.id]).slice().sort(sortForTeamView),
    [presentPlayers, manualTeams]
  );

  // ---------- Presence toggle (sperren wenn Ergebnis existiert) ----------
  async function togglePresence(id: number) {
    if (hasResult) {
      setErr("Anwesenheit ist gesperrt, weil bereits ein Ergebnis gespeichert ist. Lösche das Ergebnis, um wieder zu entsperren.");
      return;
    }
    setErr(null);
    setMsg(null);

    const isPresent = presentIds.includes(id);

    if (isPresent) {
      await supabase
        .from("session_players")
        .delete()
        .eq("session_id", sessionId)
        .eq("player_id", id);

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

  // ---------- Generator (Größe hart, Stärke intern priorisiert - NICHT anzeigen) ----------
  function generateTeams() {
    if (hasResult) {
      setErr("Teams sind gesperrt, weil bereits ein Ergebnis gespeichert ist. Lösche das Ergebnis, um Teams zu ändern.");
      return;
    }
    setErr(null);
    setMsg(null);

    const present = presentPlayers;
    if (present.length < 2) {
      setErr("Mindestens 2 Spieler nötig.");
      return;
    }

    const targetA = Math.ceil(present.length / 2);
    const targetB = Math.floor(present.length / 2);

    const keepers = present.filter((p) => p.preferred_position === "goalkeeper");
    const field = present.filter((p) => p.preferred_position !== "goalkeeper");

    function evaluate(A: Player[], B: Player[]) {
      const sDiff = Math.abs(sumStrength(A) - sumStrength(B)); // intern wichtig
      const aDiff = Math.abs(sumAge(A) - sumAge(B));
      const pDiff = Math.abs(sumPos(A) - sumPos(B));
      return sDiff * 6 + aDiff * 3 + pDiff * 2;
    }

    let bestA: Player[] = [];
    let bestB: Player[] = [];
    let bestScore = Infinity;

    for (let k = 0; k < 400; k++) {
      const A: Player[] = [];
      const B: Player[] = [];

      // Torwarte fair verteilen (aber Teamgrößen beachten)
      const shuffledKeepers = shuffle(keepers);
      for (const gk of shuffledKeepers) {
        if (A.length < targetA && (A.length <= B.length || B.length >= targetB)) A.push(gk);
        else if (B.length < targetB) B.push(gk);
        else if (A.length < targetA) A.push(gk);
      }

      const shuffledField = shuffle(field);

      for (const p of shuffledField) {
        if (A.length >= targetA) {
          if (B.length < targetB) B.push(p);
          continue;
        }
        if (B.length >= targetB) {
          if (A.length < targetA) A.push(p);
          continue;
        }

        const scoreIfA = evaluate([...A, p], B);
        const scoreIfB = evaluate(A, [...B, p]);

        if (scoreIfA < scoreIfB) A.push(p);
        else if (scoreIfB < scoreIfA) B.push(p);
        else (A.length <= B.length ? A : B).push(p);
      }

      if (!(A.length === targetA && B.length === targetB)) continue;

      const score = evaluate(A, B);
      if (score < bestScore) {
        bestScore = score;
        bestA = A;
        bestB = B;
      }
    }

    if (bestA.length === 0 && bestB.length === 0) {
      setErr("Konnte keine gültige Aufteilung finden (unerwartet).");
      return;
    }

    const next: TeamMap = {};
    present.forEach((p) => (next[p.id] = null));
    for (const p of bestA) next[p.id] = "A";
    for (const p of bestB) next[p.id] = "B";

    setManualTeams(next);
    setMsg("Teams automatisch verteilt (Stärke intern priorisiert). Du kannst manuell nachjustieren.");
  }

  // ---------- Manual assignment ----------
  function setSide(pid: number, side: TeamSide | null) {
    if (hasResult) {
      setErr("Teams sind gesperrt, weil bereits ein Ergebnis gespeichert ist. Lösche das Ergebnis, um Teams zu ändern.");
      return;
    }
    setErr(null);
    setManualTeams((m) => ({ ...m, [pid]: side }));
  }

  // ---------- Save result ----------
  async function saveResult() {
    // Optionaler extra Schutz (kannst du drin lassen)
    const ok = window.confirm("Ergebnis speichern? Danach sind Aufstellungen & Anwesenheit gesperrt.");
    if (!ok) return;

    try {
      setSaving(true);
      setErr(null);
      setMsg(null);

      const Araw = presentPlayers.filter((p) => manualTeams[p.id] === "A");
      const Braw = presentPlayers.filter((p) => manualTeams[p.id] === "B");

      if (Araw.length === 0 || Braw.length === 0) throw new Error("Beide Teams brauchen mindestens einen Spieler.");
      if (Math.abs(Araw.length - Braw.length) > 1) throw new Error("Teams dürfen höchstens 1 Spieler Unterschied haben.");

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

        if (data?.id) return data.id as number;

        const { data: ins, error } = await supabase
          .from("teams")
          .insert({ session_id: sessionId, name })
          .select()
          .single();
        if (error) throw error;

        return ins!.id as number;
      }

      const teamAId = await ensureTeam("Team 1");
      const teamBId = await ensureTeam("Team 2");

      await supabase.from("team_players").delete().in("team_id", [teamAId, teamBId]);

      await supabase.from("team_players").insert([
        ...Araw.map((p) => ({ team_id: teamAId, player_id: p.id })),
        ...Braw.map((p) => ({ team_id: teamBId, player_id: p.id })),
      ]);

      const payload = {
        session_id: sessionId,
        team_a_id: teamAId,
        team_b_id: teamBId,
        goals_team_a: goalsA === "" ? null : Number(goalsA),
        goals_team_b: goalsB === "" ? null : Number(goalsB),
      };

      if (existing?.id) {
        const { error } = await supabase.from("results").update(payload).eq("session_id", sessionId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("results").insert(payload);
        if (error) throw error;
      }

      setHasResult(true);
      setMsg("Ergebnis gespeichert. Aufstellungen & Anwesenheit sind ab jetzt gesperrt.");
    } catch (e: any) {
      setErr(e?.message ?? "Fehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  }

  // ---------- Delete result (unlock) ----------
  async function deleteResult() {
    const ok = window.confirm(
      "Ergebnis wirklich löschen?\nDanach sind Aufstellungen & Anwesenheit wieder bearbeitbar."
    );
    if (!ok) return;

    try {
      setSaving(true);
      setErr(null);
      setMsg(null);

      const { error } = await supabase.from("results").delete().eq("session_id", sessionId);
      if (error) throw error;

      setHasResult(false);
      setGoalsA("");
      setGoalsB("");

      setMsg("Ergebnis gelöscht. Aufstellungen & Anwesenheit sind wieder bearbeitbar.");
    } catch (e: any) {
      setErr(e?.message ?? "Fehler beim Löschen des Ergebnisses.");
    } finally {
      setSaving(false);
    }
  }

  function teamMeta(team: Player[]) {
    const gk = team.filter((p) => p.preferred_position === "goalkeeper").length;
    const def = team.filter((p) => p.preferred_position === "defense").length;
    const att = team.filter((p) => p.preferred_position === "attack").length;
    const ah = team.filter((p) => p.age_group === "AH").length;
    const u32 = team.filter((p) => p.age_group === "Ü32").length;
    return { gk, def, att, ah, u32 };
  }

  const metaA = teamMeta(teamA);
  const metaB = teamMeta(teamB);

  if (loading) return <div className="p-4 text-sm text-slate-500">Lade…</div>;
  if (err && !session) return <div className="p-4 text-sm text-red-700 bg-red-50">{err}</div>;

  return (
    <div className="space-y-4">
      <button onClick={() => router.push("/sessions")} className="text-xs text-slate-500 hover:text-slate-700">
        ← Zurück zu Trainings
      </button>

      <div className="flex items-start justify-between gap-3">
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

      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {err}
        </div>
      )}
      {msg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
          {msg}
        </div>
      )}

      {/* Anwesenheit */}
      <div className="rounded-xl border p-3 bg-white space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold">Anwesenheit</div>
          {hasResult && <div className="text-[11px] text-slate-500">Gesperrt (Ergebnis gespeichert)</div>}
        </div>

        <div className="grid gap-2">
          {players.map((p) => {
            const on = presentIds.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => togglePresence(p.id)}
                className={`w-full flex items-center justify-between rounded-lg border px-3 py-1.5 text-sm ${
                  on ? "bg-emerald-50" : "bg-white"
                } ${hasResult ? "opacity-60 cursor-not-allowed" : ""}`}
                disabled={hasResult}
              >
                <span className="truncate">{p.name}</span>
                <span className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-md text-[11px] ${ageBadgeColor(p.age_group)}`}>
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
      </div>

      {/* Teams */}
      <div className="rounded-xl border bg-white p-3 space-y-3">
        <div className="flex justify-between items-center">
          <div className="text-xs font-semibold">Teams</div>
          <button
            onClick={generateTeams}
            disabled={hasResult}
            className={`text-xs border px-2 py-1 rounded-lg ${hasResult ? "opacity-60 cursor-not-allowed" : ""}`}
            title={hasResult ? "Gesperrt: Ergebnis gespeichert" : "Teams automatisch verteilen"}
          >
            Teams generieren
          </button>
        </div>

        {hasResult && (
          <div className="text-[11px] text-slate-500">
            Teams sind gesperrt, weil ein Ergebnis gespeichert ist. Lösche das Ergebnis, um Teams zu ändern.
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {/* Team 1 */}
          <div className="space-y-2 rounded-lg border p-2">
            <div className="text-xs font-semibold">Team 1 ({teamA.length})</div>
            <div className="text-[11px] text-slate-500">
              GK {metaA.gk} · Hinten {metaA.def} · Vorne {metaA.att} · AH {metaA.ah} · Ü32 {metaA.u32}
            </div>

            {teamA.length === 0 ? (
              <div className="text-[11px] text-slate-400">Noch kein Spieler zugewiesen.</div>
            ) : (
              <div className="space-y-1">
                {teamA.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSide(p.id, null)}
                    disabled={hasResult}
                    className={`w-full text-left rounded-md px-2 py-1 text-xs border bg-white hover:bg-slate-50 flex items-center justify-between ${
                      hasResult ? "opacity-60 cursor-not-allowed hover:bg-white" : ""
                    }`}
                    title={hasResult ? "Gesperrt: Ergebnis gespeichert" : "Klick: aus Team entfernen"}
                  >
                    <span className="truncate">{p.name}</span>
                    <span className="flex items-center gap-1">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] ${ageBadgeColor(p.age_group)}`}>
                        {p.age_group ?? "?"}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] ${badgeColor(p.preferred_position)}`}>
                        {positionLabel(p.preferred_position)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Team 2 */}
          <div className="space-y-2 rounded-lg border p-2">
            <div className="text-xs font-semibold">Team 2 ({teamB.length})</div>
            <div className="text-[11px] text-slate-500">
              GK {metaB.gk} · Hinten {metaB.def} · Vorne {metaB.att} · AH {metaB.ah} · Ü32 {metaB.u32}
            </div>

            {teamB.length === 0 ? (
              <div className="text-[11px] text-slate-400">Noch kein Spieler zugewiesen.</div>
            ) : (
              <div className="space-y-1">
                {teamB.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSide(p.id, null)}
                    disabled={hasResult}
                    className={`w-full text-left rounded-md px-2 py-1 text-xs border bg-white hover:bg-slate-50 flex items-center justify-between ${
                      hasResult ? "opacity-60 cursor-not-allowed hover:bg-white" : ""
                    }`}
                    title={hasResult ? "Gesperrt: Ergebnis gespeichert" : "Klick: aus Team entfernen"}
                  >
                    <span className="truncate">{p.name}</span>
                    <span className="flex items-center gap-1">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] ${ageBadgeColor(p.age_group)}`}>
                        {p.age_group ?? "?"}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] ${badgeColor(p.preferred_position)}`}>
                        {positionLabel(p.preferred_position)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Nicht zugewiesen */}
        <div className="rounded-lg border p-2">
          <div className="text-xs font-semibold mb-2">Nicht zugewiesen ({unassigned.length})</div>

          {unassigned.length === 0 ? (
            <div className="text-[11px] text-slate-400">Alle Spieler sind einem Team zugeordnet.</div>
          ) : (
            <div className="space-y-1">
              {unassigned.map((p) => (
                <div
                  key={p.id}
                  className="w-full rounded-md px-2 py-1 text-xs border bg-white flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{p.name}</div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1">
                      <span className={`px-2 py-0.5 rounded-md ${ageBadgeColor(p.age_group)}`}>{p.age_group ?? "?"}</span>
                      <span className={`px-2 py-0.5 rounded-md ${badgeColor(p.preferred_position)}`}>
                        {positionLabel(p.preferred_position)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      disabled={hasResult}
                      className={`rounded-md border px-2 py-1 text-[11px] hover:bg-slate-50 ${
                        hasResult ? "opacity-60 cursor-not-allowed hover:bg-white" : ""
                      }`}
                      onClick={() => setSide(p.id, "A")}
                      title={hasResult ? "Gesperrt: Ergebnis gespeichert" : "Zu Team 1"}
                    >
                      → Team 1
                    </button>
                    <button
                      disabled={hasResult}
                      className={`rounded-md border px-2 py-1 text-[11px] hover:bg-slate-50 ${
                        hasResult ? "opacity-60 cursor-not-allowed hover:bg-white" : ""
                      }`}
                      onClick={() => setSide(p.id, "B")}
                      title={hasResult ? "Gesperrt: Ergebnis gespeichert" : "Zu Team 2"}
                    >
                      → Team 2
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-[11px] text-slate-500">
          Hinweis: Anzeige ist nach Torwart / Hinten / Vorne sortiert (danach alphabetisch).
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
              className="rounded-lg border px-3 py-1.5 text-xs shadow-sm bg-red-50"
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

        <div className="text-[11px] text-slate-500">
          Hinweis: Nach dem Speichern sind Aufstellungen & Anwesenheit gesperrt. Wenn ein Spieler fehlt, lösche das Ergebnis,
          passe Aufstellungen an und trage das Ergebnis erneut ein.
        </div>
      </div>
    </div>
  );
}
