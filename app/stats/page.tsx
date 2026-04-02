import Link from "next/link";
import { redirect } from "next/navigation";
import { requireClub } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { getFeatureFlagsForClub } from "@/lib/feature-flags";
import PlayerTrendCard from "@/components/stats/PlayerTrendCard";

type ClubSettingsRow = {
  use_strength: boolean;
  strength_default: number | null;
};

type ResultRow = {
  session_id: number;
  team_a_id: number | null;
  team_b_id: number | null;
  goals_team_a: number | null;
  goals_team_b: number | null;
};

type TeamPlayerRow = {
  team_id: number;
  player_id: number;
};

type SessionPlayerRow = {
  session_id: number;
};

type SessionRow = {
  id: number;
  date: string;
};

type PlayerStrengthRow = {
  id: number;
  strength: number | null;
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

function trendValueForOutcome(outcome: RecentResult["outcome"]) {
  if (outcome === "win") return 1;
  return 0;
}

function formatImpactValue(value: number) {
  if (!Number.isFinite(value)) return "0,00";
  return value.toFixed(2).replace(".", ",");
}

function getImpactValue(params: {
  myTeamScore: number;
  opponentScore: number;
  goalsFor: number;
  goalsAgainst: number;
}) {
  const { myTeamScore, opponentScore, goalsFor, goalsAgainst } = params;

  const isWin = goalsFor > goalsAgainst;
  if (goalsFor === goalsAgainst) return 0;

  const diff = myTeamScore - opponentScore;

  if (Math.abs(diff) < 0.0001) {
    return isWin ? 1 : 0;
  }

  const isFavorite = diff > 0;

  if (isWin && isFavorite) return 1;
  if (isWin && !isFavorite) return 2;
  if (!isWin && isFavorite) return -1;

  return 0;
}

function getImpactMeta(impactPerMatch: number) {
  if (impactPerMatch >= 1.25) {
    return {
      title: "Sehr starker Impact",
      text: "Deine Teams performen mit dir sehr häufig besser als erwartet.",
      badgeClasses: "bg-emerald-100 text-emerald-800",
      boxClasses: "border-emerald-200 bg-emerald-50 text-emerald-900",
    };
  }

  if (impactPerMatch >= 0.75) {
    return {
      title: "Starker Impact",
      text: "Mit dir im Team werden regelmäßig starke Ergebnisse erreicht.",
      badgeClasses: "bg-sky-100 text-sky-800",
      boxClasses: "border-sky-200 bg-sky-50 text-sky-900",
    };
  }

  if (impactPerMatch >= 0.25) {
    return {
      title: "Solider Impact",
      text: "Deine Teams holen mit dir ordentliche Ergebnisse und bleiben im positiven Bereich.",
      badgeClasses: "bg-amber-100 text-amber-800",
      boxClasses: "border-amber-200 bg-amber-50 text-amber-900",
    };
  }

  return {
    title: "Noch Luft nach oben",
    text: "Aktuell performen deine Teams mit dir noch nicht konstant über Erwartung.",
    badgeClasses: "bg-rose-100 text-rose-800",
    boxClasses: "border-rose-200 bg-rose-50 text-rose-900",
  };
}

export default async function StatsPage() {
  const { clubId, player } = await requireClub();
  const flags = await getFeatureFlagsForClub(clubId);

  if (!flags.player_stats_overview) {
    redirect("/");
  }

  const supabase = await createClient();

  const [
    { data: clubSettingsData, error: clubSettingsError },
    { data: teamPlayerRowsForPlayer, error: teamPlayerError },
    { data: sessionPlayerRows, error: sessionPlayerError },
  ] = await Promise.all([
    supabase
      .from("club_settings")
      .select("use_strength, strength_default")
      .eq("club_id", clubId)
      .maybeSingle<ClubSettingsRow>(),
    supabase.from("team_players").select("team_id").eq("player_id", player.id),
    supabase
      .from("session_players")
      .select("session_id")
      .eq("player_id", player.id),
  ]);

  if (clubSettingsError) {
    throw new Error(
      `Club-Settings konnten nicht geladen werden: ${clubSettingsError.message}`
    );
  }

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

  const clubSettings = (clubSettingsData ?? {
    use_strength: true,
    strength_default: 3,
  }) as ClubSettingsRow;

  const useStrength = clubSettings.use_strength ?? true;
  const strengthDefault = clubSettings.strength_default ?? 3;

  const teamIds = ((teamPlayerRowsForPlayer ?? []) as { team_id: number }[])
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

  const relevantTeamIds = Array.from(
    new Set(
      myResults.flatMap((result) =>
        [result.team_a_id, result.team_b_id].filter(
          (value): value is number => value !== null && Number.isFinite(value)
        )
      )
    )
  );

  const teamScoreById = new Map<number, number>();

  if (relevantTeamIds.length > 0) {
    const { data: teamPlayersData, error: teamPlayersError } = await supabase
      .from("team_players")
      .select("team_id, player_id")
      .in("team_id", relevantTeamIds);

    if (teamPlayersError) {
      throw new Error(
        `Team-Spieler konnten nicht geladen werden: ${teamPlayersError.message}`
      );
    }

    const teamPlayers = (teamPlayersData ?? []) as TeamPlayerRow[];

    const playerIds = Array.from(
      new Set(teamPlayers.map((row) => row.player_id).filter(Number.isFinite))
    );

    const { data: playersData, error: playersError } = await supabase
      .from("players")
      .select("id, strength")
      .in("id", playerIds);

    if (playersError) {
      throw new Error(
        `Spieler-Stärken konnten nicht geladen werden: ${playersError.message}`
      );
    }

    const players = (playersData ?? []) as PlayerStrengthRow[];
    const strengthByPlayerId = new Map<number, number>(
      players.map((p) => [p.id, p.strength ?? strengthDefault])
    );

    const teamBuckets = new Map<number, TeamPlayerRow[]>();
    for (const row of teamPlayers) {
      const current = teamBuckets.get(row.team_id) ?? [];
      current.push(row);
      teamBuckets.set(row.team_id, current);
    }

    for (const teamId of relevantTeamIds) {
      const rows = teamBuckets.get(teamId) ?? [];

      if (useStrength) {
        const score = rows.reduce((sum, row) => {
          return sum + (strengthByPlayerId.get(row.player_id) ?? strengthDefault);
        }, 0);

        teamScoreById.set(teamId, score);
      } else {
        teamScoreById.set(teamId, rows.length);
      }
    }
  }

  const totals = {
    wins: 0,
    losses: 0,
    draws: 0,
    impactTotal: 0,
    impactGames: 0,
    impactWins: 0,
  };

  const recentResults: RecentResult[] = myResults.map((result) => {
    const myTeamIsA =
      result.team_a_id !== null && teamIds.includes(result.team_a_id);

    const goalsA = result.goals_team_a ?? 0;
    const goalsB = result.goals_team_b ?? 0;

    let outcome: RecentResult["outcome"] = "draw";

    if (goalsA === goalsB) {
      outcome = "draw";
      totals.draws += 1;
    } else if ((myTeamIsA && goalsA > goalsB) || (!myTeamIsA && goalsB > goalsA)) {
      outcome = "win";
      totals.wins += 1;
    } else {
      outcome = "loss";
      totals.losses += 1;
    }

    const myTeamId = myTeamIsA ? result.team_a_id : result.team_b_id;
    const opponentTeamId = myTeamIsA ? result.team_b_id : result.team_a_id;

    const myTeamScore =
      myTeamId !== null ? (teamScoreById.get(myTeamId) ?? 0) : 0;
    const opponentScore =
      opponentTeamId !== null ? (teamScoreById.get(opponentTeamId) ?? 0) : 0;

    const goalsFor = myTeamIsA ? goalsA : goalsB;
    const goalsAgainst = myTeamIsA ? goalsB : goalsA;

    const impactValue = getImpactValue({
      myTeamScore,
      opponentScore,
      goalsFor,
      goalsAgainst,
    });

    totals.impactTotal += impactValue;
    totals.impactGames += 1;
    if (outcome === "win") {
      totals.impactWins += 1;
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
  const completedResults =
    totals.wins + totals.losses + totals.draws;

  const trendPoints = [...lastFive].reverse().map((item, index) => ({
    id: `${item.sessionId}-${index}`,
    label: `${index + 1}`,
    value: trendValueForOutcome(item.outcome),
  }));

  const impactPerMatch =
    totals.impactGames > 0
      ? totals.impactTotal / totals.impactGames
      : 0;
  const impactMeta = getImpactMeta(impactPerMatch);

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
              {totals.wins}
            </div>
          </div>

          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-rose-700">
              Niederlagen
            </div>
            <div className="mt-2 text-3xl font-extrabold tracking-tight text-rose-900">
              {totals.losses}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              Unentschieden
            </div>
            <div className="mt-2 text-3xl font-extrabold tracking-tight text-amber-900">
              {totals.draws}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Siegquote
            </div>
            <div className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
              {percentage(totals.wins, completedResults)}
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

      {flags.team_impact ? (
        <section className="mt-5 rounded-[28px] border border-black/10 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-950">
                Team Impact
              </div>
              <div className="mt-1 text-sm text-slate-600">
                Zeigt, wie Teams mit dir performen – nicht nur ob du gewinnst,
                sondern auch wie stark dein Team im Vergleich war.
              </div>
            </div>

            <span
              className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${impactMeta.badgeClasses}`}
            >
              {impactMeta.title}
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Spiele mit dir
              </div>
              <div className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
                {totals.impactGames}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Siege mit dir
              </div>
              <div className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
                {totals.impactWins}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Impact gesamt
              </div>
              <div className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
                {formatImpactValue(totals.impactTotal)}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Impact / Spiel
              </div>
              <div className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
                {formatImpactValue(impactPerMatch)}
              </div>
            </div>
          </div>

          <div className={`mt-5 rounded-2xl border p-4 text-sm leading-6 ${impactMeta.boxClasses}`}>
            <div className="font-semibold">{impactMeta.title}</div>
            <div className="mt-1">{impactMeta.text}</div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <div className="font-semibold text-slate-900">
              So wird Team Impact berechnet
            </div>

            <div className="mt-2 space-y-1">
              <div>• Sieg mit stärkerem Team → +1</div>
              <div>• Sieg als Underdog → +2</div>
              <div>• Niederlage trotz stärkerem Team → -1</div>
              <div>• Niederlage als Underdog → 0</div>
            </div>

            <p className="mt-3 text-slate-600">
              Grundlage ist die erwartete Teamstärke aus den gespeicherten Teams.
              Wenn in deinem Club Stärken aktiv sind, wird mit der Summe der
              Spieler-Stärken gerechnet. Sonst zählt die Teamgröße als neutrale
              Basis.
            </p>

            <div className="mt-4 border-t border-slate-200 pt-4">
              <div className="font-semibold text-slate-900">
                So kannst du die beiden Werte lesen
              </div>

              <div className="mt-3 space-y-3 text-slate-600">
                <p>
                  <span className="font-medium text-slate-800">Impact gesamt</span>{" "}
                  ist die aufsummierte Wirkung über alle bewerteten Spiele.
                  Der Wert steigt, wenn du über viele Spiele positiven Einfluss
                  sammelst. Er hängt also stark davon ab, wie oft du gespielt hast.
                </p>

                <p>
                  <span className="font-medium text-slate-800">Impact / Spiel</span>{" "}
                  ist dein durchschnittlicher Einfluss pro Spiel. Das ist die
                  wichtigere Kennzahl, weil sie fairer zwischen Spielern mit
                  unterschiedlich vielen Einsätzen vergleichbar ist.
                </p>
              </div>

              <div className="mt-4 space-y-1 text-slate-600">
                <div>• Unter 0,25 → eher schwach</div>
                <div>• 0,25 bis 0,74 → solide</div>
                <div>• 0,75 bis 1,24 → stark</div>
                <div>• Ab 1,25 → sehr stark</div>
              </div>

              <p className="mt-3 text-slate-600">
                Beispiel: Ein <span className="font-medium text-slate-800">Impact gesamt</span> von
                9,0 kann stark sein – wenn er in wenigen Spielen entstanden ist.
                Über sehr viele Spiele ist derselbe Wert eher mittel. Deshalb ist{" "}
                <span className="font-medium text-slate-800">Impact / Spiel</span>{" "}
                meist die bessere Einordnung.
              </p>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}