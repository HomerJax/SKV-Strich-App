import Link from "next/link";
import {
  Building2,
  CalendarDays,
  CreditCard,
  Mail,
  Shield,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePowerUser } from "@/lib/auth/power-user";
import {
  PowerUserAuthUser,
  listAllAuthUsers,
} from "@/lib/supabase/power-user-admin";

type ClubRow = {
  id: string;
  display_name: string | null;
  name: string | null;
  created_at: string;
};

type MembershipRow = {
  id: string;
  user_id: string;
  club_id: string;
  role: string;
  created_at: string;
};

type InviteRow = {
  club_id: string;
};

type SessionRow = {
  club_id: string;
  created_at: string;
  date: string | null;
};

type BillingRow = {
  club_id: string;
  plan_key: string;
  status: string;
  trial_ends_at: string | null;
  pro_ends_at: string | null;
  billing_note: string | null;
  updated_at: string | null;
};

type ClubMemberView = {
  user_id: string;
  email: string;
  role: string;
  created_at: string;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "–";
  return new Date(value).toLocaleString("de-DE");
}

function formatDate(value: string | null | undefined) {
  if (!value) return "–";
  return new Date(value).toLocaleDateString("de-DE");
}

function getDisplayClubName(club: ClubRow) {
  return club.display_name?.trim() || club.name?.trim() || "Unbenannter Club";
}

function getUserEmailById(users: PowerUserAuthUser[]) {
  return new Map(users.map((user) => [user.id, user.email?.trim() || user.id]));
}

function getPlanLabel(planKey: string) {
  switch (planKey) {
    case "supercup_trial":
      return "Supercup Trial";
    case "pro_monthly":
      return "Pro monatlich";
    case "pro_6_months":
      return "Pro 6 Monate";
    case "pro_yearly":
      return "Pro 12 Monate";
    case "founder":
      return "Founder";
    case "free":
    default:
      return "Free";
  }
}

function getBillingTone(planKey: string, status: string) {
  if (status !== "active") {
    return "border-slate-200 bg-slate-50 text-slate-700";
  }

  if (planKey === "free") {
    return "border-slate-200 bg-slate-50 text-slate-700";
  }

  if (planKey === "supercup_trial") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-900";
}

function getEffectiveBilling(billing: BillingRow | null | undefined): BillingRow {
  return {
    club_id: billing?.club_id ?? "",
    plan_key: billing?.plan_key ?? "free",
    status: billing?.status ?? "active",
    trial_ends_at: billing?.trial_ends_at ?? null,
    pro_ends_at: billing?.pro_ends_at ?? null,
    billing_note: billing?.billing_note ?? "Fallback: kein Billing-Eintrag vorhanden.",
    updated_at: billing?.updated_at ?? null,
  };
}

export default async function PowerUserClubsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePowerUser();

  const resolvedSearchParams = (await searchParams) ?? {};
  const billingSaved = resolvedSearchParams.billing_saved === "1";
  const billingError =
    typeof resolvedSearchParams.billing_error === "string"
      ? resolvedSearchParams.billing_error
      : "";

  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const [
    clubsResult,
    membershipsResult,
    invitesResult,
    sessionsResult,
    billingResult,
    authUsers,
  ] = await Promise.all([
    supabase
      .from("clubs")
      .select("id, display_name, name, created_at")
      .order("created_at", { ascending: true }),

    supabase
      .from("club_memberships")
      .select("id, user_id, club_id, role, created_at")
      .order("created_at", { ascending: true }),

    supabase.from("invites").select("club_id"),

    supabase
      .from("sessions")
      .select("club_id, created_at, date")
      .order("created_at", { ascending: false }),

    adminSupabase
      .from("club_billing")
      .select(
        "club_id, plan_key, status, trial_ends_at, pro_ends_at, billing_note, updated_at"
      ),

    listAllAuthUsers().catch(() => []),
  ]);

  const clubs = clubsResult.error ? [] : ((clubsResult.data ?? []) as ClubRow[]);
  const memberships = membershipsResult.error
    ? []
    : ((membershipsResult.data ?? []) as MembershipRow[]);
  const invites = invitesResult.error ? [] : ((invitesResult.data ?? []) as InviteRow[]);
  const sessions = sessionsResult.error
    ? []
    : ((sessionsResult.data ?? []) as SessionRow[]);
  const billingRows = billingResult.error
    ? []
    : ((billingResult.data ?? []) as BillingRow[]);

  const billingByClub = new Map(
    billingRows.map((billing) => [billing.club_id, billing])
  );

  const emailByUserId = getUserEmailById(authUsers);

  const membersByClub = new Map<string, ClubMemberView[]>();
  for (const membership of memberships) {
    const current = membersByClub.get(membership.club_id) ?? [];
    current.push({
      user_id: membership.user_id,
      email: emailByUserId.get(membership.user_id) ?? membership.user_id,
      role: membership.role,
      created_at: membership.created_at,
    });
    membersByClub.set(membership.club_id, current);
  }

  const inviteCountByClub = new Map<string, number>();
  for (const invite of invites) {
    inviteCountByClub.set(
      invite.club_id,
      (inviteCountByClub.get(invite.club_id) ?? 0) + 1
    );
  }

  const sessionCountByClub = new Map<string, number>();
  const latestSessionCreatedAtByClub = new Map<string, string>();
  const latestSessionDateByClub = new Map<string, string | null>();

  for (const session of sessions) {
    sessionCountByClub.set(
      session.club_id,
      (sessionCountByClub.get(session.club_id) ?? 0) + 1
    );

    if (!latestSessionCreatedAtByClub.has(session.club_id)) {
      latestSessionCreatedAtByClub.set(session.club_id, session.created_at);
      latestSessionDateByClub.set(session.club_id, session.date);
    }
  }

  function getClubLead(clubId: string) {
    const members = [...(membersByClub.get(clubId) ?? [])].sort((a, b) =>
      a.created_at.localeCompare(b.created_at)
    );

    const earliestAdmin = members.find((member) => member.role === "admin");

    return earliestAdmin ?? members[0] ?? null;
  }

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
              <Building2 className="h-6 w-6" strokeWidth={2.1} />
            </div>

            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Power User / Clubs
              </div>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
                Alle Clubs
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Pro Club siehst du hier Admin-Näherung, Mitglieder,
                Einladungen, Trainingsaktivität und den manuellen
                Free-/Pro-Status.
              </p>
            </div>
          </div>

          {billingSaved ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              Billing-Status gespeichert.
            </div>
          ) : null}

          {billingError ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              Billing konnte nicht gespeichert werden: {billingError}
            </div>
          ) : null}
        </div>

        <section className="grid gap-4 xl:grid-cols-2">
          {clubs.length === 0 ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
              Noch keine Clubs vorhanden.
            </div>
          ) : (
            clubs.map((club) => {
              const clubName = getDisplayClubName(club);
              const members = [...(membersByClub.get(club.id) ?? [])].sort((a, b) =>
                a.created_at.localeCompare(b.created_at)
              );
              const lead = getClubLead(club.id);
              const inviteCount = inviteCountByClub.get(club.id) ?? 0;
              const sessionCount = sessionCountByClub.get(club.id) ?? 0;
              const latestSessionCreatedAt =
                latestSessionCreatedAtByClub.get(club.id) ?? null;
              const latestSessionDate = latestSessionDateByClub.get(club.id) ?? null;
              const billing = getEffectiveBilling(billingByClub.get(club.id));
              const billingTone = getBillingTone(billing.plan_key, billing.status);

              return (
                <div
                  key={club.id}
                  className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-950">
                        {clubName}
                      </h2>
                      <div className="mt-1 text-xs text-slate-500">ID: {club.id}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        Angelegt: {formatDateTime(club.created_at)}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-violet-950">
                      <div className="text-xs font-medium uppercase tracking-wide">
                        Lead / Admin-Näherung
                      </div>
                      <div className="mt-1 text-sm font-semibold">
                        {lead ? lead.email : "–"}
                      </div>
                      <div className="mt-1 text-xs">
                        {lead
                          ? `${lead.role} seit ${formatDateTime(lead.created_at)}`
                          : "Keine Membership gefunden"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <Users className="h-4 w-4" />
                        Mitglieder
                      </div>
                      <div className="mt-1 text-lg font-semibold text-slate-950">
                        {members.length}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <Mail className="h-4 w-4" />
                        Einladungen
                      </div>
                      <div className="mt-1 text-lg font-semibold text-slate-950">
                        {inviteCount}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <CalendarDays className="h-4 w-4" />
                        Trainings
                      </div>
                      <div className="mt-1 text-lg font-semibold text-slate-950">
                        {sessionCount}
                      </div>
                    </div>
                  </div>

                  <div className={`mt-5 rounded-2xl border p-4 ${billingTone}`}>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <CreditCard className="h-4 w-4" />
                      Billing / Plan
                    </div>

                    <div className="mt-2 text-sm">
                      Aktuell:{" "}
                      <span className="font-extrabold">
                        {getPlanLabel(billing.plan_key)}
                      </span>{" "}
                      · Status: <span className="font-semibold">{billing.status}</span>
                    </div>

                    <div className="mt-1 text-xs">
                      Trial bis: {formatDateTime(billing.trial_ends_at)} · Pro
                      bis: {formatDateTime(billing.pro_ends_at)}
                    </div>

                    <div className="mt-1 text-xs">
                      Notiz: {billing.billing_note ?? "–"}
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <form method="post" action="/power-user/clubs/billing">
                        <input type="hidden" name="club_id" value={club.id} />
                        <input type="hidden" name="action" value="supercup_trial" />
                        <button
                          type="submit"
                          className="inline-flex w-full items-center justify-center rounded-xl bg-amber-600 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-amber-700"
                        >
                          Supercup bis 31.07.
                        </button>
                      </form>

                      <form method="post" action="/power-user/clubs/billing">
                        <input type="hidden" name="club_id" value={club.id} />
                        <input type="hidden" name="action" value="founder" />
                        <button
                          type="submit"
                          className="inline-flex w-full items-center justify-center rounded-xl bg-violet-700 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-violet-800"
                        >
                          Founder
                        </button>
                      </form>

                      <form method="post" action="/power-user/clubs/billing">
                        <input type="hidden" name="club_id" value={club.id} />
                        <input type="hidden" name="action" value="pro_6_months" />
                        <button
                          type="submit"
                          className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-700 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-800"
                        >
                          Pro 6 Monate
                        </button>
                      </form>

                      <form method="post" action="/power-user/clubs/billing">
                        <input type="hidden" name="club_id" value={club.id} />
                        <input type="hidden" name="action" value="pro_yearly" />
                        <button
                          type="submit"
                          className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-900 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-950"
                        >
                          Pro 12 Monate
                        </button>
                      </form>

                      <form
                        method="post"
                        action="/power-user/clubs/billing"
                        className="sm:col-span-2"
                      >
                        <input type="hidden" name="club_id" value={club.id} />
                        <input type="hidden" name="action" value="free" />
                        <button
                          type="submit"
                          className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                        >
                          Zurück auf Free
                        </button>
                      </form>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                      <Shield className="h-4 w-4" />
                      Letzte Trainingsaktivität
                    </div>

                    <div className="mt-2 text-sm text-slate-700">
                      Letzte Session erstellt: {formatDateTime(latestSessionCreatedAt)}
                    </div>
                    <div className="mt-1 text-sm text-slate-700">
                      Session-Datum: {formatDate(latestSessionDate)}
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-slate-200 p-4">
                    <div className="mb-3 text-sm font-semibold text-slate-950">
                      Mitglieder im Club
                    </div>

                    {members.length === 0 ? (
                      <div className="text-sm text-slate-600">
                        Keine Mitglieder gefunden.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {members.map((member) => (
                          <div
                            key={`${club.id}-${member.user_id}`}
                            className="flex flex-col gap-1 rounded-xl bg-slate-50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <div className="text-sm font-medium text-slate-950">
                                {member.email}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                User ID: {member.user_id}
                              </div>
                            </div>

                            <div className="text-xs text-slate-600 sm:text-right">
                              <div className="font-medium text-slate-900">
                                Rolle: {member.role}
                              </div>
                              <div>seit {formatDateTime(member.created_at)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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