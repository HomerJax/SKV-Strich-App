import Link from "next/link";
import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requirePowerUser } from "@/lib/auth/power-user";
import {
  PowerUserAuthUser,
  listAllAuthUsers,
} from "@/lib/supabase/power-user-admin";

type MembershipRow = {
  id: string;
  user_id: string;
  club_id: string;
  role: string;
  created_at: string;
};

type ClubRow = {
  id: string;
  display_name: string | null;
  name: string | null;
};

type UserClubAssignment = {
  clubName: string;
  role: string;
  created_at: string;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "–";
  return new Date(value).toLocaleString("de-DE");
}

export default async function PowerUserUsersPage() {
  await requirePowerUser();

  const supabase = await createClient();

  const [authUsers, membershipsResult, clubsResult] = await Promise.all([
    listAllAuthUsers().catch(() => []),
    supabase
      .from("club_memberships")
      .select("id, user_id, club_id, role, created_at")
      .order("created_at", { ascending: true }),
    supabase.from("clubs").select("id, display_name, name"),
  ]);

  const memberships = membershipsResult.error
    ? []
    : ((membershipsResult.data ?? []) as MembershipRow[]);

  const clubs = clubsResult.error ? [] : ((clubsResult.data ?? []) as ClubRow[]);

  const clubNameById = new Map(
    clubs.map((club) => [
      club.id,
      club.display_name?.trim() || club.name?.trim() || "Unbenannter Club",
    ])
  );

  const assignmentsByUserId = new Map<string, UserClubAssignment[]>();

  for (const membership of memberships) {
    const current = assignmentsByUserId.get(membership.user_id) ?? [];
    current.push({
      clubName: clubNameById.get(membership.club_id) ?? "Unbekannter Club",
      role: membership.role,
      created_at: membership.created_at,
    });
    assignmentsByUserId.set(membership.user_id, current);
  }

  const sortedUsers = [...authUsers].sort((a, b) => {
    const aValue = a.created_at ?? "";
    const bValue = b.created_at ?? "";
    return bValue.localeCompare(aValue);
  });

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link
            href="/power-user"
            className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-900/20"
          >
            ← Zurück zum Power User Dashboard
          </Link>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <Users className="h-6 w-6" strokeWidth={2.1} />
            </div>

            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Power User / Users
              </div>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
                Alle User
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Liste aller Auth-User inklusive Club-Zuordnungen und Rollen.
              </p>
            </div>
          </div>
        </div>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          {sortedUsers.length === 0 ? (
            <div className="text-sm text-slate-600">Keine User gefunden.</div>
          ) : (
            <div className="space-y-3">
              {sortedUsers.map((user: PowerUserAuthUser) => {
                const assignments = assignmentsByUserId.get(user.id) ?? [];

                return (
                  <div
                    key={user.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-slate-950">
                          {user.email?.trim() || "–"}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          User ID: {user.id}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Registriert: {formatDateTime(user.created_at)}
                        </div>
                      </div>

                      <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700">
                        Clubs: {assignments.length}
                      </div>
                    </div>

                    <div className="mt-4">
                      {assignments.length === 0 ? (
                        <div className="text-sm text-slate-600">
                          Noch keinem Club zugeordnet.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {assignments.map((assignment, index) => (
                            <div
                              key={`${user.id}-${assignment.clubName}-${index}`}
                              className="rounded-xl bg-slate-50 px-3 py-3"
                            >
                              <div className="text-sm font-medium text-slate-950">
                                {assignment.clubName}
                              </div>
                              <div className="mt-1 text-xs text-slate-600">
                                Rolle: {assignment.role}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                seit {formatDateTime(assignment.created_at)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}