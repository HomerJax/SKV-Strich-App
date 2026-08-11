import Link from "next/link";
import { AlertTriangle, CalendarDays, Trash2, UserRound, Users } from "lucide-react";
import { requirePowerUser } from "@/lib/auth/power-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { listAllAuthUsers } from "@/lib/supabase/power-user-admin";

type ClubRow = {
  id: string;
  display_name: string | null;
  name: string | null;
  created_at: string;
};

type MembershipRow = {
  club_id: string;
  user_id: string;
  role: string;
  created_at: string;
};

type PlayerRow = {
  club_id: string;
  created_at: string;
};

type SessionRow = {
  club_id: string;
  created_at: string;
  date: string | null;
};

type InviteRow = {
  club_id: string;
  created_at: string;
  accepted_at: string | null;
};

type ClubCleanupView = {
  club: ClubRow;
  clubName: string;
  memberCount: number;
  playerCount: number;
  sessionCount: number;
  inviteCount: number;
  leadEmail: string | null;
  latestSessionDate: string | null;
  lastActivityAt: string;
  daysSinceActivity: number;
  status: "test/leer" | "kaum genutzt" | "genutzt";
  riskScore: number;
};

function clubName(club: ClubRow) {
  return club.display_name?.trim() || club.name?.trim() || "Unbenannter Club";
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "–";
  return new Date(value).toLocaleString("de-DE");
}

function formatDate(value: string | null | undefined) {
  if (!value) return "–";
  return new Date(`${value}T12:00:00`).toLocaleDateString("de-DE");
}

function newestIso(values: Array<string | null | undefined>, fallback: string) {
  const valid = values.filter((value): value is string => Boolean(value));
  if (!valid.length) return fallback;

  return valid.reduce((latest, current) =>
    new Date(current).getTime() > new Date(latest).getTime() ? current : latest
  );
}

function daysSince(value: string) {
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / (1000 * 60 * 60 * 24))
  );
}

function statusTone(status: ClubCleanupView["status"]) {
  if (status === "test/leer") {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }

  if (status === "kaum genutzt") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

function deleteErrorMessage(error: string) {
  switch (error) {
    case "confirmation":
      return "Der eingegebene Clubname stimmt nicht exakt.";
    case "not_found":
      return "Der Club wurde nicht gefunden oder konnte nicht geladen werden.";
    case "delete_failed":
      return "Der Club konnte nicht vollständig gelöscht werden.";
    default:
      return "";
  }
}

export default async function PowerUserClubCleanupPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePowerUser();

  const params = (await searchParams) ?? {};
  const admin = createAdminClient();

  const [clubsResult, membershipsResult, playersResult, sessionsResult, invitesResult, authUsers] =
    await Promise.all([
      admin
        .from("clubs")
        .select("id, display_name, name, created_at")
        .order("created_at", { ascending: true }),
      admin
        .from("club_memberships")
        .select("club_id, user_id, role, created_at"),
      admin.from("players").select("club_id, created_at"),
      admin
        .from("sessions")
        .select("club_id, created_at, date")
        .order("created_at", { ascending: false }),
      admin.from("invites").select("club_id, created_at, accepted_at"),
      listAllAuthUsers().catch(() => []),
    ]);

  const clubs = clubsResult.error ? [] : ((clubsResult.data ?? []) as ClubRow[]);
  const memberships = membershipsResult.error
    ? []
    : ((membershipsResult.data ?? []) as MembershipRow[]);
  const players = playersResult.error ? [] : ((playersResult.data ?? []) as PlayerRow[]);
  const sessions = sessionsResult.error ? [] : ((sessionsResult.data ?? []) as SessionRow[]);
  const invites = invitesResult.error ? [] : ((invitesResult.data ?? []) as InviteRow[]);

  const emailByUserId = new Map(
    authUsers.map((user) => [user.id, user.email?.trim() || user.id])
  );

  const views: ClubCleanupView[] = clubs
    .map((club) => {
      const clubMemberships = memberships.filter((row) => row.club_id === club.id);
      const clubPlayers = players.filter((row) => row.club_id === club.id);
      const clubSessions = sessions.filter((row) => row.club_id === club.id);
      const clubInvites = invites.filter((row) => row.club_id === club.id);

      const lead =
        [...clubMemberships]
          .sort((a, b) => a.created_at.localeCompare(b.created_at))
          .find((row) => row.role === "admin") ?? clubMemberships[0] ?? null;

      const lastActivityAt = newestIso(
        [
          club.created_at,
          ...clubMemberships.map((row) => row.created_at),
          ...clubPlayers.map((row) => row.created_at),
          ...clubSessions.map((row) => row.created_at),
          ...clubInvites.flatMap((row) => [row.created_at, row.accepted_at]),
        ],
        club.created_at
      );

      const memberCount = clubMemberships.length;
      const playerCount = clubPlayers.length;
      const sessionCount = clubSessions.length;
      const inviteCount = clubInvites.length;

      const isLikelyTest = memberCount <= 1 && sessionCount === 0 && inviteCount === 0;
      const isLowUsage = !isLikelyTest && memberCount <= 2 && sessionCount <= 1;

      return {
        club,
        clubName: clubName(club),
        memberCount,
        playerCount,
        sessionCount,
        inviteCount,
        leadEmail: lead ? emailByUserId.get(lead.user_id) ?? lead.user_id : null,
        latestSessionDate: clubSessions[0]?.date ?? null,
        lastActivityAt,
        daysSinceActivity: daysSince(lastActivityAt),
        status: isLikelyTest ? "test/leer" : isLowUsage ? "kaum genutzt" : "genutzt",
        riskScore: isLikelyTest ? 2 : isLowUsage ? 1 : 0,
      };
    })
    .sort((a, b) => {
      if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore;
      if (b.daysSinceActivity !== a.daysSinceActivity) {
        return b.daysSinceActivity - a.daysSinceActivity;
      }
      return a.clubName.localeCompare(b.clubName, "de");
    });

  const likelyTestCount = views.filter((view) => view.status === "test/leer").length;
  const lowUsageCount = views.filter((view) => view.status === "kaum genutzt").length;
  const deleteError =
    typeof params.delete_error === "string" ? deleteErrorMessage(params.delete_error) : "";
  const deleted = params.deleted === "1";
  const deletedName = typeof params.deleted_name === "string" ? params.deleted_name : "";

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/power-user/clubs"
            className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900"
          >
            ← Clubs & Billing
          </Link>
          <Link
            href="/power-user"
            className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900"
          >
            Power User Dashboard
          </Link>
        </div>

        <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
              <Trash2 className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                Power User
              </div>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                Club-Cleanup
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Testclubs und Datenleichen stehen oben. Die Einstufung ist nur eine Hilfe – gelöscht wird nie automatisch.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-2xl font-black text-slate-950">{views.length}</div>
              <div className="mt-1 text-xs font-semibold text-slate-500">Clubs gesamt</div>
            </div>
            <div className="rounded-2xl bg-rose-50 p-4">
              <div className="text-2xl font-black text-rose-800">{likelyTestCount}</div>
              <div className="mt-1 text-xs font-semibold text-rose-700">test/leer</div>
            </div>
            <div className="rounded-2xl bg-amber-50 p-4">
              <div className="text-2xl font-black text-amber-800">{lowUsageCount}</div>
              <div className="mt-1 text-xs font-semibold text-amber-700">kaum genutzt</div>
            </div>
          </div>
        </div>

        {deleted ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            Club gelöscht{deletedName ? `: ${deletedName}` : "."}
          </div>
        ) : null}

        {deleteError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
            {deleteError}
          </div>
        ) : null}

        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <strong>test/leer</strong> bedeutet aktuell: höchstens ein Mitglied, kein Training und keine Einladung. Das ist ein Hinweis, kein Löschautomatismus.
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {views.map((view) => (
            <details
              key={view.club.id}
              className={`group rounded-[26px] border bg-white shadow-sm ${
                view.status === "test/leer" ? "border-rose-200" : "border-slate-200"
              }`}
            >
              <summary className="cursor-pointer list-none p-5 [&::-webkit-details-marker]:hidden">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-black text-slate-950">{view.clubName}</h2>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusTone(view.status)}`}>
                        {view.status}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Angelegt {formatDateTime(view.club.created_at)} · letzte Aktivität {formatDateTime(view.lastActivityAt)} ({view.daysSinceActivity} Tage)
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Lead: {view.leadEmail ?? "–"}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
                      <Users className="mx-auto h-4 w-4 text-slate-500" />
                      <div className="mt-1 font-black text-slate-950">{view.memberCount}</div>
                      <div className="text-[11px] text-slate-500">Mitglieder</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
                      <UserRound className="mx-auto h-4 w-4 text-slate-500" />
                      <div className="mt-1 font-black text-slate-950">{view.playerCount}</div>
                      <div className="text-[11px] text-slate-500">Spieler</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
                      <CalendarDays className="mx-auto h-4 w-4 text-slate-500" />
                      <div className="mt-1 font-black text-slate-950">{view.sessionCount}</div>
                      <div className="text-[11px] text-slate-500">Trainings</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
                      <div className="text-sm font-bold text-slate-500">✉</div>
                      <div className="mt-1 font-black text-slate-950">{view.inviteCount}</div>
                      <div className="text-[11px] text-slate-500">Invites</div>
                    </div>
                  </div>
                </div>
              </summary>

              <div className="border-t border-slate-100 p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                    <div><strong>Club-ID:</strong> {view.club.id}</div>
                    <div className="mt-1"><strong>Letztes Training:</strong> {formatDate(view.latestSessionDate)}</div>
                  </div>

                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                    <div className="text-sm font-black text-rose-900">Club endgültig löschen</div>
                    <p className="mt-1 text-xs leading-5 text-rose-800">
                      Alle Clubdaten, Spieler, Sessions, Ergebnisse, MVP-Daten und Bilder werden gelöscht. Benutzerkonten bleiben bestehen.
                    </p>

                    <form method="post" action="/power-user/clubs/delete" className="mt-3 space-y-2">
                      <input type="hidden" name="club_id" value={view.club.id} />
                      <label className="block text-xs font-semibold text-rose-900">
                        Zur Bestätigung exakt „{view.clubName}“ eingeben
                      </label>
                      <input
                        name="confirmation"
                        autoComplete="off"
                        className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm outline-none focus:border-rose-500"
                      />
                      <button
                        type="submit"
                        className="inline-flex w-full items-center justify-center rounded-xl bg-rose-600 px-3 py-2.5 text-sm font-black text-white hover:bg-rose-700"
                      >
                        Diesen Club dauerhaft löschen
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
