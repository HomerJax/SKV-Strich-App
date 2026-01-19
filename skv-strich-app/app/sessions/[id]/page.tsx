"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

type Player = {
  id: number;
  name: string;
  age_group: "AH" | "Ü32" | null;
  preferred_position: "defense" | "attack" | "goalkeeper" | null;
  is_active: boolean | null;
  strength: number | null; // 1-5 (Admin)
};

type SessionRow = {
  id: number;
  date: string;
  notes: string | null;
  season_id?: number | null;
};

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

function ageBadgeColor(a: Player["age_group"]) {
  if (a === "Ü32") return "bg-amber-100 text-amber-800";
  if (a === "AH") return "bg-emerald-100 text-emerald-800";
  return "bg-slate-100 text-slate-700";
}

function strengthBadgeColor(s: number | null) {
  // neutral; Farbe brauchst du nicht zwingend
  return "bg-slate-100 text-slate-800";
}

function safeStrength(s: number | null) {
  // falls bei manchen Spielern (noch) nicht gesetzt: Default 3
  if (typeof s === "number" && s >= 1 && s <= 5) return s;
  return 3;
}

// Balance-Helfer
const ageScore = (a: Player["age_group"]) => (a === "Ü32" ? 1 : a === "AH" ? -1 : 0);
const posScore = (p: Player["preferred_position"]) => (p === "attack" ? 1 : p === "defense" ? -1 : 0);

function sumStrength(list: Player[]) {
  return list.reduce((s, p) => s + safeStrength(p.strength), 0);
}

function countBy(list: Player[], predicate: (p: Player) => boolean) {
  return list.reduce((n, p) => (predicate(p) ? n + 1 : n), 0);
}

function sortTeam(list: Player[]) {
  // Sortierung: Torwart -> Hinten -> Vorne, dann Stärke desc, dann Name
  const posRank = (p: Player) =>
    p.preferred_position === "goalkeeper" ? 0 : p.preferred_position === "defense" ? 1 : 2;
  return [...list].sort((a, b) => {
    const pr = posRank(a) - posRank(b);
    if (pr !== 0) return pr;
    const sd = safeStrength(b.strength) - safeStrength(a.strength);
    if (sd !== 0) return sd;
    return a.name.localeCompare(b.name);
  });
}

export default function SessionDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const sessionId = Number(params.id);

  const resultRef = useRef<HTMLDivElement | null>(null);

  const [session, setSession] = useState<SessionRow | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [presentIds, setPresentIds] = useState<number[]>([]);

  // null = nicht zugeordnet (im "Pool")
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

        // Session
        const { data: sData, error: sErr } = await supabase
          .from("sessions")
          .select("id, date, notes, season_id")
          .eq("id", sessionId)
          .single();
        if (sErr) throw sErr;

        // Spieler
        const { data: pData, error: pErr } = await supabase
          .from("players")
          .select("id, name, is_active, age_group, preferred_position, strength")
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

        // Ergebnis + ggf. Teamzuordnung aus DB
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

  const present = useMemo(() => players.filter((p) => presentIds.includes(p.id)), [players, presentIds]);
  const teamAraw = useMemo(() => present.filter((p) => manualTeams[p.id] === "A"), [present, manualTeams]);
  const teamBraw = useMemo(() => present.filter((p) => manualTeams[p.id] === "B"), [present, manualTeams]);
  const pool = useMemo(() => present.filter((p) => manualTeams[p.id] === null), [present, manualTeams]);

  const teamA = useMemo(() => sortTeam(teamAraw), [teamAraw]);
  const teamB = useMemo(() => sortTeam(teamBraw), [teamBraw]);

  // ---------- Anwesenheit ----------
  async function togglePresence(id: number) {
    setErr(null);
    setMsg(null);
    const isPresent = presentIds.includes(id);

    // Optional: nach Ergebnis sperren (du wolltest das)
    if (hasResult) {
      setErr("Anwesenheit ist gesperrt, weil bereits ein Ergebnis gespeichert wurde. Lösche erst das Ergebnis, wenn du ändern willst.");
      return;
    }

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

  // ---------- Teamgenerator (Stärke priorisiert) ----------
  function generateTeams() {
    setMsg(null);
    setErr(null);

    if (present.length < 2) {
      setErr("Mindestens 2 Spieler nötig.");
      return;
    }

    const keepers = present.filter((p) => p.preferred_position === "goalkeeper");
    const field = present.filter((p) => p.preferred_position !== "goalkeeper");

    // Startzuweisung: Keeper alternierend
    const baseA: Player[] = [];
    const baseB: Player[] = [];
    keepers.forEach((k, i) => (i % 2 === 0 ? baseA.push(k) : baseB.push(k)));

    // Shuffle
    function shuffle<T>(x: T[]) {
      const c = [...x];
      for (let i = c.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [c[i], c[j]] = [c[j], c[i]];
      }
      return c;
    }

    // Bewertung: Stärke dominiert
    function evaluate(A: Player[], B: Player[]) {
      const strengthDiff = Math.abs(sumStrength(A) - sumStrength(B)) * 6; // <<< HIER Priorität
      const ageDiff =
        Math.abs(A.reduce((s, p) => s + ageScore(p.age_group), 0) - B.reduce((s, p) => s + ageScore(p.age_group), 0)) * 2;
      const posDiff =
        Math.abs(A.reduce((s, p) => s + posScore(p.preferred_position), 0) - B.reduce((s, p) => s + posScore(p.preferred_position), 0)) * 2;
      const sizeDiff = Math.abs(A.length - B.length) * 2;

      // "starke" Spieler (>=4) möglichst gleich verteilen
      const strongA = countBy(A, (p) => safeStrength(p.strength) >= 4 && p.preferred_position !== "goalkeeper");
      const strongB = countBy(B, (p) => safeStrength(p.strength) >= 4 && p.preferred_position !== "goalkeeper");
      const strongDiff = Math.abs(strongA - strongB) * 10;

      return strengthDiff + strongDiff + ageDiff + posDiff + sizeDiff;
    }

    // Greedy-Start: stärkste zuerst verteilen (damit nicht zufällig 5er clustern)
    const sortedByStrength = [...field].sort((a, b) => safeStrength(b.strength) - safeStrength(a.strength));

    let bestA: Player[] = [];
    let bestB: Player[] = [];
    let best = Infinity;

    // Mehr Iterationen erhöhen Qualität
    for (let k = 0; k < 1200; k++) {
      const A: Player[] = [...baseA];
      const B: Player[] = [...baseB];

      // Varianz: manchmal strength-sortiert, manchmal gemischt
      const list = k % 2 === 0 ? sortedByStrength : shuffle(sortedByStrength);

      for (const p of list) {
        // Zuerst Team mit niedrigerer Stärke-Summe auffüllen, dann Größe
        const sA = sumStrength(A);
        const sB = sumStrength(B);

        if (sA === sB) {
          (A.length <= B.length ? A : B).push(p);
        } else {
          (sA < sB ? A : B).push(p);
        }
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

    // Debug-Info (nur als Hinweis)
    const info = `Teams automatisch verteilt (Stärke priorisiert). Team1 Stärke ${sumStrength(bestA)} vs Team2 Stärke ${sumStrength(bestB)}.`;
    setMsg(info);
  }

  // ---------- Manuelle Teamzuweisung ----------
  function setTeam(pid: number, team: "A" | "B" | null) {
    setManualTeams((m) => ({ ...m, [pid]: team }));
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
      if (A.length + B.length !== present.length) {
        throw new Error("Es sind noch Spieler im Pool (nicht zugeordnet). Bitte alle Spieler Team 1 oder Team 2 zuweisen.");
      }

      const { data: existing } = await supabase.from("results").select("id").eq("session_id", sessionId).maybeSingle();

      async function ensureTeam(name: string) {
        const { data } = await supabase
          .from("teams")
          .select("id")
          .eq("session_id", sessionId)
          .eq("name", name)
          .maybeSingle();

        if (data) return data.id as number;

        const { data: ins, error } = await supabase.from("teams").insert({ session_id: sessionId, name }).select().single();
        if (error) throw error;
        return ins!.id as number;
      }

      const teamAId = await ensureTeam("Team 1");
      const teamBId = await ensureTeam("Team 2");

      // team_players neu schreiben
      await supabase.from("team_players").delete().in("team_id", [teamAId, teamBId]);

      const insertRows = [
        ...A.map((p) => ({ team_id: teamAId, player_id: p.id })),
        ...B.map((p) => ({ team_id: teamBId, player_id: p.id })),
      ];

      const { error: tpErr } = await supabase.from("team_players").insert(insertRows);
      if (tpErr) throw tpErr;

      const payload: any = {
        session_id: sessionId,
        team_a_id: teamAId,
        team_b_id: teamBId,
        goals_team_a: goalsA === "" ? null : Number(goalsA),
        goals_team_b: goalsB === "" ? null : Number(goalsB),
      };

      if (existing) {
        const { error: uErr } = await supabase.from("results").update(payload).eq("session_id", sessionId);
        if (uErr) throw uErr;
      } else {
        const { error: iErr } = await supabase.from("results").insert(payload);
        if (iErr) throw iErr;
      }

      setHasResult(true);
      setMsg("Ergebnis gespeichert. Anwesenheit ist jetzt gesperrt (bis Ergebnis gelöscht wird).");
    } catch (e: any) {
      setErr(e.message ?? "Fehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  }

  // ---------- Ergebnis löschen (wichtig fürs Korrigieren) ----------
  async function deleteResult() {
    try {
      setSaving(true);
      setErr(null);
      setMsg(null);

      // Ergebnis löschen
      const { data: rData } = await supabase
        .from("results")
        .select("id, team_a_id, team_b_id")
        .eq("session_id", sessionId)
        .maybeSingle();

      if (!rData?.id) {
        setMsg("Kein Ergebnis vorhanden.");
        return;
      }

      // Teamzuordnung optional auch löschen, damit sauber neu zuweisen möglich ist
      const teamIds = [rData.team_a_id, rData.team_b_id].filter(Boolean) as number[];
      if (teamIds.length) {
        await supabase.from("team_players").delete().in("team_id", teamIds);
        await supabase.from("teams").delete().in("id", teamIds);
      }

      await supabase.from("results").delete().eq("id", rData.id);

      // UI reset
      setGoalsA("");
      setGoalsB("");
      setHasResult(false);

      // alle wieder in Pool
      const reset: Record<number, "A" | "B" | null> = {};
      present.forEach((p) => (reset[p.id] = null));
      setManualTeams(reset);

      setMsg("Ergebnis gelöscht. Du kannst Anwesenheit & Teams wieder ändern.");
    } catch (e: any) {
      setErr(e.message ?? "Fehler beim Löschen.");
    } finally {
      setSaving(false);
    }
  }

  // ---------- Team-Stats (sichtbar) ----------
  function teamStats(list: Player[]) {
    const gk = countBy(list, (p) => p.preferred_position === "goalkeeper");
    const def = countBy(list, (p) => p.preferred_position === "defense");
    const att = countBy(list, (p) => p.preferred_position === "attack");
    const ah = countBy(list, (p) => p.age_group === "AH");
    const u32 = countBy(list, (p) => p.age_group === "Ü32");
    const strength = sumStrength(list);
    const strong = countBy(list, (p) => safeStrength(p.strength) >= 4 && p.preferred_position !== "goalkeeper");
    return { gk, def, att, ah, u32, strength, strong };
  }

  const statsA = teamStats(teamA);
  const statsB = teamStats(teamB);

  if (loading) return <div className="p-4 text-sm text-slate-500">Lade…</div>;

  if (err) return <div className="p-4 text-sm text-red-700 bg-red-50">{err}</div>;

  return (
    <div className="space-y-4">
      {/* Zurück */}
      <button onClick={() => router.push("/sessions")} className="text-xs text-slate-500 hover:text-slate-700">
        ← Zurück zu Trainings
      </button>

      {/* Kopf */}
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
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold">Anwesend</div>
          {hasResult && (
            <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md">
              gesperrt (Ergebnis gespeichert)
            </div>
          )}
        </div>

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
              <span className="truncate">{p.name}</span>
              <span className="flex items-center gap-1">
                <span className={`px-2 py-0.5 rounded-md text-[11px] ${ageBadgeColor(p.age_group)}`}>
                  {p.age_group ?? "?"}
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[11px] ${badgeColor(p.preferred_position)}`}>
                  {positionLabel(p.preferred_position)}
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[11px] ${strengthBadgeColor(p.strength)}`}>
                  S{safeStrength(p.strength)}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Teams */}
      <div className="rounded-xl border bg-white p-3 space-y-3">
        <div className="flex justify-between items-center">
          <div className="text-xs font-semibold">Teams</div>
          <div className="flex gap-2">
            <button onClick={generateTeams} className="text-xs border px-2 py-1 rounded-lg">
              Teams generieren
            </button>
          </div>
        </div>

        {/* Pool (nicht zugeordnet) */}
        <div className="rounded-lg border p-2 bg-slate-50">
          <div className="text-[11px] font-semibold text-slate-700 mb-2">
            Pool (nicht zugeordnet): {pool.length}
          </div>
          {pool.length === 0 ? (
            <div className="text-[11px] text-slate-400">Alle Spieler sind einem Team zugewiesen.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {sortTeam(pool).map((p) => (
                <div key={p.id} className="flex items-center gap-2 rounded-lg border bg-white px-2 py-1 text-xs">
                  <span className="font-medium">{p.name}</span>
                  <span className={`px-1.5 py-0.5 rounded ${ageBadgeColor(p.age_group)}`}>{p.age_group ?? "?"}</span>
                  <span className={`px-1.5 py-0.5 rounded ${badgeColor(p.preferred_position)}`}>
                    {positionLabel(p.preferred_position)}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-100">S{safeStrength(p.strength)}</span>

                  <button
                    className="ml-2 rounded-md border px-2 py-0.5"
                    onClick={() => setTeam(p.id, "A")}
                    title="zu Team 1"
                  >
                    → T1
                  </button>
                  <button
                    className="rounded-md border px-2 py-0.5"
                    onClick={() => setTeam(p.id, "B")}
                    title="zu Team 2"
                  >
                    → T2
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Team 1 */}
          <div className="space-y-2 rounded-lg border p-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs font-semibold">Team 1 ({teamA.length})</div>
                <div className="text-[11px] text-slate-600">
                  GK {statsA.gk} · Hinten {statsA.def} · Vorne {statsA.att} · AH {statsA.ah} · Ü32 {statsA.u32} · Stärke{" "}
                  <b>{statsA.strength}</b> · Ø{" "}
                  <b>{teamA.length ? (statsA.strength / teamA.length).toFixed(2) : "0.00"}</b> · Starke(≥4){" "}
                  <b>{statsA.strong}</b>
                </div>
              </div>
            </div>

            {teamA.length === 0 ? (
              <div className="text-[11px] text-slate-400">Noch kein Spieler zugewiesen.</div>
            ) : (
              <div className="space-y-1">
                {teamA.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setTeam(p.id, null)}
                    className="w-full flex items-center justify-between rounded-md border px-2 py-1 text-xs hover:bg-slate-50"
                    title="Klicken = zurück in Pool"
                  >
                    <span className="truncate font-medium">{p.name}</span>
                    <span className="flex items-center gap-1">
                      <span className={`px-1.5 py-0.5 rounded ${ageBadgeColor(p.age_group)}`}>{p.age_group ?? "?"}</span>
                      <span className={`px-1.5 py-0.5 rounded ${badgeColor(p.preferred_position)}`}>
                        {positionLabel(p.preferred_position)}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-100">S{safeStrength(p.strength)}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Team 2 */}
          <div className="space-y-2 rounded-lg border p-2">
            <div>
              <div className="text-xs font-semibold">Team 2 ({teamB.length})</div>
              <div className="text-[11px] text-slate-600">
                GK {statsB.gk} · Hinten {statsB.def} · Vorne {statsB.att} · AH {statsB.ah} · Ü32 {statsB.u32} · Stärke{" "}
                <b>{statsB.strength}</b> · Ø{" "}
                <b>{teamB.length ? (statsB.strength / teamB.length).toFixed(2) : "0.00"}</b> · Starke(≥4){" "}
                <b>{statsB.strong}</b>
              </div>
            </div>

            {teamB.length === 0 ? (
              <div className="text-[11px] text-slate-400">Noch kein Spieler zugewiesen.</div>
            ) : (
              <div className="space-y-1">
                {teamB.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setTeam(p.id, null)}
                    className="w-full flex items-center justify-between rounded-md border px-2 py-1 text-xs hover:bg-slate-50"
                    title="Klicken = zurück in Pool"
                  >
                    <span className="truncate font-medium">{p.name}</span>
                    <span className="flex items-center gap-1">
                      <span className={`px-1.5 py-0.5 rounded ${ageBadgeColor(p.age_group)}`}>{p.age_group ?? "?"}</span>
                      <span className={`px-1.5 py-0.5 rounded ${badgeColor(p.preferred_position)}`}>
                        {positionLabel(p.preferred_position)}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-100">S{safeStrength(p.strength)}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {msg && (
          <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 p-2 rounded-md">{msg}</div>
        )}
        {err && (
          <div className="text-xs text-red-700 bg-red-50 border border-red-200 p-2 rounded-md">{err}</div>
        )}
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
              title="Löscht Ergebnis + Teams (damit keiner Punkte bekommt)"
            >
              {saving ? "…" : "Ergebnis löschen"}
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

        {msg && (
          <div className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded-md">{msg}</div>
        )}
        {err && (
          <div className="text-xs text-red-700 bg-red-50 p-2 rounded-md">{err}</div>
        )}
      </div>
    </div>
  );
}
