import Link from "next/link";
import { Building2, CalendarDays, Mail, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireFounder } from "@/lib/auth/founder";

type ClubRow = {
  id: string;
  display_name: string | null;
};

type InviteCountRow = {
  club_id: string;
};

type SessionCountRow = {
  club_id: string;
  created_at: string;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "–";
  return new Date(value).toLocaleString("de-DE");
}

export default async function FounderClubsPage() {
  await requireFounder();

  const supabase = await createClient();

  const [clubsResult, invitesResult, sessionsResult] = await Promise.all([
    supabase
      .from("clubs")
      .select("id, display_name")
      .order("display_name", { ascending: true }),

    supabase.from("club_invites").select("club_id"),

    supabase
      .from("sessions")
      .select("club_id, created_at")
      .order("created_at", { ascending: false }),
  ]);

  const clubs = clubsResult.error ? [] : ((clubsResult.data ?? []) as ClubRow[]);
  const invites = invitesResult.error
    ? []
    : ((invitesResult.data ?? []) as InviteCountRow[]);
  const sessions = sessionsResult.error
    ? []
    : ((sessionsResult.data ?? []) as SessionCountRow[]);

  const inviteCountByClub = new Map<string, number>();
  for (const invite of invites) {
    inviteCountByClub.set(
      invite.club_id,
      (inviteCountByClub.get(invite.club_id) ?? 0) + 1
    );
  }

  const sessionCountByClub = new Map<string, number>();
  const latestSessionByClub = new Map<string, string>();
  for (const session of sessions) {
    sessionCountByClub.set(
      session.club_id,
      (sessionCountByClub.get(session.club_id) ?? 0) + 1
    );

    if (!latestSessionByClub.has(session.club_id)) {
      latestSessionByClub.set(session.club_id, session.created_at);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link
            href="/founder"
            className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-900/20"
          >
            ← Zurück zum Founder Dashboard
          </Link>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <Building2 className="h-6 w-6" strokeWidth={2.1} />
            </div>

            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Founder / Clubs
              </div>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
                Alle Clubs
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Übersicht über alle aktuell angelegten Clubs inklusive Einladungen
                und Trainingsaktivität.
              </p>
            </div>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {clubs.length === 0 ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
              Noch keine Clubs vorhanden.
            </div>
          ) : (
            clubs.map((club) => {
              const clubName = club.display_name?.trim() || "Unbenannter Club";
              const inviteCount = inviteCountByClub.get(club.id) ?? 0;
              const sessionCount = sessionCountByClub.get(club.id) ?? 0;
              const latestSession = latestSessionByClub.get(club.id) ?? null;

              return (
                <div
                  key={club.id}
                  className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <h2 className="text-lg font-semibold text-slate-950">
                    {clubName}
                  </h2>

                  <div className="mt-2 text-xs text-slate-500">ID: {club.id}</div>

                  <div className="mt-5 grid gap-3">
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <Mail className="h-4 w-4" />
                        Einladungen
                      </div>
                      <div className="font-semibold text-slate-950">
                        {inviteCount}
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <CalendarDays className="h-4 w-4" />
                        Trainings
                      </div>
                      <div className="font-semibold text-slate-950">
                        {sessionCount}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <Users className="h-4 w-4" />
                        Letzte Aktivität
                      </div>
                      <div className="mt-1 text-sm font-medium text-slate-950">
                        {formatDateTime(latestSession)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
                    Gründer + Mitgliederliste ergänzen wir als Nächstes sauber,
                    sobald die genaue Membership-Tabelle feststeht.
                  </div>
                </div>
              );
            })
          )}
        </section>
      </section>
    </main>
  );
}