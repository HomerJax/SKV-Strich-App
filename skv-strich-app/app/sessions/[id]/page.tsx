"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

type Player = {
  id: number;
  name: string;
  age_group: string | null; // "AH" | "Ü32"
  preferred_position: string | null; // "defense" | "attack" | "goalkeeper"
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

function posBadgeColor(pos: string | null) {
  if (pos === "defense") return "bg-sky-100 text-sky-800";
  if (pos === "attack") return "bg-orange-100 text-orange-800";
  if (pos === "goalkeeper") return "bg-purple-100 text-purple-800";
  return "bg-slate-100 text-slate-700";
}

function ageBadgeColor(age: string | null) {
  if (age === "Ü32") return "bg-amber-100 text-amber-800";
  if (age === "AH") return "bg-emerald-100 text-emerald-800";
  return "bg-slate-100 text-slate-700";
}

// Balance-Helfer
const ageScore = (a: string | null) => (a === "Ü32" ? 1 : a === "AH" ? -1 : 0);
const posScore = (p: string | null) => (p === "attack" ? 1 : p === "defense" ? -1 : 0);

function sortForDisplay(list: Player[]) {
  const prio = (p: Player) => {
    if (p.preferred_position === "goalkeeper") return 0;
    if (p.preferred_position === "defense") return 1;
    if (p.preferred_position === "attack") return 2;
    return 3;
  };
  return [...list].sort((a, b) => prio(a) - prio(b) || a.name.localeCompare(b.name, "de"));
}

function stats(list: Player[]) {
  const out = {
    total: list.length,
    gk: list.filter((p) => p.preferred_position === "goalkeeper").length,
    def: list.filter((p) => p.preferred_position === "defense").length,
    att: list.filter((p) => p.preferred_position === "attack").length,
    ah: list.filter((p) => p.age_group === "AH").length,
    u32: list.filter((p) => p.age_group === "Ü32").length,
  };
  return out;
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

  const present = useMemo(() => players.filter((p) => presentIds.includes(p.id)), [players, presentIds]);

  const unassigned = useMemo(
    () => sortForDisplay(present.filter((p) => manualTeams[p.id] == null)),
    [present, manualTeams]
  );
  const teamA = useMemo(() => sortForDisplay(present.filter((p) => manualTeams[p.id] === "A")), [present, manualTeams]);
  const teamB = useMemo(() => sortForDisplay(present.filter((p) => manualTeams[p.id] === "B")), [present, manualTeams]);

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

  // ---------- Zuweisung ----------
  function setTeam(pid: number, t: "A" | "B" | null) {
    setManualTeams((m) => ({ ...m, [pid]: t }));
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
        Math.abs(A.reduce((s, p) => s + ageScore(p.age_group), 0) - B.reduce((s, p) => s + ageScore(p.age_group), 0)) * 3;

      const pd =
        Math.abs(A.reduce((s, p) => s + posScore(p.preferred_position), 0) - B.reduce((s, p) => s + posScore(p.preferred_position), 0)) * 2;

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
    setMsg("Teams automatisch verteilt. Du kannst Spieler jetzt manuell umschieben.");
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

      const { data: existing } = await supabase.from("results").select("id").eq("session_id", sessionId).maybeSingle();

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

      if (existing) await supabase.from("results").update(payload).eq("session_id", sessionId);
      else await supabase.from("results").insert(payload);

      setHasResult(true);
      setMsg("Ergebnis gespeichert.");
    } catch (e: any) {
      setErr(e.message ?? "Fehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-4 text-sm text-slate-500">Lade…</div>;
  if (err) return <div className="p-4 text-sm text-red-700 bg-red-50">{err}</div>;

  const sA = stats(teamA);
  const sB = stats(teamB);

  return (
    <div className="space-y-4">
      {/* Zurück */}
      <button onClick={() => router.push("/sessions")} className="text-xs text-slate-500 hover:text-slate-700">
        ← Zurück zu Trainings
      </button>

      {/* Kopf */}
      <div className="flex items-center justify-between gap-3">
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
        <div className="text-xs font-semibold">Anwesenheit</div>
        {players.map((p) => {
          const on = presentIds.includes(p.id);
          return (
            <button
              key={p.id}
              onClick={() => togglePresence(p.id)}
              className={`w-full flex items-center justify-between rounded-lg border px-3 py-1.5 text-sm ${
                on ? "bg-emerald-50 border-emerald-200" : "bg-white"
              }`}
            >
              <span className="font-medium text-slate-900">{p.name}</span>
              <span className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-md text-[11px] ${ageBadgeColor(p.age_group)}`}>
                  {p.age_group ?? "?"}
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[11px] ${posBadgeColor(p.preferred_position)}`}>
                  {positionLabel(p.preferred_position)}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Teams */}
      <div className="rounded-xl border bg-white p-3 space-y-3">
        <div className="flex justify-between items-center gap-2">
          <div className="text-xs font-semibold">Teams</div>
          <button onClick={generateTeams} className="text-xs border px-2 py-1 rounded-lg">
            Teams generieren
          </button>
        </div>

        {/* Unzugeordnet */}
        <div className="rounded-lg border p-2">
          <div className="text-xs font-semibold mb-2">Unzugeordnet ({unassigned.length})</div>
          {unassigned.length === 0 ? (
            <div className="text-[11px] text-slate-400">Alle anwesenden Spieler sind in Teams.</div>
          ) : (
            <div className="space-y-2">
              {unassigned.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-md border px-2 py-1">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{p.name}</div>
                    <div className="flex gap-2 mt-0.5">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] ${ageBadgeColor(p.age_group)}`}>
                        {p.age_group ?? "?"}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[11px] ${posBadgeColor(p.preferred_position)}`}>
                        {positionLabel(p.preferred_position)}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setTeam(p.id, "A")}
                      className="rounded-md border px-2 py-1 text-xs bg-slate-50 hover:bg-slate-100"
                    >
                      → Team 1
                    </button>
                    <button
                      onClick={() => setTeam(p.id, "B")}
                      className="rounded-md border px-2 py-1 text-xs bg-slate-50 hover:bg-slate-100"
                    >
                      → Team 2
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Team-Karten */}
        <div className="grid grid-cols-2 gap-3">
          {/* Team 1 */}
          <div className="space-y-2 rounded-lg border p-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs font-semibold">Team 1 ({teamA.length})</div>
                <div className="text-[11px] text-slate-500">
                  GK {sA.gk} · Hinten {sA.def} · Vorne {sA.att} · AH {sA.ah} · Ü32 {sA.u32}
                </div>
              </div>
            </div>

            {teamA.length === 0 ? (
              <div className="text-[11px] text-slate-400">Noch kein Spieler in Team 1.</div>
            ) : (
              <div className="space-y-1">
                {teamA.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setTeam(p.id, null)} // rauswerfen -> unzugeordnet
                    className="w-full text-left rounded-md border px-2 py-1 text-sm hover:bg-slate-50"
                    title="Klick = aus Team entfernen"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{p.name}</span>
                      <span className="flex items-center gap-1">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] ${ageBadgeColor(p.age_group)}`}>
                          {p.age_group ?? "?"}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[11px] ${posBadgeColor(p.preferred_position)}`}>
                          {positionLabel(p.preferred_position)}
                        </span>
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Team 2 */}
          <div className="space-y-2 rounded-lg border p-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs font-semibold">Team 2 ({teamB.length})</div>
                <div className="text-[11px] text-slate-500">
                  GK {sB.gk} · Hinten {sB.def} · Vorne {sB.att} · AH {sB.ah} · Ü32 {sB.u32}
                </div>
              </div>
            </div>

            {teamB.length === 0 ? (
              <div className="text-[11px] text-slate-400">Noch kein Spieler in Team 2.</div>
            ) : (
              <div className="space-y-1">
                {teamB.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setTeam(p.id, null)} // rauswerfen -> unzugeordnet
                    className="w-full text-left rounded-md border px-2 py-1 text-sm hover:bg-slate-50"
                    title="Klick = aus Team entfernen"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{p.name}</span>
                      <span className="flex items-center gap-1">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] ${ageBadgeColor(p.age_group)}`}>
                          {p.age_group ?? "?"}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[11px] ${posBadgeColor(p.preferred_position)}`}>
                          {positionLabel(p.preferred_position)}
                        </span>
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {msg && <div className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded-md">{msg}</div>}
        {err && <div className="text-xs text-red-700 bg-red-50 p-2 rounded-md">{err}</div>}
      </div>

      {/* Ergebnis */}
      <div ref={resultRef} className="rounded-xl border bg-white p-3 space-y-3">
        <div className="text-xs font-semibold">Ergebnis</div>

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

        {hasResult && <div className="text-[11px] text-slate-500">Hinweis: Ergebnis überschreibt die gespeicherten Teams.</div>}
      </div>
    </div>
  );
}
