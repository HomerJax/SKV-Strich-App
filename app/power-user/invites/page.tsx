import Link from "next/link";
import { Mail, MailCheck, MailOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requirePowerUser } from "@/lib/auth/power-user";
import { listAllAuthUsers } from "@/lib/supabase/power-user-admin";

type InviteRow = {
  id: string;
  club_id: string;
  role: "admin" | "member";
  created_at: string;
  expires_at: string | null;
  accepted_at: string | null;
  invited_by: string | null;
};

type ClubRow = {
  id: string;
  display_name: string | null;
  name: string | null;
};

type PageProps = {
  searchParams?: Promise<{
    status?: string;
  }>;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "–";
  return new Date(value).toLocaleString("de-DE");
}

export default async function PowerUserInvitesPage({
  searchParams,
}: PageProps) {
  await requirePowerUser();
  const resolvedSearchParams = await searchParams;

  const status =
    resolvedSearchParams?.status === "accepted"
      ? "accepted"
      : resolvedSearchParams?.status === "open"
        ? "open"
        : "all";

  const supabase = await createClient();

  const [invitesResult, clubsResult, authUsers] = await Promise.all([
    supabase
      .from("invites")
      .select("id, club_id, role, created_at, expires_at, accepted_at, invited_by")
      .order("created_at", { ascending: false }),

    supabase.from("clubs").select("id, display_name, name"),

    listAllAuthUsers().catch(() => []),
  ]);

  const invites = invitesResult.error
    ? []
    : ((invitesResult.data ?? []) as InviteRow[]);

  const clubs = clubsResult.error ? [] : ((clubsResult.data ?? []) as ClubRow[]);

  const clubNameById = new Map(
    clubs.map((club) => [
      club.id,
      club.display_name?.trim() || club.name?.trim() || "Unbenannter Club",
    ])
  );

  const emailByUserId = new Map(
    authUsers.map((user) => [user.id, user.email?.trim() || user.id])
  );

  const filteredInvites = invites.filter((invite) => {
    if (status === "accepted") return !!invite.accepted_at;
    if (status === "open") return !invite.accepted_at;
    return true;
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
              <Mail className="h-6 w-6" strokeWidth={2.1} />
            </div>

            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Power User / Invites
              </div>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
                Einladungen
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Überblick über offene und angenommene Einladungen inklusive
                Ersteller.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/power-user/invites"
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              status === "all"
                ? "bg-slate-950 text-white"
                : "border border-slate-300 bg-white text-slate-700"
            }`}
          >
            Alle
          </Link>

          <Link
            href="/power-user/invites?status=open"
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${
              status === "open"
                ? "bg-slate-950 text-white"
                : "border border-slate-300 bg-white text-slate-700"
            }`}
          >
            <MailOpen className="h-4 w-4" />
            Offen
          </Link>

          <Link
            href="/power-user/invites?status=accepted"
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${
              status === "accepted"
                ? "bg-slate-950 text-white"
                : "border border-slate-300 bg-white text-slate-700"
            }`}
          >
            <MailCheck className="h-4 w-4" />
            Angenommen
          </Link>
        </div>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          {filteredInvites.length === 0 ? (
            <div className="text-sm text-slate-600">
              Keine Einladungen für diese Auswahl gefunden.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredInvites.map((invite) => {
                const clubName =
                  clubNameById.get(invite.club_id) ?? "Unbekannter Club";
                const roleLabel = invite.role === "admin" ? "Admin" : "Mitglied";

                const statusLabel = invite.accepted_at ? "angenommen" : "offen";

                const createdBy =
                  invite.invited_by && emailByUserId.has(invite.invited_by)
                    ? emailByUserId.get(invite.invited_by)
                    : invite.invited_by ?? "–";

                return (
                  <div
                    key={invite.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-slate-950">
                          {clubName}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Rolle: {roleLabel}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Status: {statusLabel}
                        </div>
                      </div>

                      <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700">
                        Invite #{invite.id}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      <div className="rounded-xl bg-slate-50 px-3 py-3">
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Erstellt am
                        </div>
                        <div className="mt-1 text-sm text-slate-950">
                          {formatDateTime(invite.created_at)}
                        </div>
                      </div>

                      <div className="rounded-xl bg-slate-50 px-3 py-3">
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Erstellt von
                        </div>
                        <div className="mt-1 text-sm text-slate-950">
                          {createdBy}
                        </div>
                      </div>

                      <div className="rounded-xl bg-slate-50 px-3 py-3">
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Läuft ab
                        </div>
                        <div className="mt-1 text-sm text-slate-950">
                          {formatDateTime(invite.expires_at)}
                        </div>
                      </div>

                      <div className="rounded-xl bg-slate-50 px-3 py-3 md:col-span-2 xl:col-span-3">
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Angenommen am
                        </div>
                        <div className="mt-1 text-sm text-slate-950">
                          {formatDateTime(invite.accepted_at)}
                        </div>
                      </div>
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