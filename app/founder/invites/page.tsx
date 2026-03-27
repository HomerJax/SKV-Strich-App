import Link from "next/link";
import { Mail, MailCheck, MailOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireFounder } from "@/lib/auth/founder";

type InviteRow = {
  id: number;
  club_id: string;
  role: "admin" | "member";
  created_at: string;
  expires_at: string | null;
  used_at: string | null;
  is_active: boolean;
};

type ClubRow = {
  id: string;
  display_name: string | null;
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

export default async function FounderInvitesPage({ searchParams }: PageProps) {
  await requireFounder();
  const resolvedSearchParams = await searchParams;

  const status =
    resolvedSearchParams?.status === "used"
      ? "used"
      : resolvedSearchParams?.status === "open"
      ? "open"
      : "all";

  const supabase = await createClient();

  const [invitesResult, clubsResult] = await Promise.all([
    supabase
      .from("club_invites")
      .select("id, club_id, role, created_at, expires_at, used_at, is_active")
      .order("created_at", { ascending: false }),

    supabase.from("clubs").select("id, display_name"),
  ]);

  const invites = invitesResult.error
    ? []
    : ((invitesResult.data ?? []) as InviteRow[]);

  const clubs = clubsResult.error ? [] : ((clubsResult.data ?? []) as ClubRow[]);

  const clubNameById = new Map(
    clubs.map((club) => [
      club.id,
      club.display_name?.trim() || "Unbenannter Club",
    ])
  );

  const filteredInvites = invites.filter((invite) => {
    if (status === "used") return !!invite.used_at;
    if (status === "open") return invite.is_active && !invite.used_at;
    return true;
  });

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
              <Mail className="h-6 w-6" strokeWidth={2.1} />
            </div>

            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Founder / Invites
              </div>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
                Einladungen
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Überblick über offene und bereits genutzte Einladungen.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/founder/invites"
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              status === "all"
                ? "bg-slate-950 text-white"
                : "border border-slate-300 bg-white text-slate-700"
            }`}
          >
            Alle
          </Link>

          <Link
            href="/founder/invites?status=open"
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
            href="/founder/invites?status=used"
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${
              status === "used"
                ? "bg-slate-950 text-white"
                : "border border-slate-300 bg-white text-slate-700"
            }`}
          >
            <MailCheck className="h-4 w-4" />
            Genutzt
          </Link>
        </div>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          {filteredInvites.length === 0 ? (
            <div className="text-sm text-slate-600">
              Keine Einladungen für diese Auswahl gefunden.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="px-3 py-3 font-medium">Club</th>
                    <th className="px-3 py-3 font-medium">Rolle</th>
                    <th className="px-3 py-3 font-medium">Erstellt am</th>
                    <th className="px-3 py-3 font-medium">Läuft ab</th>
                    <th className="px-3 py-3 font-medium">Verwendet</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvites.map((invite) => {
                    const clubName =
                      clubNameById.get(invite.club_id) ?? "Unbekannter Club";
                    const roleLabel =
                      invite.role === "admin" ? "Admin" : "Mitglied";

                    const statusLabel = invite.used_at
                      ? "verwendet"
                      : invite.is_active
                      ? "offen"
                      : "deaktiviert";

                    return (
                      <tr key={invite.id} className="border-b border-slate-100">
                        <td className="px-3 py-3 font-medium text-slate-950">
                          {clubName}
                        </td>
                        <td className="px-3 py-3 text-slate-700">
                          {roleLabel}
                        </td>
                        <td className="px-3 py-3 text-slate-700">
                          {formatDateTime(invite.created_at)}
                        </td>
                        <td className="px-3 py-3 text-slate-700">
                          {formatDateTime(invite.expires_at)}
                        </td>
                        <td className="px-3 py-3 text-slate-700">
                          {formatDateTime(invite.used_at)}
                        </td>
                        <td className="px-3 py-3">
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                            {statusLabel}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}