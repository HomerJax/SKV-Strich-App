"use client";

import { useEffect, useMemo, useState } from "react";

type TeamPlayer = {
  id: number;
  name: string;
  strength: number | null;
  preferredPosition: string | null;
};

type Team = {
  id: number;
  name: string;
  players: TeamPlayer[];
};

type Match = {
  id?: number;
  game_no: number;
  team_a_id: number;
  team_b_id: number;
  goals_team_a: number | null;
  goals_team_b: number | null;
};

type Standing = {
  teamId: number;
  teamName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

type Config = {
  session_mode: string | null;
  tournament_team_count: number | null;
  tournament_match_minutes: number | null;
  tournament_winner_team_id: number | null;
  tournament_completed_at: string | null;
};

type TournamentPayload = {
  ok?: boolean;
  message?: string;
  error?: string;
  config: Config;
  teams: Team[];
  matches: Match[];
  standings: Standing[];
};

type Props = {
  sessionId: number;
  enabled: boolean;
  isAdmin: boolean;
  presentCount: number;
  hasNormalResult: boolean;
  onActivated?: () => void;
};

function formatClock(seconds: number) {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `{String(minutes).padStart(2, "0")}:{String(rest).padStart(2, "0")}`;
}

function ScoreEditor({
  match,
  teamName,
  busy,
  disabled,
  onSave,
}: {
  match: Match;
  teamName: (teamId: number) => string;
  busy: boolean;
  disabled: boolean;
  onSave: (gameNo: number, goalsA: number, goalsB: number) => Promise<void>;
}) {
  const [a, setA] = useState(match.goals_team_a == null ? "" : String(match.goals_team_a));
  const [b, setB] = useState(match.goals_team_b == null ? "" : String(match.goals_team_b));

  useEffect(() => {
    setA(match.goals_team_a == null ? "" : String(match.goals_team_a));
    setB(match.goals_team_b == null ? "" : String(match.goals_team_b));
  }, [match.goals_team_a, match.goals_team_b]);

  const complete = match.goals_team_a != null && match.goals_team_b != null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            Spiel {match.game_no}
          </div>
          <div className="mt-1 text-sm font-black text-slate-950">
            {teamName(match.team_a_id)} <span className="text-slate-400">vs.</span> {teamName(match.team_b_id)}
          </div>
        </div>
        {complete ? (
          <div className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">
            {match.goals_team_a}:{match.goals_team_b}
          </div>
        ) : (
          <div className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
            offen
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
        <input
          inputMode="numeric"
          value={a}
          disabled={disabled}
          onChange={(event) => setA(event.target.value.replace(/\D/g, "").slice(0, 2))}
          className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-lg font-black text-slate-950"
          aria-label={`Tore {teamName(match.team_a_id)}`}
        />
        <span className="font-black text-slate-400">:</span>
        <input
          inputMode="numeric"
          value={b}
          disabled={disabled}
          onChange={(event) => setB(event.target.value.replace(/\D/g, "").slice(0, 2))}
          className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-lg font-black text-slate-950"
          aria-label={`Tore {teamName(match.team_b_id)}`}
        />
        <button
          type="button"
          disabled={disabled || busy || a === "" || b === ""}
          onClick={() => void onSave(match.game_no, Number(a), Number(b))}
          className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white disabled:opacity-40"
        >
          Speichern
        </button>
      </div>
    </div>
  );
}

export default function SessionTournamentCard({
  sessionId,
  enabled,
  isAdmin,
  presentCount,
  hasNormalResult,
  onActivated,
}: Props) {
  const [playersPerTeam, setPlayersPerTeam] = useState(5);
  const [setupOpen, setSetupOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [matchMinutes, setMatchMinutes] = useState(8);
  const [totalMinutes, setTotalMinutes] = useState(90);
  const [warmupMinutes, setWarmupMinutes] = useState(10);
  const [changeMinutes, setChangeMinutes] = useState(1);
  const [data, setData] = useState<TournamentPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeGameNo, setActiveGameNo] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(8 * 60);
  const [timerRunning, setTimerRunning] = useState(false);

  async function load() {
    const response = await fetch(`/api/sessions/${sessionId}/tournament`, {
      cache: "no-store",
      credentials: "same-origin",
    });
    const payload = (await response.json()) as TournamentPayload;
    if (!response.ok) throw new Error(payload.error || "Turnier konnte nicht geladen werden.");
    setData(payload);
    const minutes = payload.config?.tournament_match_minutes ?? 8;
    setMatchMinutes(minutes);
    setRemainingSeconds(minutes * 60);
  }

  useEffect(() => {
    if (!enabled) return;
    void load().catch((err) => setError(err instanceof Error ? err.message : "Turnier konnte nicht geladen werden."));
  }, [enabled, sessionId]);

  useEffect(() => {
    if (!timerRunning) return;
    const handle = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(handle);
          setTimerRunning(false);
          if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            navigator.vibrate?.([300, 150, 300]);
          }
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(handle);
  }, [timerRunning]);

  const teamNameById = useMemo(
    () => new Map((data?.teams ?? []).map((team) => [team.id, team.name])),
    [data?.teams],
  );

  function teamName(teamId: number) {
    return teamNameById.get(teamId) ?? `Team ${teamId}`;
  }

  async function action(payload: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/sessions/${sessionId}/tournament`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      const next = (await response.json()) as TournamentPayload;
      if (!response.ok) throw new Error(next.error || "Aktion fehlgeschlagen.");
      setData(next);
      setMessage(next.message ?? null);
      return next;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aktion fehlgeschlagen.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  const teamCount = Math.max(2, Math.min(6, Math.round(presentCount / Math.max(2, playersPerTeam))));
  const minTeamSize = Math.floor(presentCount / teamCount);
  const maxTeamSize = Math.ceil(presentCount / teamCount);
  const gamesPerRound = (teamCount * (teamCount - 1)) / 2;
  const usableMinutes = Math.max(0, totalMinutes - warmupMinutes);
  const maxGames = Math.max(0, Math.floor((usableMinutes + changeMinutes) / (matchMinutes + changeMinutes)));
  const suggestedRounds = Math.max(1, Math.min(12, Math.floor(maxGames / gamesPerRound)));
  const plannedGames = gamesPerRound * suggestedRounds;
  const plannedMinutes = warmupMinutes + plannedGames * matchMinutes + Math.max(0, plannedGames - 1) * changeMinutes;

  async function setup() {
    const next = await action({ intent: "setup", teamCount, matchMinutes, rounds: suggestedRounds });
    if (next) onActivated?.();
  }

  async function saveMatch(gameNo: number, goalsA: number, goalsB: number) {
    await action({ intent: "save_match", gameNo, goalsA, goalsB });
  }

  function startTimer(gameNo: number) {
    const minutes = data?.config?.tournament_match_minutes ?? matchMinutes;
    setActiveGameNo(gameNo);
    setRemainingSeconds(minutes * 60);
    setTimerRunning(true);
  }

  if (!enabled) {
    if (!isAdmin || hasNormalResult) return null;

    return (
      <section className="rounded-[20px] border border-slate-200 bg-white p-3 shadow-sm">
        <button
          type="button"
          aria-expanded={setupOpen}
          onClick={() => setSetupOpen((current) => !current)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <div>
            <div className="text-sm font-black text-slate-950">🏆 Turniermodus</div>
            <div className="mt-0.5 text-xs font-semibold text-slate-500">
              Optional für diese Trainingseinheit
            </div>
          </div>
          <div className={`rounded-full px-3 py-1.5 text-xs font-black {setupOpen ? "bg-cyan-100 text-cyan-800" : "bg-slate-100 text-slate-600"}`}>
            {setupOpen ? "An" : "Aus"}
          </div>
        </button>

        {setupOpen ? (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Teilnehmer</div>
              <div className="mt-1 text-xl font-black text-slate-950">{presentCount} Zusagen / anwesend</div>
              <div className="mt-1 text-xs font-semibold text-slate-500">strikr nutzt eure Zusagen und die bestätigte Anwesenheit für die Planung.</div>
            </div>

            <label className="mt-4 block text-xs font-bold text-slate-600">
              Wie lange habt ihr insgesamt Zeit?
              <div className="mt-1 flex items-center rounded-xl border border-slate-200 bg-white">
                <input type="number" min={15} max={240} value={totalMinutes} onChange={(e) => setTotalMinutes(Number(e.target.value))} className="min-w-0 flex-1 rounded-xl px-3 py-2.5 text-base font-black text-slate-950 outline-none" />
                <span className="pr-3 text-xs font-bold text-slate-400">Min.</span>
              </div>
            </label>

            <div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50/70 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-700">strikr empfiehlt</div>
              <div className="mt-1 text-lg font-black text-slate-950">{teamCount} Teams · je {minTeamSize === maxTeamSize ? minTeamSize : `${minTeamSize}–${maxTeamSize}`} Spieler</div>
              <div className="mt-1 text-xs font-semibold text-slate-600">{plannedGames} Spiele · {matchMinutes} Min. pro Spiel · {suggestedRounds}× gegeneinander</div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-white p-2"><div className="text-base font-black text-slate-950">{warmupMinutes}</div><div className="text-[10px] font-bold text-slate-400">Min. Warm-up</div></div>
                <div className="rounded-xl bg-white p-2"><div className="text-base font-black text-slate-950">{changeMinutes}</div><div className="text-[10px] font-bold text-slate-400">Min. Pause</div></div>
                <div className="rounded-xl bg-white p-2"><div className="text-base font-black text-slate-950">{Math.max(0, totalMinutes - plannedMinutes)}</div><div className="text-[10px] font-bold text-slate-400">Min. Puffer</div></div>
              </div>
            </div>

            <button type="button" onClick={() => setSettingsOpen((current) => !current)} className="mt-3 flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-xs font-black text-slate-700">
              <span>{settingsOpen ? "Einstellungen schließen" : "Empfehlung anpassen"}</span><span>{settingsOpen ? "−" : "+"}</span>
            </button>

            {settingsOpen ? (
              <div className="mt-3 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3">
                <label className="text-xs font-bold text-slate-600">Spieler pro Team<select value={playersPerTeam} onChange={(e) => setPlayersPerTeam(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-950">{[3,4,5,6,7,8].map((count) => <option key={count} value={count}>{count}</option>)}</select></label>
                <label className="text-xs font-bold text-slate-600">Spielzeit<input type="number" min={1} max={60} value={matchMinutes} onChange={(e) => setMatchMinutes(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-950" /></label>
                <label className="text-xs font-bold text-slate-600">Warm-up<input type="number" min={0} max={60} value={warmupMinutes} onChange={(e) => setWarmupMinutes(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-950" /></label>
                <label className="text-xs font-bold text-slate-600">Pause zwischen Spielen<input type="number" min={0} max={10} value={changeMinutes} onChange={(e) => setChangeMinutes(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-950" /></label>
              </div>
            ) : null}

            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-black text-slate-950">So sieht dein Turnier aus</div>
              <div className="mt-2 space-y-1.5 text-xs font-semibold text-slate-600">
                <div>👥 <span className="font-black text-slate-950">{presentCount} Spieler</span> → {teamCount} ausgeglichene Teams à {minTeamSize === maxTeamSize ? minTeamSize : `${minTeamSize}–${maxTeamSize}`} Spieler</div>
                <div>🕒 <span className="font-black text-slate-950">{totalMinutes} Min.</span> Gesamtzeit</div>
                <div>⚽ <span className="font-black text-slate-950">{plannedGames} Spiele</span> · jedes Team {suggestedRounds}× gegen jedes andere</div>
                <div>⏱ <span className="font-black text-slate-950">{matchMinutes} Min.</span> pro Spiel · steuerbar über die Spieluhr</div>
                <div>🔄 <span className="font-black text-slate-950">{changeMinutes} {changeMinutes === 1 ? "Min." : "Min."}</span> Pause für Feldwechsel + Ergebnis</div>
                <div>📋 Spielplan wird automatisch von strikr erstellt</div>
              </div>
              <div className="mt-3 grid gap-2">
                <div className="rounded-xl bg-white p-3"><div className="text-xs font-black text-slate-950">⏱ Spieluhr für jedes Spiel</div><div className="mt-0.5 text-[11px] font-semibold text-slate-500">Direkt am jeweiligen Match starten, pausieren und zurücksetzen.</div></div>
                <div className="rounded-xl bg-white p-3"><div className="text-xs font-black text-slate-950">📊 Live-Tabelle</div><div className="mt-0.5 text-[11px] font-semibold text-slate-500">Jedes Ergebnis aktualisiert Punkte, Tore und Platzierung automatisch.</div></div>
              </div>
              <p className="mt-3 text-[11px] font-semibold leading-5 text-slate-500">Wertung: 3 Punkte Sieg · 1 Punkt Remis · Tordifferenz → erzielte Tore.</p>
            </div>

        {error ? <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{error}</div> : null}

        <button
          type="button"
          disabled={busy || presentCount < teamCount * 2}
          onClick={() => void setup()}
          className="mt-4 w-full rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-black text-white shadow-sm disabled:opacity-40"
        >
          {busy ? "Turnier wird vorbereitet …" : "Turniermodus starten"}
        </button>
          </div>
        ) : null}
      </section>
    );
  }

  const config = data?.config;
  const completed = Boolean(config?.tournament_completed_at);
  const matches = data?.matches ?? [];
  const completedMatches = matches.filter((match) => match.goals_team_a != null && match.goals_team_b != null).length;
  const nextOpenMatch = matches.find((match) => match.goals_team_a == null || match.goals_team_b == null) ?? null;

  return (
    <section className="space-y-4">
      <div className="rounded-[24px] border border-cyan-200 bg-gradient-to-br from-cyan-50 to-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">Turniermodus</div>
            <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">
              {data?.teams.length ?? config?.tournament_team_count ?? 0} Teams · {config?.tournament_match_minutes ?? matchMinutes} Minuten
            </h2>
            <div className="mt-1 text-xs font-semibold text-slate-500">
              {completedMatches}/{matches.length} Spiele abgeschlossen
            </div>
          </div>
          {completed ? (
            <div className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-black text-white">✓ beendet</div>
          ) : null}
        </div>

        {message ? <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800">{message}</div> : null}
        {error ? <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{error}</div> : null}

        {!completed && isAdmin ? (
          <button
            type="button"
            disabled={busy || completedMatches > 0}
            onClick={() => void action({
              intent: "regenerate",
              teamCount: config?.tournament_team_count ?? teamCount,
              matchMinutes: config?.tournament_match_minutes ?? matchMinutes,
              rounds: Math.max(1, Math.round(matches.length / Math.max(1, ((data?.teams.length ?? teamCount) * ((data?.teams.length ?? teamCount) - 1)) / 2))),
            })}
            className="mt-3 rounded-xl border border-cyan-200 bg-white px-3 py-2 text-xs font-black text-cyan-800 disabled:opacity-40"
          >
            Teams neu auslosen
          </button>
        ) : null}
      </div>

      {(data?.teams ?? []).length ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {data!.teams.map((team) => (
            <div key={team.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-sm font-black text-slate-950">{team.name}</div>
                <div className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">{team.players.length}</div>
              </div>
              <div className="mt-2 space-y-1">
                {team.players.map((player) => (
                  <div key={player.id} className="text-xs font-semibold text-slate-600">{player.name}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {!completed && nextOpenMatch ? (
        <div className="rounded-[24px] bg-slate-950 p-4 text-white shadow-sm">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">Nächstes Spiel</div>
          <div className="mt-1 text-lg font-black">
            {teamName(nextOpenMatch.team_a_id)} vs. {teamName(nextOpenMatch.team_b_id)}
          </div>
          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="font-mono text-4xl font-black tracking-tight">{formatClock(remainingSeconds)}</div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (activeGameNo !== nextOpenMatch.game_no) startTimer(nextOpenMatch.game_no);
                  else setTimerRunning((current) => !current);
                }}
                className="rounded-xl bg-cyan-500 px-4 py-2 text-xs font-black text-slate-950"
              >
                {timerRunning && activeGameNo === nextOpenMatch.game_no ? "Pause" : "Start"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveGameNo(nextOpenMatch.game_no);
                  setTimerRunning(false);
                  setRemainingSeconds((config?.tournament_match_minutes ?? matchMinutes) * 60);
                }}
                className="rounded-xl bg-white/10 px-3 py-2 text-xs font-black text-white"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        {matches.map((match) => (
          <ScoreEditor
            key={match.game_no}
            match={match}
            teamName={teamName}
            busy={busy}
            disabled={!isAdmin || completed}
            onSave={saveMatch}
          />
        ))}
      </div>

      {(data?.standings ?? []).length ? (
        <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="text-base font-black text-slate-950">Live-Tabelle</div>
            <div className="text-xs font-semibold text-slate-500">3 Punkte Sieg · 1 Punkt Remis</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-sm">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Team</th>
                  <th className="px-2 py-2 text-center">Sp</th>
                  <th className="px-2 py-2 text-center">S</th>
                  <th className="px-2 py-2 text-center">U</th>
                  <th className="px-2 py-2 text-center">N</th>
                  <th className="px-2 py-2 text-center">Tore</th>
                  <th className="px-3 py-2 text-right">Pkt</th>
                </tr>
              </thead>
              <tbody>
                {data!.standings.map((row, index) => (
                  <tr key={row.teamId} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-black text-slate-400">{index + 1}</td>
                    <td className="px-3 py-2 font-black text-slate-950">{row.teamName}</td>
                    <td className="px-2 py-2 text-center">{row.played}</td>
                    <td className="px-2 py-2 text-center">{row.wins}</td>
                    <td className="px-2 py-2 text-center">{row.draws}</td>
                    <td className="px-2 py-2 text-center">{row.losses}</td>
                    <td className="px-2 py-2 text-center">{row.goalsFor}:{row.goalsAgainst}</td>
                    <td className="px-3 py-2 text-right text-base font-black">{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {!completed && isAdmin && matches.length > 0 && completedMatches === matches.length ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void action({ intent: "finalize" })}
          className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-sm disabled:opacity-40"
        >
          Turnier abschließen · 1 Session-Sieg werten
        </button>
      ) : null}

      {completed ? (
        <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Gesamtsieger</div>
          <div className="mt-1 text-xl font-black text-emerald-950">
            {data?.standings[0]?.teamName ?? "Turniersieger"}
          </div>
          <div className="mt-1 text-sm font-semibold text-emerald-800">
            Für jeden Spieler dieses Teams zählt genau ein Sieg in der normalen strikr-Statistik.
          </div>
        </div>
      ) : null}
    </section>
  );
}
