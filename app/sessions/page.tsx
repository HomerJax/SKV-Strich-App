import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";
import PageHero from "@/components/ui/PageHero";
import SessionTypeBadge from "@/components/sessions/SessionTypeBadge";
import SessionRsvpButtons from "@/components/sessions/SessionRsvpButtons";
import {
  formatDeadlineForDisplay,
  getSessionDeadlineEpochMs,
} from "@/lib/session-rsvp-deadline";

type SessionsPageProps = { searchParams?: Promise<{ success?: string }> };
type Season = { id: number; name: string; start_date: string | null; end_date: string | null };
type SessionType = "training" | "event";
type SessionRow = { id: number; date: string; start_time: string | null; rsvp_deadline_minutes_before: number | null; notes: string | null; season_id: number | null; type: SessionType | null };
type ClubRow = { id: string; display_name: string | null; primary_color: string | null };
type PresenceStatus = "in" | "out" | "open";

function fmtDateDE(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
}
function getTodayIsoDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
function isDateWithinSeason(dateIso: string, season: Season) {
  return !!season.start_date && !!season.end_date && dateIso >= season.start_date && dateIso <= season.end_date;
}
function getCurrentSeason(seasons: Season[]) {
  const today = getTodayIsoDate();
  return seasons.find((season) => isDateWithinSeason(today, season)) ?? seasons[0] ?? null;
}
function sortAscByDate(a: SessionRow, b: SessionRow) { return a.date.localeCompare(b.date); }
function sortDescByDate(a: SessionRow, b: SessionRow) { return b.date.localeCompare(a.date); }

function SessionCard({
  session,
  rsvpStatus,
  allowRsvp = false,
  clubDeadlineMinutes,
  requireAbsenceReason,
  readOnlyRsvp = false,
}: {
  session: SessionRow;
  rsvpStatus?: PresenceStatus;
  allowRsvp?: boolean;
  clubDeadlineMinutes: number;
  requireAbsenceReason: boolean;
  readOnlyRsvp?: boolean;
}) {
  const deadlineEpochMs = getSessionDeadlineEpochMs({
    date: session.date,
    startTime: session.start_time,
    sessionOverrideMinutes: session.rsvp_deadline_minutes_before,
    clubDefaultMinutes: clubDeadlineMinutes,
  });
  const deadlineLabel = formatDeadlineForDisplay(deadlineEpochMs);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <Link href={`/sessions/${session.id}`} className="block transition hover:opacity-75">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xl font-bold tracking-tight text-slate-950">{fmtDateDE(session.date)}</div>
            {session.start_time ? (
              <div className="mt-1 text-xs font-semibold text-slate-500">
                Start {session.start_time.slice(0, 5)} Uhr
                {deadlineLabel ? ` · Anmeldeschluss ${deadlineLabel} Uhr` : ""}
              </div>
            ) : null}
            <div className={`mt-1 text-sm ${session.notes ? "text-slate-500" : "text-slate-400"}`}>
              {session.notes || "Keine Notiz hinterlegt"}
            </div>
          </div>
          <div className="shrink-0"><SessionTypeBadge type={session.type ?? "training"} /></div>
        </div>
      </Link>
      {allowRsvp && rsvpStatus ? (
        <SessionRsvpButtons
          sessionId={session.id}
          initialStatus={rsvpStatus}
          deadlineEpochMs={deadlineEpochMs}
          requireAbsenceReason={requireAbsenceReason}
          readOnly={readOnlyRsvp}
        />
      ) : null}
    </div>
  );
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        {subtitle ? <div className="mt-1 text-sm text-slate-500">{subtitle}</div> : null}
      </div>
      {children}
    </section>
  );
}

export default async function SessionsPage({ searchParams }: SessionsPageProps) {
  const { clubId, player, supportViewPlayer, isSupportView } = await requireClub();
  const viewPlayer = player ?? supportViewPlayer;
  const supabase = await createClient();
  const resolvedSearchParams = await searchParams;
  const successMessage = resolvedSearchParams?.success ?? "";

  const [
    { data: clubData },
    { data: seasonsData, error: seasonsError },
    { data: sessionsData, error: sessionsError },
    { data: rsvpSettingsData, error: rsvpSettingsError },
  ] = await Promise.all([
    supabase.from("clubs").select("id, display_name, primary_color").eq("id", clubId).maybeSingle<ClubRow>(),
    supabase.from("seasons").select("id, name, start_date, end_date").eq("club_id", clubId).order("start_date", { ascending: false }),
    supabase.from("sessions").select("id, date, start_time, rsvp_deadline_minutes_before, notes, season_id, type").eq("club_id", clubId).order("date", { ascending: false }),
    supabase.from("club_settings").select("rsvp_deadline_minutes_before, require_rsvp_reason_on_absence").eq("club_id", clubId).maybeSingle(),
  ]);

  if (seasonsError || sessionsError || rsvpSettingsError) {
    throw new Error(seasonsError?.message ?? sessionsError?.message ?? rsvpSettingsError?.message ?? "Daten konnten nicht geladen werden.");
  }

  const club = (clubData ?? null) as ClubRow | null;
  const seasons = (seasonsData as Season[] | null) ?? [];
  const sessions = (sessionsData as SessionRow[] | null) ?? [];
  const todayIso = getTodayIsoDate();
  const currentSeason = getCurrentSeason(seasons);
  const currentSeasonId = currentSeason?.id ?? null;
  const currentSeasonSessions = sessions.filter((session) => session.season_id === currentSeasonId);
  const withoutSeason = sessions.filter((session) => session.season_id == null).slice().sort(sortDescByDate);
  const futureCurrentSeasonSessions = currentSeasonSessions.filter((session) => session.date >= todayIso).slice().sort(sortAscByDate);
  const pastCurrentSeasonSessions = currentSeasonSessions.filter((session) => session.date < todayIso).slice().sort(sortDescByDate);
  const nextSession = futureCurrentSeasonSessions[0] ?? null;
  const moreUpcomingSessions = futureCurrentSeasonSessions.slice(1);
  const archivedSeasons = seasons.filter((season) => currentSeasonId !== null && season.id !== currentSeasonId);
  const totalSessions = sessions.length;
  const totalTrainings = sessions.filter((session) => session.type !== "event").length;
  const totalEvents = sessions.filter((session) => session.type === "event").length;
  const playerId = viewPlayer?.id ?? null;
  const rsvpSettings = rsvpSettingsData as {
    rsvp_deadline_minutes_before?: number | null;
    require_rsvp_reason_on_absence?: boolean | null;
  } | null;
  const clubDeadlineMinutes =
    rsvpSettings?.rsvp_deadline_minutes_before ?? 60;
  const requireAbsenceReason =
    rsvpSettings?.require_rsvp_reason_on_absence === true;

  const rsvpBySession = new Map<number, PresenceStatus>();
  if (playerId && futureCurrentSeasonSessions.length > 0) {
    const ids = futureCurrentSeasonSessions.map((session) => session.id);
    const { data: rsvps } = await supabase
      .from("session_rsvps")
      .select("session_id, status")
      .eq("club_id", clubId)
      .eq("player_id", playerId)
      .in("session_id", ids);

    for (const row of rsvps ?? []) {
      if (row.status === "in" || row.status === "out" || row.status === "open") {
        rsvpBySession.set(row.session_id, row.status);
      }
    }
  }

  const statusFor = (sessionId: number): PresenceStatus => rsvpBySession.get(sessionId) ?? "open";

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <PageHero eyebrow="Sessions" title="Trainings & Termine" description="Alle anstehenden und vergangenen Einheiten an einem Ort." primaryColorKey={club?.primary_color} backLabel="Zurück" backHref="/" topRightSlot={<Link href="/sessions/new" className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-white/90">+ Neuer Eintrag</Link>} compact />

        {successMessage ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{successMessage}</div> : null}
        {totalSessions > 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
            {totalSessions} {totalSessions === 1 ? "Eintrag" : "Einträge"} gespeichert.
            <span className="ml-2 text-slate-400">· {totalTrainings} {totalTrainings === 1 ? "Training" : "Trainings"}</span>
            <span className="ml-2 text-slate-400">· {totalEvents} {totalEvents === 1 ? "Termin" : "Termine"}</span>
            {currentSeason ? <span className="ml-2 text-slate-400">· Aktive Saison: {currentSeason.name}</span> : null}
          </div>
        ) : null}

        {totalSessions === 0 ? (
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-slate-500">Noch leer</div>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">Ihr habt noch keinen Eintrag erstellt.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Lege jetzt euer erstes Training oder euren ersten Termin an.</p>
            <div className="mt-4 flex gap-2"><Link href="/sessions/new" className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">Ersten Eintrag erstellen</Link></div>
          </div>
        ) : (
          <div className="space-y-5">
            {nextSession ? <SectionCard title="Als Nächstes" subtitle="Hier kannst du direkt zu- oder absagen."><SessionCard session={nextSession} rsvpStatus={statusFor(nextSession.id)} allowRsvp={!!playerId} readOnlyRsvp={isSupportView} clubDeadlineMinutes={clubDeadlineMinutes} requireAbsenceReason={requireAbsenceReason} /></SectionCard> : null}

            <SectionCard title="Kommende Einträge" subtitle={currentSeason ? `Aus der laufenden Saison${currentSeason.name ? ` · ${currentSeason.name}` : ""} · direkt Rückmeldung geben` : "Alle kommenden Einträge"}>
              {moreUpcomingSessions.length > 0 ? <div className="space-y-3">{moreUpcomingSessions.map((session) => <SessionCard key={session.id} session={session} rsvpStatus={statusFor(session.id)} allowRsvp={!!playerId} readOnlyRsvp={isSupportView} clubDeadlineMinutes={clubDeadlineMinutes} requireAbsenceReason={requireAbsenceReason} />)}</div> : futureCurrentSeasonSessions.length > 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">Aktuell gibt es keine weiteren kommenden Einträge außer dem nächsten oben.</div> : <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">Aktuell gibt es keine kommenden Einträge.</div>}
            </SectionCard>

            <details className="group rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
              <summary className="cursor-pointer list-none"><div className="flex items-center justify-between gap-3"><div><div className="text-sm font-semibold text-slate-900">Vergangene Einträge</div><div className="mt-1 text-xs text-slate-500">{currentSeason ? `Aus der aktuellen Saison · ${currentSeason.name}` : "Vergangene Einträge"}</div></div><div className="rounded-full border border-black/10 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">⌄</div></div></summary>
              <div className="mt-4 border-t border-slate-100 pt-4">{pastCurrentSeasonSessions.length > 0 ? <div className="space-y-3">{pastCurrentSeasonSessions.map((session) => <SessionCard key={session.id} session={session} clubDeadlineMinutes={clubDeadlineMinutes} requireAbsenceReason={requireAbsenceReason} />)}</div> : <div className="text-sm text-slate-500">Noch keine vergangenen Einträge.</div>}</div>
            </details>

            {withoutSeason.length > 0 ? <details className="group rounded-[28px] border border-amber-200 bg-amber-50 p-4 shadow-sm"><summary className="cursor-pointer list-none"><div className="text-sm font-semibold text-amber-900">Ohne Saison · {withoutSeason.length}</div></summary><div className="mt-4 space-y-3">{withoutSeason.map((session) => <SessionCard key={session.id} session={session} clubDeadlineMinutes={clubDeadlineMinutes} requireAbsenceReason={requireAbsenceReason} />)}</div></details> : null}

            <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-sm font-semibold text-slate-900">Saison-Archiv</div><div className="mt-1 text-sm text-slate-500">Vergangene, abgeschlossene Saisons separat ansehen.</div></div><Link href="/sessions/archive" className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">Archiv öffnen{archivedSeasons.length > 0 ? ` (${archivedSeasons.length})` : ""}</Link></div></section>
          </div>
        )}
      </section>
    </main>
  );
}
