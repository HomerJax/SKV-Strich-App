import Link from "next/link";
import { redirect } from "next/navigation";
import { requireClub } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { getFeatureFlagsForClub } from "@/lib/feature-flags";
import PlayerTrendCard from "@/components/stats/PlayerTrendCard";

type ResultRow = {
  session_id: number;
  team_a_id: number | null;
  team_b_id: number | null;
  goals_team_a: number | null;
  goals_team_b: number | null;
};

type TeamPlayerRow = {
  team_id: number;
};

type SessionPlayerRow = {
  session_id: number;
};

type SessionRow = {
  id: number;
  date: string;
};

type RecentResult = {
  sessionId: number;
  date: string | null;
  outcome: "win" | "loss" | "draw";
  scoreLabel: string;
  myTeamLabel: "Team 1" | "Team 2";
};

function formatGermanDate(date: string | null) {
  if (!date) return "Unbekanntes Datum";
  return new Date(date).toLocaleDateString("de-DE");
}

function outcomeLabel(outcome: RecentResult["outcome"]) {
  if (outcome === "win") return "Sieg";
  if (outcome === "loss") return "Niederlage";
  return "Unentschieden";
}

function outcomeClasses(outcome: RecentResult["outcome"]) {
  if (outcome === "win") return "bg-emerald-100 text-emerald-800";
  if (outcome === "loss") return "bg-rose-100 text-rose-800";
  return "bg-amber-100 text-amber-800";
}

function percentage(part: number, total: number) {
  if (total <= 0) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

function pointsForOutcome(outcome: RecentResult["outcome"]) {
  if (outcome === "win") return 3;
  if (outcome === "draw") return 1;
  return 0;
}

export default async function StatsPage() {
  const { clubId, player } = await requireClub();
  const flags = await getFeatureFlagsForClub(clubId);

  if (!flags.player_stats_overview) {
    redirect("/");
  }

  const supabase = await createClient();

  const [
    { data: teamPlayerRows, error: teamPlayerError },
    { data: sessionPlayerRows, error: sessionPlayerError },
  ] = await Promise.all([
    supabase.from("team_players").select("team_id").eq("player_id", player.id),
    supabase
      .from("session_players")
      .select("session_id")
      .eq("player_id", player.id),
  ]);

  if (teamPlayerError) {
    throw new Error(
      `Team-Zuordnungen konnten nicht geladen werden: ${teamPlayerError.message}`
    );
  }

  if (sessionPlayerError) {
    throw new Error(
      `Session-Teilnahmen konnten nicht geladen werden: ${sessionPlayerError.message}`
    );
  }

  const teamIds = ((teamPlayerRows ?? []) as TeamPlayerRow[])
    .map((row) => row.team_id)
    .filter((value) => Number.isFinite(value));

  const sessionsPlayed = ((sessionPlayerRows ?? []) as SessionPlayerRow[]).length;

  if (teamIds.length === 0) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-6 pb-24">
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-900/20"
          >
            ← Zurück
          </Link>
        </div>

        <div className="rounded-[28px] border border-black/10 bg-white p-5 shadow-sm sm:p-6">
          <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
            Spieler
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
            Meine Stats
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Für dich sind aktuell noch keine gespeicherten Team-Ergebnisse vorhanden.
            Sobald Sessions mit Teams und Ergebnis gespeichert wurden, tauchen deine
            Stats hier automatisch auf.
          </p>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
            Teilnahmen erfasst:{" "}
            <span className="font-semibold">{sessionsPlayed}</span>
          </div>
        </div>

        {flags.player_trends ? (
          <div className="mt-5">
            <PlayerTrendCard enabled={true} points={[]} />
          </div>
        ) : null}
      </main>
    );
  }

  const { data: resultsData, error: resultsError } = await supabase
    .from("results")
    .select("session_id, team_a_id, team_b_id, goals_team_a, goals_team_b")
    .eq("club_id", clubId);

  if (resultsError) {
    throw new Error(`Ergebnisse konnten nicht geladen werden: ${resultsError.message}`);
  }

  const allResults = (resultsData ?? []) as ResultRow[];

  const myResults = allResults.filter((result) => {
    return (
      (result.team_a_id !== null && teamIds.includes(result.team_a_id)) ||
      (result.team_b_id !== null && teamIds.includes(result.team_b_id))
    );
  });

  const sessionIds = myResults
    .map((result) => result.session_id)
    .filter((value) => Number.isFinite(value));

  let sessionsById = new Map<number, SessionRow>();

  if (sessionIds.length > 0) {
    const { data: sessionRows, error: sessionsError } = await supabase
      .from("sessions")
      .select("id, date")
      .in("id", sessionIds);

    if (sessionsError) {
      throw new Error(`Sessions konnten nicht geladen werden: ${sessionsError.message}`);
    }

    sessionsById = new Map<number, SessionRow>(
      ((sessionRows ?? []) as SessionRow[]).map((session) => [session.id, session])
    );
  }

  let wins = 0;
  let losses = 0;
  let draws = 0;

  const recentResults: RecentResult[] = myResults.map((result) => {
    const myTeamIsA =
      result.team_a_id !== null && teamIds.includes(result.team_a_id);

    const goalsA = result.goals_team_a ?? 0;
    const goalsB = result.goals_team_b ?? 0;

    let outcome: RecentResult["outcome"] = "draw";

    if (goalsA === goalsB) {
      outcome = "draw";
      draws += 1;
    } else if ((myTeamIsA && goalsA > goalsB) || (!myTeamIsA && goalsB > goalsA)) {
      outcome = "win";
      wins += 1;
    } else {
      outcome = "loss";
      losses += 1;
    }

    return {
      sessionId: result.session_id,
      date: sessionsById.get(result.session_id)?.date ?? null,
      outcome,
      scoreLabel: `${goalsA}:${goalsB}`,
      myTeamLabel: myTeamIsA ? "Team 1" : "Team 2",
    };
  });

  recentResults.sort((a, b) => {
    const aTime = a.date ? new Date(a.date).getTime() : 0;
    const bTime = b.date ? new Date(b.date).getTime() : 0;
    return bTime - aTime;
  });

  const lastFive = recentResults.slice(0, 5);
  const completedResults = wins + losses + draws;

  const trendPoints = [...lastFive].reverse().map((item, index) => ({
    id: `${item.sessionId}-${index}`,
    label: `${index + 1}`,
    value: pointsForOutcome(item.outcome),
  }));

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-24">
      <div className="mb-4">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-900/20"
        >
          ← Zurück
        </Link>
      </div>

      <section className="rounded-[28px] border border-black/10 bg-white p-5 shadow-sm sm:p-6">
        <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
          Spieler
        </div>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
          Meine Stats
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Deine persönliche Übersicht auf Basis gespeicherter Sessions und Ergebnisse.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Einsätze
            </div>
            <div className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
              {sessionsPlayed}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Siege
            </div>
            <div className="mt-2 text-3xl font-extrabold tracking-tight text-emerald-900">
              {wins}
            </div>
          </div>

          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-rose-700">
              Niederlagen
            </div>
            <div className="mt-2 text-3xl font-extrabold tracking-tight text-rose-900">
              {losses}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              Unentschieden
            </div>
            <div className="mt-2 text-3xl font-extrabold tracking-tight text-amber-900">
              {draws}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Siegquote
            </div>
            <div className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
              {percentage(wins, completedResults)}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        {flags.player_trends ? (
          <PlayerTrendCard enabled={true} points={trendPoints} />
        ) : null}

        <section className="rounded-[28px] border border-black/10 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-950">
                Letzte Ergebnisse
              </div>
              <div className="mt-1 text-sm text-slate-600">
                Deine letzten 5 bewerteten Sessions
              </div>
            </div>
          </div>

          {lastFive.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Noch keine gespeicherten Ergebnisse vorhanden.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {lastFive.map((item) => (
                <div
                  key={`${item.sessionId}-${item.scoreLabel}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">
                      {formatGermanDate(item.date)}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {item.myTeamLabel} · Ergebnis {item.scoreLabel}
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${outcomeClasses(
                      item.outcome
                    )}`}
                  >
                    {outcomeLabel(item.outcome)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}