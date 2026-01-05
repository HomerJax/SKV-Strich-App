"use client";

import { useEffect, useState } from "react";
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

function ageBadge(age: string | null) {
  if (age === "AH") return "bg-emerald-100 text-emerald-800";
  if (age === "Ü32") return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-600";
}

function posBadge(pos: string | null) {
  if (pos === "defense") return "bg-sky-100 text-sky-800";
  if (pos === "attack") return "bg-orange-100 text-orange-800";
  if (pos === "goalkeeper") return "bg-purple-100 text-purple-800";
  return "bg-slate-100 text-slate-600";
}

// Für Balance im Generator
function getAgeValue(ageGroup: string | null) {
  if (ageGroup === "Ü32") return 1;
  if (ageGroup === "AH") return -1;
  return 0;
}

function getPositionScore(pos: string | null) {
  if (pos === "defense") return -1;
  if (pos === "attack") return 1;
  // Torwart egal für Balance
  return 0;
}

export default function SessionDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const sessionId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [savingResult, setSavingResult] = useState(false);

  const [session, setSession] = useState<SessionRow | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [presentIds, setPresentIds] = useState<number[]>([]);
  const [manualTeams, setManualTeams] = useState<Record<number, "A" | "B" | null>>({});
  const [goalsTeam1, setGoalsTeam1] = useState<string>("");
  const [goalsTeam2, setGoalsTeam2] = useState<string>("");
  const [hasResult, setHasResult] = useState(false);

  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setErrorMsg(null);
        setInfoMsg(null);

        // Session
        const { data: sessionData, error: sessionError } = await supabase
          .from("sessions")
          .select("id, date, notes")
          .eq("id", sessionId)
          .single();

        if (sessionError || !sessionData) {
          throw new Error(sessionError?.message ?? "Session nicht gefunden");
        }

        // Spieler (nur aktive)
        const { data: playersData, error: playersError } = await supabase
          .from("players")
          .select("id, name, age_group, preferred_position, is_active")
          .order("name", { ascending: true });

        if (playersError) throw playersError;

        const activePlayers = (playersData ?? []).filter(
          (p) => p.is_active !== false
        ) as Player[];

        // Anwesenheit
        const { data: attendanceData, error: attError } = await supabase
          .from("session_players")
          .select("player_id")
          .eq("session_id", sessionId);

        if (attError) throw attError;

        const present = (attendanceData ?? []).map((a) => a.player_id as number);

        // Eventuelles Ergebnis & Teams laden, um Formular vorzufüllen
        const { data: resultData, error: resultError } = await supabase
          .from("results")
          .select(
            "id, team_a_id, team_b_id, goals_team_a, goals_team_b"
          )
          .eq("session_id", sessionId)
          .maybeSingle();

        if (resultError) throw resultError;

        let initialManual: Record<number, "A" | "B" | null> = {};
        present.forEach((pid) => {
          initialManual[pid] = null;
        });

        if (resultData && (resultData.team_a_id || resultData.team_b_id)) {
          const teamIds = [
            resultData.team_a_id,
            resultData.team_b_id,
          ].filter((x): x is number => !!x);

          if (teamIds.length > 0) {
            const { data: teamPlayersData, error: tpError } = await supabase
              .from("team_players")
              .select("team_id, player_id")
              .in("team_id", teamIds);

            if (tpError) throw tpError;

            for (const tp of teamPlayersData ?? []) {
              const pid = tp.player_id as number;
              if (!present.includes(pid)) continue;

              if (tp.team_id === resultData.team_a_id) {
                initialManual[pid] = "A";
              } else if (tp.team_id === resultData.team_b_id) {
                initialManual[pid] = "B";
              }
            }
          }

          if (resultData.goals_team_a != null) {
            setGoalsTeam1(String(resultData.goals_team_a));
          }
          if (resultData.goals_team_b != null) {
            setGoalsTeam2(String(resultData.goals_team_b));
          }
          setHasResult(true);
        } else {
          setHasResult(false);
        }

        setSession(sessionData as SessionRow);
        setPlayers(activePlayers);
        setPresentIds(present);
        setManualTeams(initialManual);
      } catch (err: any) {
        setErrorMsg(err.message ?? "Fehler beim Laden der Session.");
      } finally {
        setLoading(false);
      }
    }

    if (!Number.isNaN(sessionId)) {
      load();
    } else {
      setErrorMsg("Ungültige Session-ID.");
      setLoading(false);
    }
  }, [sessionId]);

  const presentPlayers = players.filter((p) => presentIds.includes(p.id));
  const team1Players = presentPlayers.filter(
    (p) => manualTeams[p.id] === "A"
  );
  const team2Players = presentPlayers.filter(
    (p) => manualTeams[p.id] === "B"
  );

  async function togglePresence(playerId: number) {
    try {
      setErrorMsg(null);
      setInfoMsg(null);

      const isPresent = presentIds.includes(playerId);

      if (isPresent) {
        const { error } = await supabase
          .from("session_players")
          .delete()
          .eq("session_id", sessionId)
          .eq("player_id", playerId);

        if (error) throw error;

        setPresentIds((prev) => prev.filter((id) => id !== playerId));
        setManualTeams((prev) => {
          const copy = { ...prev };
          delete copy[playerId];
          return copy;
        });
      } else {
        const { error } = await supabase
          .from("session_players")
          .insert({ session_id: sessionId, player_id: playerId });

        if (error) throw error;

        setPresentIds((prev) => [...prev, playerId]);
        setManualTeams((prev) => ({ ...prev, [playerId]: null }));
      }
    } catch (err: any) {
      setErrorMsg(err.message ?? "Fehler beim Aktualisieren der Anwesenheit.");
    }
  }

  // 🔥 Neuer, "fairerer" Generator mit Zufallssuche
  function generateTeams() {
    setErrorMsg(null);
    setInfoMsg(null);

    if (presentPlayers.length < 2) {
      setErrorMsg("Mindestens 2 anwesende Spieler nötig, um Teams zu bilden.");
      return;
    }

    // Torhüter
    const keepers = presentPlayers.filter(
      (p) => p.preferred_position === "goalkeeper"
    );
    const fieldPlayers = presentPlayers.filter(
      (p) => p.preferred_position !== "goalkeeper"
    );

    // Keeper halbwegs fair verteilen
    const baseTeamA: Player[] = [];
    const baseTeamB: Player[] = [];
    keepers.forEach((p, index) => {
      if (index % 2 === 0) baseTeamA.push(p);
      else baseTeamB.push(p);
    });

    function evaluate(teamA: Player[], teamB: Player[]): number {
      const ageA = teamA.reduce((s, p) => s + getAgeValue(p.age_group), 0);
      const ageB = teamB.reduce((s, p) => s + getAgeValue(p.age_group), 0);
      const posA = teamA.reduce(
        (s, p) => s + getPositionScore(p.preferred_position),
        0
      );
      const posB = teamB.reduce(
        (s, p) => s + getPositionScore(p.preferred_position),
        0
      );

      const ageDiff = Math.abs(ageA - ageB);
      const posDiff = Math.abs(posA - posB);
      const sizeDiff = Math.abs(teamA.length - teamB.length);

      // Gewichtung: Alter wichtig, Position auch, Größe etwas weniger
      return ageDiff * 3 + posDiff * 2 + sizeDiff;
    }

    function shuffle<T>(arr: T[]): T[] {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    let bestTeamA: Player[] | null = null;
    let bestTeamB: Player[] | null = null;
    let bestScore = Infinity;

    const iterations = 250; // mehr Iterationen = etwas fairer, aber langsamer

    for (let it = 0; it < iterations; it++) {
      const teamA = [...baseTeamA];
      const teamB = [...baseTeamB];

      const shuffled = shuffle(fieldPlayers);

      for (const p of shuffled) {
        // Teamgrößen halbwegs ausgleichen
        if (teamA.length > teamB.length) {
          teamB.push(p);
        } else if (teamB.length > teamA.length) {
          teamA.push(p);
        } else {
          // gleich viele -> zufällig
          if (Math.random() < 0.5) teamA.push(p);
          else teamB.push(p);
        }
      }

      const score = evaluate(teamA, teamB);
      if (score < bestScore) {
        bestScore = score;
        bestTeamA = teamA;
        bestTeamB = teamB;
      }
    }

    if (!bestTeamA || !bestTeamB) {
      setErrorMsg("Konnte keine sinnvolle Teamaufteilung berechnen.");
      return;
    }

    const nextManual: Record<number, "A" | "B" | null> = {};
    for (const p of presentPlayers) {
      if (bestTeamA.some((t) => t.id === p.id)) nextManual[p.id] = "A";
      else if (bestTeamB.some((t) => t.id === p.id)) nextManual[p.id] = "B";
      else nextManual[p.id] = null;
    }

    setManualTeams(nextManual);
    setInfoMsg(
      "Teams automatisch generiert (mit stärkerem Fokus auf ausgeglichene Altersgruppen & Positionen). Du kannst sie unten noch anpassen."
    );
  }

  async function saveResult() {
    try {
      setSavingResult(true);
      setErrorMsg(null);
      setInfoMsg(null);

      if (presentPlayers.length === 0) {
        throw new Error("Keine anwesenden Spieler – Ergebnis macht so keinen Sinn.");
      }

      const teamAPlayers = presentPlayers.filter(
        (p) => manualTeams[p.id] === "A"
      );
      const teamBPlayers = presentPlayers.filter(
        (p) => manualTeams[p.id] === "B"
      );

      const assignedCount = teamAPlayers.length + teamBPlayers.length;

      if (assignedCount === 0) {
        throw new Error(
          "Kein Spieler einem Team zugeordnet. Alle anwesenden Spieler müssen Team 1 oder Team 2 zugeordnet sein."
        );
      }

      if (assignedCount !== presentPlayers.length) {
        throw new Error(
          "Nicht alle anwesenden Spieler sind einem Team zugeordnet. Du kannst Team 2 leer lassen, aber jeder Spieler muss Team 1 oder Team 2 zugeordnet sein."
        );
      }

      const gA = parseInt(goalsTeam1, 10);
      const gB = parseInt(goalsTeam2, 10);

      if (
        Number.isNaN(gA) ||
        Number.isNaN(gB) ||
        gA < 0 ||
        gB < 0
      ) {
        throw new Error(
          "Bitte gültige Tore (0 oder mehr) für beide Teams eintragen."
        );
      }

      // existierende Teams & Resultat löschen
      const { data: existingTeams, error: teamsLoadError } = await supabase
        .from("teams")
        .select("id")
        .eq("session_id", sessionId);

      if (teamsLoadError) throw teamsLoadError;

      const teamIds = (existingTeams ?? []).map((t) => t.id as number);

      if (teamIds.length > 0) {
        const { error: delResultsError } = await supabase
          .from("results")
          .delete()
          .eq("session_id", sessionId);
        if (delResultsError) throw delResultsError;

        const { error: delTeamPlayersError } = await supabase
          .from("team_players")
          .delete()
          .in("team_id", teamIds);
        if (delTeamPlayersError) throw delTeamPlayersError;

        const { error: delTeamsError } = await supabase
          .from("teams")
          .delete()
          .eq("session_id", sessionId);
        if (delTeamsError) throw delTeamsError;
      }

      // neue Teams anlegen
      const { data: newTeams, error: insTeamsError } = await supabase
        .from("teams")
        .insert([
          { session_id: sessionId, name: "Team 1" },
          { session_id: sessionId, name: "Team 2" },
        ])
        .select();

      if (insTeamsError) throw insTeamsError;

      const team1 = (newTeams ?? []).find((t) => t.name === "Team 1");
      const team2 = (newTeams ?? []).find((t) => t.name === "Team 2");

      if (!team1 || !team2) {
        throw new Error("Fehler beim Anlegen der Teams.");
      }

      const team1Id = team1.id as number;
      const team2Id = team2.id as number;

      // Spieler-Zuordnung speichern
      const rows = [
        ...teamAPlayers.map((p) => ({
          team_id: team1Id,
          player_id: p.id,
        })),
        ...teamBPlayers.map((p) => ({
          team_id: team2Id,
          player_id: p.id,
        })),
      ];

      const { error: tpError } = await supabase
        .from("team_players")
        .insert(rows);

      if (tpError) throw tpError;

      // Ergebnis speichern
      const { error: resError } = await supabase.from("results").insert({
        session_id: sessionId,
        team_a_id: team1Id,
        team_b_id: team2Id,
        goals_team_a: gA,
        goals_team_b: gB,
      });

      if (resError) throw resError;

      setHasResult(true);

      let msg = `Ergebnis gespeichert (${gA}:${gB}). `;
      if (gA > gB) msg += "Sieg Team 1.";
      else if (gB > gA) msg += "Sieg Team 2.";
      else msg += "Unentschieden.";

      setInfoMsg(msg);
    } catch (err: any) {
      setErrorMsg(err.message ?? "Fehler beim Speichern des Ergebnisses.");
    } finally {
      setSavingResult(false);
    }
  }

  if (loading) {
    return <div className="p-4 text-sm text-slate-600">Lade Daten…</div>;
  }

  if (!session) {
    return (
      <div className="p-4 text-sm text-red-600">
        Session nicht gefunden.
      </div>
    );
  }

  const formattedDate = new Date(session.date).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const statusBadgeClass = hasResult
    ? "bg-emerald-100 text-emerald-700"
    : presentIds.length > 0
    ? "bg-amber-100 text-amber-700"
    : "bg-red-100 text-red-700";

  const statusText = hasResult
    ? "Ergebnis gespeichert"
    : presentIds.length > 0
    ? "Nur Anwesenheit"
    : "Noch nichts eingetragen";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Training / Spieltag
            </h1>
            <div className="text-sm text-slate-600">{formattedDate}</div>
            {session.notes && (
              <div className="mt-1 text-xs text-slate-500">
                Notiz: {session.notes}
              </div>
            )}
          </div>

          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass}`}
          >
            {statusText}
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {errorMsg}
        </div>
      )}
      {infoMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {infoMsg}
        </div>
      )}

      {/* 1. Anwesenheit */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-800">
            1. Anwesenheit ({presentIds.length} Spieler)
          </h2>
          <span className="text-[11px] text-slate-500">
            Tipp: einfach antippen, um Spieler als anwesend zu markieren.
          </span>
        </div>

        <div className="space-y-1">
          {players.map((p) => {
            const isHere = presentIds.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => togglePresence(p.id)}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm shadow-sm transition ${
                  isHere
                    ? "border-emerald-300 bg-emerald-50 font-medium"
                    : "border-slate-200 bg-white"
                }`}
              >
                <span>{p.name}</span>
                <span className="text-[11px] text-slate-500">
                  {isHere ? "da" : "fehlt"}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. Teams generieren & Übersicht */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-800">
            2. Teams (Generator &amp; Anpassung)
          </h2>
          <button
            type="button"
            onClick={generateTeams}
            className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-slate-100"
          >
            ⚙️ Teams automatisch generieren
          </button>
        </div>

        {presentPlayers.length === 0 ? (
          <p className="text-xs text-slate-500">
            Bitte zuerst Anwesenheit setzen – dann können Teams gebildet werden.
          </p>
        ) : (
          <>
            {/* aktuelle Team-Übersicht */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-800">
                    Team 1
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {team1Players.length} Spieler
                  </span>
                </div>
                {team1Players.length === 0 ? (
                  <p className="text-[11px] text-slate-500">
                    Noch keine Spieler in Team 1.
                  </p>
                ) : (
                  <ul className="space-y-1 text-xs">
                    {team1Players.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between gap-2 rounded-lg bg-white px-2 py-1 shadow-sm"
                      >
                        <span className="truncate">{p.name}</span>
                        <div className="flex flex-wrap gap-1">
                          <span
                            className={`rounded-full px-2 py-0.5 ${ageBadge(
                              p.age_group
                            )} text-[10px]`}
                          >
                            {p.age_group ?? "?"}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 ${posBadge(
                              p.preferred_position
                            )} text-[10px]`}
                          >
                            {positionLabel(p.preferred_position)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-800">
                    Team 2
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {team2Players.length} Spieler
                  </span>
                </div>
                {team2Players.length === 0 ? (
                  <p className="text-[11px] text-slate-500">
                    Team 2 darf auch leer bleiben, wenn alle Spieler Team 1 gewinnen sollen.
                  </p>
                ) : (
                  <ul className="space-y-1 text-xs">
                    {team2Players.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between gap-2 rounded-lg bg-white px-2 py-1 shadow-sm"
                      >
                        <span className="truncate">{p.name}</span>
                        <div className="flex flex-wrap gap-1">
                          <span
                            className={`rounded-full px-2 py-0.5 ${ageBadge(
                              p.age_group
                            )} text-[10px]`}
                          >
                            {p.age_group ?? "?"}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 ${posBadge(
                              p.preferred_position
                            )} text-[10px]`}
                          >
                            {positionLabel(p.preferred_position)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Detail-Zuordnung */}
            <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
              <p className="mb-2 text-[11px] text-slate-600">
                Feintuning: weise hier jeden anwesenden Spieler Team 1 oder 2 zu.
                Team 2 kann leer bleiben, aber niemand darf „gar kein Team“ haben.
              </p>

              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100">
                      <th className="px-2 py-1 text-left">Spieler</th>
                      <th className="px-2 py-1 text-center">Team 1</th>
                      <th className="px-2 py-1 text-center">Team 2</th>
                    </tr>
                  </thead>
                  <tbody>
                    {presentPlayers.map((p) => {
                      const val = manualTeams[p.id] ?? null;
                      return (
                        <tr key={p.id} className="border-b border-slate-100">
                          <td className="px-2 py-1">{p.name}</td>
                          <td className="px-2 py-1 text-center">
                            <input
                              type="radio"
                              name={`team-${p.id}`}
                              checked={val === "A"}
                              onChange={() =>
                                setManualTeams((prev) => ({
                                  ...prev,
                                  [p.id]: "A",
                                }))
                              }
                            />
                          </td>
                          <td className="px-2 py-1 text-center">
                            <input
                              type="radio"
                              name={`team-${p.id}`}
                              checked={val === "B"}
                              onChange={() =>
                                setManualTeams((prev) => ({
                                  ...prev,
                                  [p.id]: "B",
                                }))
                              }
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>

      {/* 3. Ergebnis mit Toren */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-slate-800">
          3. Ergebnis eintragen
        </h2>

        {presentPlayers.length === 0 ? (
          <p className="text-xs text-slate-500">
            Bitte zuerst Anwesenheit und Teams setzen.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span>Ergebnis:</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600">Team 1</span>
                <input
                  type="number"
                  min={0}
                  value={goalsTeam1}
                  onChange={(e) => setGoalsTeam1(e.target.value)}
                  className="w-14 rounded-md border border-slate-300 px-2 py-1 text-center text-sm"
                />
                <span>:</span>
                <input
                  type="number"
                  min={0}
                  value={goalsTeam2}
                  onChange={(e) => setGoalsTeam2(e.target.value)}
                  className="w-14 rounded-md border border-slate-300 px-2 py-1 text-center text-sm"
                />
                <span className="text-xs text-slate-600">Team 2</span>
              </div>
            </div>

            <button
              type="button"
              onClick={saveResult}
              disabled={savingResult}
              className="mt-1 inline-flex items-center justify-center rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
            >
              {savingResult ? "Speichere..." : "Ergebnis speichern"}
            </button>
          </>
        )}
      </section>

      {/* Zurück-Button */}
      <div>
        <button
          type="button"
          onClick={() => router.push("/sessions")}
          className="text-xs text-slate-500 underline"
        >
          ← Zurück zu allen Terminen
        </button>
      </div>
    </div>
  );
}
