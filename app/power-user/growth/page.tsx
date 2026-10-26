import Link from "next/link";
import { ArrowLeft, BarChart3, Building2, CalendarCheck, CheckCircle2, MousePointerClick, UserRoundPlus } from "lucide-react";
import { requirePowerUser } from "@/lib/auth/power-user";
import { createAdminClient } from "@/lib/supabase/admin";

type FunnelEvent = {
  event_name: string;
  club_id: string | null;
  occurred_at: string;
};

const periods = [7, 30, 90] as const;
const eventLabels: Record<string, string> = {
  registration_completed: "Registrierungen abgeschlossen",
  club_created: "Vereine angelegt",
  first_training_created: "Erstes Training angelegt",
  first_training_completed: "Erstes Training abgeschlossen",
};

function getRangeStart(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function Kpi({ label, value, icon: Icon }: { label: string; value: number; icon: typeof BarChart3 }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-center justify-between text-sm font-medium text-slate-500"><span>{label}</span><Icon className="h-4 w-4" /></div>
    <div className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{value}</div>
  </div>;
}

export default async function GrowthDashboard({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  await requirePowerUser();
  const params = await searchParams;
  const requestedDays = Number(params.days);
  const days = periods.includes(requestedDays as (typeof periods)[number]) ? requestedDays : 30;
  const start = getRangeStart(days);
  const admin = createAdminClient();

  const [visitsResult, funnelResult] = await Promise.all([
    admin.from("landing_page_visits").select("path, utm_source, referrer_host, created_at").gte("created_at", start),
    admin.from("growth_funnel_events").select("event_name, club_id, occurred_at").gte("occurred_at", start),
  ]);

  const exactCounts = await Promise.all([
    admin.from("landing_page_visits").select("id", { count: "exact", head: true }).gte("created_at", start),
    admin.from("landing_page_visits").select("id", { count: "exact", head: true }).eq("path", "/demo").gte("created_at", start),
    admin.from("landing_page_visits").select("id", { count: "exact", head: true }).in("path", ["/faire-fussballteams", "/training-organisieren", "/mannschaftskasse-app", "/en/faire-fussballteams", "/en/training-organisieren", "/en/mannschaftskasse-app"]).gte("created_at", start),
    admin.from("landing_page_events").select("id", { count: "exact", head: true }).in("event_name", ["landing_signup_cta_click", "seo_signup_click", "demo_signup_after_teams_click", "demo_signup_header_click", "demo_signup_mobile_click"]).gte("created_at", start),
    ...Object.keys(eventLabels).map((name) => admin.from("growth_funnel_events").select("id", { count: "exact", head: true }).eq("event_name", name).gte("occurred_at", start)),
  ]);
  const countAt = (index: number) => exactCounts[index].error ? 0 : exactCounts[index].count ?? 0;

  const visits = visitsResult.error ? [] : visitsResult.data ?? [];
  const events = (funnelResult.error ? [] : funnelResult.data ?? []) as FunnelEvent[];
  const eventCount = (name: string) => countAt(4 + Object.keys(eventLabels).indexOf(name));
  const demoVisits = countAt(1);
  const seoVisits = countAt(2);
  const signupClicks = countAt(3);

  const createdClubIds = events
    .filter((event) => event.event_name === "club_created" && event.club_id)
    .map((event) => event.club_id as string);
  const clubMilestones = createdClubIds.length
    ? await admin.from("growth_funnel_events")
        .select("event_name, club_id")
        .in("club_id", createdClubIds)
    : { data: [], error: null };
  const cohortEvents = (clubMilestones.error ? [] : clubMilestones.data ?? []) as Pick<FunnelEvent, "event_name" | "club_id">[];
  const cohortWith = (eventName: string) => new Set(
    cohortEvents.filter((event) => event.event_name === eventName).map((event) => event.club_id),
  ).size;

  const sources = new Map<string, number>();
  for (const visit of visits) {
    const source = visit.utm_source?.trim() || visit.referrer_host || "Direkt / unbekannt";
    sources.set(source, (sources.get(source) ?? 0) + 1);
  }
  const topSources = [...sources.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
    <Link href="/power-user" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4" /> Admin-Übersicht</Link>
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">Growth</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950">Registrierungs-Funnel</h1><p className="mt-2 text-sm text-slate-600">Erfolgreiche Geschäftsereignisse und aggregierte Marketing-Aufrufe.</p></div>
      <nav aria-label="Zeitraum" className="flex gap-2">{periods.map((period) => <Link key={period} href={`/power-user/growth?days=${period}`} aria-current={days === period ? "page" : undefined} className={`rounded-xl px-3 py-2 text-sm font-semibold ${days === period ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>{period} Tage</Link>)}</nav>
    </header>

    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Kpi label="Website-Besuche*" value={countAt(0)} icon={BarChart3} />
      <Kpi label="SEO-Seiten-Aufrufe*" value={seoVisits} icon={BarChart3} />
      <Kpi label="Demo-Aufrufe*" value={demoVisits} icon={MousePointerClick} />
      <Kpi label="Registrierungs-Klicks*" value={signupClicks} icon={MousePointerClick} />
      <Kpi label="Registrierungen" value={eventCount("registration_completed")} icon={UserRoundPlus} />
      <Kpi label="Neu angelegte Vereine" value={eventCount("club_created")} icon={Building2} />
      <Kpi label="Erstes Training angelegt" value={eventCount("first_training_created")} icon={CalendarCheck} />
      <Kpi label="Erstes Training abgeschlossen" value={eventCount("first_training_completed")} icon={CheckCircle2} />
    </section>

    <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold text-slate-950">Vereinskohorte</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">Anteil der in diesem Zeitraum neu angelegten Vereine mit erreichtem Meilenstein (gleiche Vereins-ID, bis jetzt).</p>
        <div className="mt-4 space-y-3">{[
          ["Erstes Training angelegt", cohortWith("first_training_created")],
          ["Erstes Training abgeschlossen", cohortWith("first_training_completed")],
        ].map(([label, count]) => <div key={label} className="flex items-center justify-between border-b border-slate-100 pb-3 text-sm"><span className="text-slate-700">{label}</span><strong className="text-slate-950">{Number(count)} / {createdClubIds.length} ({createdClubIds.length ? Math.round(Number(count) / createdClubIds.length * 100) : 0}%)</strong></div>)}</div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold text-slate-950">Herkunft der Website-Aufrufe*</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">UTM-Quelle oder Referrer-Domain; keine Verknüpfung mit Accounts oder Vereinen.</p>
        <div className="mt-4 space-y-2">{topSources.length ? topSources.map(([source, count]) => <div key={source} className="flex justify-between gap-3 text-sm"><span className="truncate text-slate-700">{source}</span><strong>{count}</strong></div>) : <p className="text-sm text-slate-500">Noch keine Besuche im Zeitraum.</p>}</div>
      </div>
    </section>

    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
      <strong>Messgrenzen:</strong> *Website-Aufrufe werden pro Pfad, Tab und Kalendertag per sessionStorage begrenzt, sind aber keine eindeutigen Personen. Klicks, Seitenaufrufe und Conversions haben deshalb unterschiedliche Zähleinheiten; dafür wird keine irreführende Klick-zu-Registrierung-Rate berechnet. Registrierungen werden aus Datenschutzgründen nicht einer Quelle oder einem Verein zugeordnet. Vereinsraten vergleichen nur dieselben neuen Vereins-IDs und erfassen Folgeschritte bis heute. Tracking-Ausfälle bleiben möglich, weil Conversion-Schreibvorgänge best effort sind.
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="font-bold text-slate-950">Serverseitige Erfolgsereignisse · letzte {days} Tage</h2>
      <div className="mt-3 divide-y divide-slate-100">{Object.entries(eventLabels).map(([name, label]) => <div key={name} className="flex justify-between py-2.5 text-sm"><span>{label}</span><strong>{eventCount(name)}</strong></div>)}</div>
      {(visitsResult.error || funnelResult.error || exactCounts.some((result) => result.error)) && <p className="mt-3 text-xs text-rose-700">Mindestens eine Datenquelle war nicht erreichbar; fehlgeschlagene Quellen wurden als 0 angezeigt.</p>}
    </section>
  </main>;
}
