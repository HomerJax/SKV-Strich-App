import Link from "next/link";
import {
  Award,
  BarChart3,
  Beer,
  Building2,
  CalendarDays,
  CreditCard,
  MailCheck,
  MailOpen,
  Shield,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { BADGE_DEFINITIONS } from "@/lib/badges/catalog";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePowerUser } from "@/lib/auth/power-user";
import { getServerI18n } from "@/lib/i18n/server";
import type { AppLocale } from "@/lib/i18n/config";
import { listAllAuthUsers } from "@/lib/supabase/power-user-admin";

type ClubRow = {
  id: string;
  display_name: string | null;
  name: string | null;
};

type InviteUsageRow = {
  id: string;
  club_id: string;
  role: "admin" | "member";
  created_at: string;
  accepted_at: string | null;
};

type SessionRow = {
  id: number;
  club_id: string;
  created_at: string;
  date: string | null;
  notes: string | null;
};

type KpiCardProps = {
  href: string;
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  detailsLabel: string;
};

function KpiCard({ href, label, value, description, icon, detailsLabel }: KpiCardProps) {
  return (
    <Link
      href={href}
      className="group rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {label}
          </div>
          <div className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">
            {value}
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          {icon}
        </div>
      </div>

      <div className="mt-5 flex items-center text-sm font-medium text-slate-900">
        {detailsLabel}
        <span className="ml-2 transition group-hover:translate-x-1">→</span>
      </div>
    </Link>
  );
}

function formatDateTime(value: string | null | undefined, locale: AppLocale) {
  if (!value) return "–";
  return new Date(value).toLocaleString(locale === "de" ? "de-DE" : "en-GB");
}

function formatDate(value: string | null | undefined, locale: AppLocale) {
  if (!value) return "–";
  return new Date(value).toLocaleDateString(locale === "de" ? "de-DE" : "en-GB");
}

function getSafeCount(
  result:
    | { count: number | null; error: { message: string } | null }
    | undefined
) {
  if (!result || result.error) return 0;
  return result.count ?? 0;
}

export default async function PowerUserPage() {
  await requirePowerUser();
  const { locale, t } = await getServerI18n();
  const detailsLabel = t("power.details");

  const supabase = await createClient();
  const adminSupabase = createAdminClient();
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sevenDaysAgoIso = sevenDaysAgo.toISOString();

  const [
    clubsCountResult,
    acceptedInvitesCountResult,
    openInvitesCountResult,
    sessionsCountResult,
    sessionsLast7DaysCountResult,
    clubsResult,
    latestInviteUsagesResult,
    latestSessionsResult,
    beerConsumptionsResult,
    authUsers,
  ] = await Promise.all([
    supabase.from("clubs").select("id", { count: "exact", head: true }),

    supabase
      .from("invites")
      .select("id", { count: "exact", head: true })
      .not("accepted_at", "is", null),

    supabase
      .from("invites")
      .select("id", { count: "exact", head: true })
      .is("accepted_at", null),

    supabase.from("sessions").select("id", { count: "exact", head: true }),

    supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgoIso),

    supabase
      .from("clubs")
      .select("id, display_name, name")
      .order("display_name", { ascending: true }),

    supabase
      .from("invites")
      .select("id, club_id, role, created_at, accepted_at")
      .not("accepted_at", "is", null)
      .order("accepted_at", { ascending: false })
      .limit(8),

    supabase
      .from("sessions")
      .select("id, club_id, created_at, date, notes")
      .order("created_at", { ascending: false })
      .limit(8),

    adminSupabase
      .from("beer_consumptions")
      .select("quantity,total_cents,club_id,payment_method,payment_status"),

    listAllAuthUsers().catch(() => []),
  ]);

  const clubs = clubsResult.error ? [] : ((clubsResult.data ?? []) as ClubRow[]);

  const clubNameById = new Map(
    clubs.map((club) => [
      club.id,
      club.display_name?.trim() || club.name?.trim() || t("power.unnamedClub"),
    ])
  );

  const latestInviteUsages = latestInviteUsagesResult.error
    ? []
    : ((latestInviteUsagesResult.data ?? []) as InviteUsageRow[]);

  const latestSessions = latestSessionsResult.error
    ? []
    : ((latestSessionsResult.data ?? []) as SessionRow[]);

  const clubsCount = getSafeCount(clubsCountResult);
  const usersCount = authUsers.length;
  const acceptedInvitesCount = getSafeCount(acceptedInvitesCountResult);
  const openInvitesCount = getSafeCount(openInvitesCountResult);
  const sessionsCount = getSafeCount(sessionsCountResult);
  const sessionsLast7DaysCount = getSafeCount(sessionsLast7DaysCountResult);
  const beerRows = beerConsumptionsResult.error
    ? []
    : ((beerConsumptionsResult.data ?? []) as {
        quantity: number;
        total_cents: number;
        club_id: string;
        payment_method: "paypal" | "cash";
        payment_status: "pending" | "paid" | "cancelled";
      }[]);
  const activeBeerRows = beerRows.filter(
    (row) => row.payment_status !== "cancelled",
  );
  const beerCount = activeBeerRows.reduce(
    (sum, row) => sum + (Number(row.quantity) || 0),
    0
  );
  const beerValueCents = activeBeerRows.reduce(
    (sum, row) => sum + (Number(row.total_cents) || 0),
    0
  );
  const paidBeerValueCents = activeBeerRows
    .filter((row) => row.payment_status === "paid")
    .reduce((sum, row) => sum + (Number(row.total_cents) || 0), 0);

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-900/20"
          >
            ← {t("power.adminBack")}
          </Link>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Power User
              </div>

              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                strikr Dashboard
              </h1>

              <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                {t("power.dashboard.description")}
              </p>
            </div>

            <div className="rounded-3xl border border-violet-200 bg-violet-50 px-5 py-4 text-violet-950">
              <div className="text-sm font-medium">{t("power.access")}</div>
              <div className="mt-1 text-2xl font-bold">Power User</div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <KpiCard
            href="/power-user/clubs"
            label={t("power.clubsBilling")}
            value={String(clubsCount)}
            description={t("power.clubsBillingDesc")}
            icon={<CreditCard className="h-6 w-6" strokeWidth={2.1} />}
          />

          <KpiCard
            href="/power-user/clubs/cleanup"
            label={t("power.cleanup")}
            value={t("power.cleanupValue")}
            description={t("power.cleanupDesc")}
            icon={<Trash2 className="h-6 w-6" strokeWidth={2.1} />}
          />

          <KpiCard
            href="/power-user/landing-stats"
            label={t("power.analytics")}
            value="Live"
            description={t("power.analyticsDesc")}
            icon={<BarChart3 className="h-6 w-6" strokeWidth={2.1} />}
          />

          <KpiCard
            href="/power-user/beerkasse"
            label={t("power.beerCaptured")}
            value={`${beerCount} 🍺`}
            description={t("power.beerDesc", { value: (beerValueCents / 100).toLocaleString(locale === "de" ? "de-DE" : "en-GB", { style: "currency", currency: "EUR" }), paid: (paidBeerValueCents / 100).toLocaleString(locale === "de" ? "de-DE" : "en-GB", { style: "currency", currency: "EUR" }) })}
            icon={<Beer className="h-6 w-6" strokeWidth={2.1} />}
          />

          <KpiCard
            href="/power-user/onboarding-simulator"
            label={t("power.onboardingSimulator")}
            value={t("power.start")}
            description={t("power.onboardingDesc")}
            icon={<Sparkles className="h-6 w-6" strokeWidth={2.1} />}
          />

          <KpiCard
            href="/power-user/badges"
            label={t("power.badgeCatalog")}
            value={String(BADGE_DEFINITIONS.length)}
            description={t("power.badgeCatalogDesc")}
            icon={<Award className="h-6 w-6" strokeWidth={2.1} />}
          />

          <KpiCard
            href="/power-user/users"
            label={t("power.usersTotal")}
            value={String(usersCount)}
            description={t("power.usersTotalDesc")}
            icon={<Users className="h-6 w-6" strokeWidth={2.1} />}
          />

          <KpiCard
            href="/power-user/invites?status=accepted"
            label={t("power.invitesAccepted")}
            value={String(acceptedInvitesCount)}
            description={t("power.invitesAcceptedDesc")}
            icon={<MailCheck className="h-6 w-6" strokeWidth={2.1} />}
          />

          <KpiCard
            href="/power-user/invites?status=open"
            label={t("power.invitesOpen")}
            value={String(openInvitesCount)}
            description={t("power.invitesOpenDesc")}
            icon={<MailOpen className="h-6 w-6" strokeWidth={2.1} />}
          />

          <KpiCard
            href="/power-user/sessions"
            label={t("power.sessionsTotal")}
            value={String(sessionsCount)}
            description={t("power.sessionsTotalDesc")}
            icon={<BarChart3 className="h-6 w-6" strokeWidth={2.1} />}
          />

          <KpiCard
            href="/power-user/sessions?range=7d"
            label={t("power.sessions7")}
            value={String(sessionsLast7DaysCount)}
            description={t("power.sessions7Desc")}
            icon={<CalendarDays className="h-6 w-6" strokeWidth={2.1} />}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.05fr,1fr]">
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Registrierungen
                </div>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">
                  Letzte angenommene Einladungen
                </h2>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <Shield className="h-5 w-5" strokeWidth={2.1} />
              </div>
            </div>

            <div className="mt-5">
              {latestInviteUsages.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  Noch keine angenommenen Einladungen.
                </div>
              ) : (
                <div className="space-y-3">
                  {latestInviteUsages.map((invite) => {
                    const clubName =
                      clubNameById.get(invite.club_id) ?? t("power.unknownClub");
                    const roleLabel =
                      invite.role === "admin" ? "Admin" : "Mitglied";

                    return (
                      <div
                        key={invite.id}
                        className="rounded-2xl border border-slate-200 px-4 py-3"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="text-sm font-semibold text-slate-950">
                              {clubName}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              Rolle: {roleLabel}
                            </div>
                          </div>

                          <div className="text-xs text-slate-500">
                            Angenommen: {formatDateTime(invite.accepted_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Aktivität
            </div>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">
              Letzte Trainings
            </h2>

            <div className="mt-5">
              {latestSessions.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  Noch keine Trainings vorhanden.
                </div>
              ) : (
                <div className="space-y-3">
                  {latestSessions.map((session) => {
                    const clubName =
                      clubNameById.get(session.club_id) ?? t("power.unknownClub");

                    return (
                      <div
                        key={String(session.id)}
                        className="rounded-2xl border border-slate-200 px-4 py-3"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="text-sm font-semibold text-slate-950">
                              Training am {formatDate(session.date)}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              Club: {clubName}
                            </div>
                            {session.notes?.trim() ? (
                              <div className="mt-1 text-xs text-slate-500">
                                Notiz: {session.notes.trim()}
                              </div>
                            ) : null}
                          </div>

                          <div className="text-xs text-slate-500">
                            Erstellt: {formatDateTime(session.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Übersicht
              </div>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">
                Clubs & Billing
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Schnellzugriff auf Clubdetails, Mitglieder, Aktivität und
                manuelle Plan-Freischaltung.
              </p>
            </div>

            <Link
              href="/power-user/clubs"
              className="text-sm font-medium text-slate-900 hover:underline"
            >
              Alle Clubs & Billing →
            </Link>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {clubs.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Noch keine Clubs vorhanden.
              </div>
            ) : (
              clubs.map((club) => (
                <Link
                  key={club.id}
                  href="/power-user/clubs"
                  className="rounded-2xl border border-slate-200 px-4 py-3 transition hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-950">
                        {club.display_name?.trim() ||
                          club.name?.trim() ||
                          t("power.unnamedClub")}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        ID: {club.id}
                      </div>
                    </div>

                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                      <Building2 className="h-4 w-4" />
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
