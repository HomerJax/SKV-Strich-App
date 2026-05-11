import Link from "next/link";
import {
  Building2,
  CalendarDays,
  ChevronDown,
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

type ClubView = {
  club: ClubRow;
  clubName: string;
  members: ClubMemberView[];
  lead: ClubMemberView | null;
  inviteCount: number;
  sessionCount: number;
  latestSessionCreatedAt: string | null;
  latestSessionDate: string | null;
  billing: BillingRow;
  isActive: boolean;
  activityScore: number;
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

function getPlanBadgeTone(planKey: string, status: string) {
  if (status !== "active") {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }

  if (planKey === "free") {
    return "border-slate-200 bg-white text-slate-600";
  }

  if (planKey === "supercup_trial") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (planKey === "founder") {
    return "border-violet-200 bg-violet-50 text-violet-800";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

function getEffectiveBilling(billing: BillingRow | null | undefined): BillingRow {
  return {
    club_id: billing?.club_id ?? "",
    plan_key: billing?.plan_key ?? "free",
    status: billing?.status ?? "active",
    trial_ends_at: billing?.trial_ends_at ?? null,
    pro_ends_at: billing?.pro_ends_at ?? null,
    billing_note:
      billing?.billing_note ?? "Fallback: kein Billing-Eintrag vorhanden.",
    updated_at: billing?.updated_at ?? null,
  };
}

function isRecentlyActive(dateValue: string | null) {
  if (!dateValue) return false;

  const date = new Date(dateValue);
  const now = new Date();
  const daysDiff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);

  return daysDiff <= 45;
}

function getActivityLabel(view: ClubView) {
  if (view.sessionCount > 0 && isRecentlyActive(view.latestSessionCreatedAt)) {
    return "aktiv";
  }

  if (view.sessionCount > 0) {
    return "genutzt";
  }

  if (view.members.length > 1 || view.inviteCount > 0) {
    return "eingerichtet";
  }

  return "test/leer";
}

function getActivityTone(view: ClubView) {
  const label = getActivityLabel(view);

  if (label === "aktiv") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (label === "genutzt") {
    return "border-blue-200 bg-blue-50 text-blue-800";
  }

  if (label === "eingerichtet") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-500";
}

function sortClubViews(a: ClubView, b: ClubView) {
  if (b.activityScore !== a.activityScore) {
    return b.activityScore - a.activityScore;
  }

  const latestA = a.latestSessionCreatedAt
    ? new Date(a.latestSessionCreatedAt).getTime()
    : 0;
  const latestB = b.latestSessionCreatedAt
    ? new Date(b.latestSessionCreatedAt).getTime()
    : 0;

  if (latestB !== latestA) {
    return latestB - latestA;
  }

  return a.clubName.localeCompare(b.clubName, "de");
}

function BillingActions({ clubId }: { clubId: string }) {
  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      <form method="post" action="/power-user/clubs/billing">
        <input type="hidden" name="club_id" value={clubId} />
        <input type="hidden" name="action" value="supercup_trial" />
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center rounded-xl bg-amber-600 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-amber-700"
        >
          Supercup bis 31.07.
        </button>
      </form>

      <form method="post" action="/power-user/clubs/billing">
        <input type="hidden" name="club_id" value={clubId} />
        <input type="hidden" name="action" value="founder" />
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center rounded-xl bg-violet-700 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-violet-800"
        >
          Founder
        </button>
      </form>

      <form method="post" action="/power-user/clubs/billing">
        <input type="hidden" name="club_id" value={clubId} />
        <input type="hidden" name="action" value="pro_6_months" />
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-700 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-800"
        >
          Pro 6 Monate
        </button>
      </form>

      <form method="post" action="/power-user/clubs/billing">
        <input type="hidden" name="club_id" value={clubId} />
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
        <input type="hidden" name="club_id" value={clubId} />
        <input type="hidden" name="action" value="free" />
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
        >
          Zurück auf Free
        </button>
      </form>
    </div>
  );
}

function ClubDetailsCard({ view }: { view: ClubView }) {
  const billingTone = getBillingTone(view.billing.plan_key, view.billing.status);

  return (
    <details className="group rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-slate-950">
              {view.clubName}
            </h2>

            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${getActivityTone(
                view
              )}`}
            >
              {getActivityLabel(view)}
            </span>

            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${getPlanBadgeTone(
                view.billing.plan_key,
                view.billing.status
              )}`}
            >
              {getPlanLabel(view.billing.plan_key)}
            </span>
          </div>

          <div className="mt-1 text-xs text-slate-500">ID: {view.club.id}</div>
          <div className="mt-1 text-xs text-slate-500">
            Angelegt: {formatDateTime(view.club.created_at)}
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 px-3 py-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Users className="h-3.5 w-3.5" />
                Mitglieder
              </div>
              <div className="mt-1 text-base font-bold text-slate-950">
                {view.members.length}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 px-3 py-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Mail className="h-3.5 w-3.5" />
                Einladungen
              </div>
              <div className="mt-1 text-base font-bold text-slate-950">
                {view.inviteCount}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 px-3 py-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <CalendarDays className="h-3.5 w-3.5" />
                Trainings
              </div>
              <div className="mt-1 text-base font-bold text-slate-950">
                {view.sessionCount}
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-start gap-3">
          <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-violet-950">
            <div className="text-xs font-medium uppercase tracking-wide">
              Lead
            </div>
            <div className="mt-1 max-w-[15rem] truncate text-sm font-semibold">
              {view.lead ? view.lead.email : "–"}
            </div>
            <div className="mt-1 text-xs">
              {view.lead
                ? `${view.lead.role} seit ${formatDateTime(view.lead.created_at)}`
                : "Keine Membership gefunden"}
            </div>
          </div>

          <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition group-open:rotate-180">
            <ChevronDown className="h-5 w-5" />
          </div>
        </div>
      </summary>

      <div className="space-y-5 border-t border-slate-100 px-5 pb-5 pt-0">
        <div className={`rounded-2xl border p-4 ${billingTone}`}>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <CreditCard className="h-4 w-4" />
            Billing / Plan
          </div>

          <div className="mt-2 text-sm">
            Aktuell:{" "}
            <span className="font-extrabold">
              {getPlanLabel(view.billing.plan_key)}
            </span>{" "}
            · Status:{" "}
            <span className="font-semibold">{view.billing.status}</span>
          </div>

          <div className="mt-1 text-xs">
            Trial bis: {formatDateTime(view.billing.trial_ends_at)} · Pro bis:{" "}
            {formatDateTime(view.billing.pro_ends_at)}
          </div>

          <div className="mt-1 text-xs">
            Notiz: {view.billing.billing_note ?? "–"}
          </div>

          <BillingActions clubId={view.club.id} />
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
            <Shield className="h-4 w-4" />
            Letzte Trainingsaktivität
          </div>

          <div className="mt-2 text-sm text-slate-700">
            Letzte Session erstellt: {formatDateTime(view.latestSessionCreatedAt)}
          </div>
          <div className="mt-1 text-sm text-slate-700">
            Session-Datum: {formatDate(view.latestSessionDate)}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="mb-3 text-sm font-semibold text-slate-950">
            Mitglieder im Club
          </div>

          {view.members.length === 0 ? (
            <div className="text-sm text-slate-600">
              Keine Mitglieder gefunden.
            </div>
          ) : (
            <div className="space-y-2">
              {view.members.map((member) => (
                <div
                  key={`${view.club.id}-${member.user_id}`}
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
    </details>
  );
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

  const clubViews: ClubView[] = clubs
    .map((club) => {
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

      const hasRecentSession = isRecentlyActive(latestSessionCreatedAt);
      const isPaid =
        billing.status === "active" && billing.plan_key !== "free";
      const isActive =
        isPaid || hasRecentSession || sessionCount >= 3 || members.length >= 3;

      const activityScore =
        (isPaid ? 10000 : 0) +
        (hasRecentSession ? 5000 : 0) +
        sessionCount * 100 +
        members.length * 20 +
        inviteCount * 5;

      return {
        club,
        clubName,
        members,
        lead,
        inviteCount,
        sessionCount,
        latestSessionCreatedAt,
        latestSessionDate,
        billing,
        isActive,
        activityScore,
      };
    })
    .sort(sortClubViews);

  const activeClubViews = clubViews.filter((view) => view.isActive);
  const inactiveClubViews = clubViews.filter((view) => !view.isActive);

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
                Power User / Clubs & Billing
              </div>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
                Clubs verwalten
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Aktive, genutzte oder bezahlte Clubs stehen oben. Testclubs und
                leere Clubs bleiben weiter unten. Jeder Club ist einklappbar.
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

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Clubs gesamt
              </div>
              <div className="mt-1 text-2xl font-black text-slate-950">
                {clubViews.length}
              </div>
            </div>

            <div className="rounded-2xl bg-emerald-50 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Aktiv / genutzt
              </div>
              <div className="mt-1 text-2xl font-black text-emerald-950">
                {activeClubViews.length}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Test / leer
              </div>
              <div className="mt-1 text-2xl font-black text-slate-950">
                {inactiveClubViews.length}
              </div>
            </div>
          </div>
        </div>

        <section className="space-y-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Aktiv / genutzt / bezahlt
            </div>
          </div>

          {activeClubViews.length === 0 ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
              Noch keine aktiven Clubs erkannt.
            </div>
          ) : (
            activeClubViews.map((view) => (
              <ClubDetailsCard key={view.club.id} view={view} />
            ))
          )}
        </section>

        <section className="space-y-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Testclubs / leer / wenig genutzt
            </div>
          </div>

          {inactiveClubViews.length === 0 ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
              Keine leeren Testclubs vorhanden.
            </div>
          ) : (
            inactiveClubViews.map((view) => (
              <ClubDetailsCard key={view.club.id} view={view} />
            ))
          )}
        </section>
      </section>
    </main>
  );
}