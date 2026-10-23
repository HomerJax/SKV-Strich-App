import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSessionAccess } from "@/lib/session-detail/access";
import { canManageClub } from "@/lib/auth/access";
import TeamCorrectionClient from "./TeamCorrectionClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TeamCorrectionPage({ params }: { params: Promise<{ id: string }> }) {
  const sessionId = Number((await params).id);
  if (!Number.isSafeInteger(sessionId) || sessionId < 1) notFound();
  const access = await requireSessionAccess(sessionId);
  if ("error" in access) notFound();
  if (!canManageClub({ isPowerUser: access.isPowerUser, role: access.membership.role }) && !access.canLeadTraining) {
    redirect(`/sessions/${sessionId}`);
  }
  if (access.session.session_mode === "tournament") redirect(`/sessions/${sessionId}`);

  const db = access.adminSupabase;
  const { data: result } = await db.from("results")
    .select("id,team_a_id,team_b_id,goals_team_a,goals_team_b")
    .eq("club_id", access.clubId).eq("session_id", sessionId)
    .order("game_no", { ascending: true }).limit(1).maybeSingle();
  if (!result?.team_a_id || !result?.team_b_id) redirect(`/sessions/${sessionId}`);

  const teamIds = [result.team_a_id, result.team_b_id];
  const [{ data: teams, error: teamsError }, { data: assigned, error: assignedError }] = await Promise.all([
    db.from("teams").select("id,name").eq("club_id", access.clubId).eq("session_id", sessionId).in("id", teamIds),
    db.from("team_players").select("id,team_id,player_id").in("team_id", teamIds),
  ]);
  if (teamsError || assignedError || (teams ?? []).length !== 2) throw new Error("Teamzuordnung konnte nicht geladen werden.");
  const playerIds = [...new Set((assigned ?? []).map((row) => row.player_id))];
  const { data: players, error: playersError } = playerIds.length
    ? await db.from("players").select("id,name,first_name,last_name,nickname").eq("club_id", access.clubId).in("id", playerIds)
    : { data: [], error: null };
  if (playersError) throw new Error("Spielernamen konnten nicht geladen werden.");
  const names = new Map((players ?? []).map((p) => [
    p.id, p.nickname?.trim() || [p.first_name,p.last_name].filter(Boolean).join(" ") || p.name || "Spieler",
  ]));
  const entries = (assigned ?? []).map((row) => ({
    playerId: row.player_id,
    teamId: row.team_id,
    name: names.get(row.player_id) ?? `Spieler #${row.player_id}`,
  })).sort((a,b) => a.name.localeCompare(b.name, "de"));
  const teamRows = teamIds.map((id, i) => ({
    id, name: teams?.find((team) => team.id === id)?.name || `Team ${i + 1}`,
  }));

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-24 pt-6">
      <div className="mx-auto max-w-2xl space-y-4">
        <Link href={`/sessions/${sessionId}`} className="text-sm font-semibold text-cyan-700">← Zurück zur Session</Link>
        <div className="rounded-2xl border border-cyan-200 bg-white p-5 shadow-sm">
          <div className="text-[11px] font-extrabold uppercase tracking-[.16em] text-cyan-700">Nachträgliche Teamkorrektur</div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Teams korrigieren</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Training vom {new Date(`${access.session.date}T12:00:00`).toLocaleDateString("de-DE")} ·
            Ergebnis {result.goals_team_a ?? "–"}:{result.goals_team_b ?? "–"}.
            Nur die Teamzuordnung wird verändert – Ergebnis, Anwesenheiten, Siegerfoto und Session bleiben gespeichert.
          </p>
        </div>
        <TeamCorrectionClient sessionId={sessionId} teams={teamRows} entries={entries}/>
        <p className="text-xs leading-5 text-slate-500">
          Berechtigt sind Admins und Trainingsleiter. Korrekturen werden protokolliert und können die aus der
          Teamzuordnung berechneten Spielerstatistiken entsprechend korrigieren.
        </p>
      </div>
    </main>
  );
}
