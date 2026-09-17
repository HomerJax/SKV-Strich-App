import Link from "next/link";
import {
  Activity,
  BarChart3,
  Globe2,
  LogIn,
  MousePointerClick,
  Radio,
  Smartphone,
  UserPlus,
  Users,
} from "lucide-react";
import { requirePowerUser } from "@/lib/auth/power-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { listAllAuthUsers } from "@/lib/supabase/power-user-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RangeKey = "today" | "7d" | "30d" | "90d" | "all";

type LandingVisitRow = {
  id: number;
  created_at: string;
  path: string;
  referrer_host: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  country_code: string | null;
  device_type: string | null;
  user_agent_family: string | null;
};

type LandingEventRow = {
  id: number;
  created_at: string;
  event_name: string;
  path: string;
  referrer_host: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  country_code: string | null;
  device_type: string | null;
  user_agent_family: string | null;
};

type PresenceRow = {
  user_id: string;
  club_id: string | null;
  path: string | null;
  last_seen_at: string;
};

type PlayerRow = {
  id: number;
  user_id: string | null;
  club_id: string | null;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
};

type ClubRow = {
  id: string;
  display_name: string | null;
  name: string | null;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "–";
  return new Date(value).toLocaleString("de-DE");
}

function getRange(value: string | undefined): RangeKey {
  if (value === "today" || value === "7d" || value === "90d" || value === "all") {
    return value;
  }
  return "30d";
}

function getRangeStart(range: RangeKey) {
  const now = new Date();
  if (range === "all") return null;
  if (range === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function rangeLabel(range: RangeKey) {
  if (range === "today") return "Heute";
  if (range === "7d") return "7 Tage";
  if (range === "90d") return "90 Tage";
  if (range === "all") return "Gesamt";
  return "30 Tage";
}

function countEvent(rows: LandingEventRow[], eventName: string) {
  return rows.filter((row) => row.event_name === eventName).length;
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "0%";
  return `${value.toFixed(value >= 10 ? 0 : 1)}%`;
}

function getTopCounts<T>(
  rows: T[],
  getKey: (row: T) => string | null | undefined,
  fallback = "unbekannt",
  limit = 8
) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = getKey(row)?.trim() || fallback;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "de"))
    .slice(0, limit);
}

function getDailyCounts(rows: LandingVisitRow[], limit = 30) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = new Date(row.created_at).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
    });
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].slice(0, limit).reverse().map(([label, count]) => ({ label, count }));
}

function MetricCard({ label, value, hint, icon }: { label: string; value: string; hint: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</div>
          <div className="mt-2 text-3xl font-black text-slate-950">{value}</div>
          <div className="mt-1 text-xs leading-5 text-slate-500">{hint}</div>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">{icon}</div>
      </div>
    </div>
  );
}

function BreakdownCard({ title, items }: { title: string; items: { label: string; count: number }[] }) {
  const max = Math.max(...items.map((item) => item.count), 0);
  return (
    <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-black text-slate-950">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? <div className="text-sm text-slate-500">Noch keine Daten.</div> : items.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate font-semibold text-slate-700">{item.label}</span>
              <b>{item.count}</b>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-slate-900" style={{ width: `${max ? Math.max(5, Math.round((item.count / max) * 100)) : 0}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function LandingStatsPage({ searchParams }: { searchParams?: Promise<{ range?: string }> }) {
  await requirePowerUser();
  const params = (await searchParams) ?? {};
  const range = getRange(params.range);
  const rangeStart = getRangeStart(range);
  const admin = createAdminClient();
  const now = new Date();
  const onlineSince = new Date(now.getTime() - 2 * 60 * 1000).toISOString();
  const active24hSince = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  let visitsQuery = admin
    .from("landing_page_visits")
    .select("id, created_at, path, referrer_host, utm_source, utm_medium, utm_campaign, country_code, device_type, user_agent_family")
    .order("created_at", { ascending: false })
    .limit(5000);

  let eventsQuery = admin
    .from("landing_page_events")
    .select("id, created_at, event_name, path, referrer_host, utm_source, utm_medium, utm_campaign, country_code, device_type, user_agent_family")
    .order("created_at", { ascending: false })
    .limit(5000);

  if (rangeStart) {
    visitsQuery = visitsQuery.gte("created_at", rangeStart.toISOString());
    eventsQuery = eventsQuery.gte("created_at", rangeStart.toISOString());
  }

  const [visitsResult, eventsResult, onlineResult, active24hResult, clubsResult, authUsers] = await Promise.all([
    visitsQuery,
    eventsQuery,
    admin.from("app_user_presence").select("user_id, club_id, path, last_seen_at").gte("last_seen_at", onlineSince).order("last_seen_at", { ascending: false }),
    admin.from("app_user_presence").select("user_id", { count: "exact", head: true }).gte("last_seen_at", active24hSince),
    admin.from("clubs").select("id, display_name, name").is("deleted_at", null),
    listAllAuthUsers().catch(() => []),
  ]);

  const visits = visitsResult.error ? [] : (visitsResult.data ?? []) as LandingVisitRow[];
  const events = eventsResult.error ? [] : (eventsResult.data ?? []) as LandingEventRow[];
  const online = onlineResult.error ? [] : (onlineResult.data ?? []) as PresenceRow[];
  const clubs = clubsResult.error ? [] : (clubsResult.data ?? []) as ClubRow[];
  const clubNameById = new Map(clubs.map((club) => [club.id, club.display_name?.trim() || club.name?.trim() || "Unbenannter Club"]));
  const emailByUserId = new Map(authUsers.map((user) => [user.id, user.email?.trim() || user.id]));
  const onlineIds = online.map((row) => row.user_id);

  const playersResult = onlineIds.length > 0
    ? await admin.from("players").select("id, user_id, club_id, first_name, last_name, nickname").in("user_id", onlineIds).eq("is_guest", false)
    : { data: [], error: null };
  const players = playersResult.error ? [] : (playersResult.data ?? []) as PlayerRow[];

  function onlineName(row: PresenceRow) {
    const player = players.find((entry) => entry.user_id === row.user_id && (!row.club_id || entry.club_id === row.club_id))
      ?? players.find((entry) => entry.user_id === row.user_id);
    if (player) {
      const name = player.nickname?.trim() || [player.first_name, player.last_name].filter(Boolean).join(" ").trim();
      if (name) return name;
    }
    return emailByUserId.get(row.user_id) ?? row.user_id;
  }

  const signupClicks = countEvent(events, "landing_signup_cta_click");
  const loginClicks = countEvent(events, "landing_login_click");
  const signupRate = visits.length > 0 ? (signupClicks / visits.length) * 100 : 0;
  const mobileVisits = visits.filter((row) => row.device_type === "mobile").length;
  const sourceItems = getTopCounts(visits, (row) => row.utm_source, "direct");
  const campaignItems = getTopCounts(visits, (row) => row.utm_campaign, "ohne Kampagne");
  const deviceItems = getTopCounts(visits, (row) => row.device_type, "unbekannt");
  const referrerItems = getTopCounts(visits, (row) => row.referrer_host, "direct");
  const eventItems = getTopCounts(events, (row) => row.event_name, "unbekannt");
  const dailyItems = getDailyCounts(visits, 30);

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <div><Link href="/power-user" className="inline-flex rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold">← Power User Dashboard</Link></div>

        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Traffic & Live</div>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Was passiert gerade in strikr?</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Landingpage-Traffic, Kampagnen, CTA-Klicks und echte Online-Aktivität der eingeloggten Nutzer.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["today", "7d", "30d", "90d", "all"] as RangeKey[]).map((item) => (
                <Link key={item} href={`/power-user/landing-stats?range=${item}`} className={`rounded-full px-3 py-2 text-xs font-bold ${range === item ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>{rangeLabel(item)}</Link>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label={`Visits · ${rangeLabel(range)}`} value={String(visits.length)} hint="Erfasste Landingpage-Aufrufe im gewählten Zeitraum." icon={<MousePointerClick className="h-5 w-5" />} />
          <MetricCard label="Online jetzt" value={String(online.length)} hint="Heartbeat innerhalb der letzten 2 Minuten." icon={<Radio className="h-5 w-5" />} />
          <MetricCard label="Aktiv letzte 24h" value={String(active24hResult.count ?? 0)} hint="Eingeloggte Nutzer mit App-Aktivität." icon={<Activity className="h-5 w-5" />} />
          <MetricCard label="Signup-Rate" value={formatPercent(signupRate)} hint={`${signupClicks} Signup-Klicks bei ${visits.length} Visits.`} icon={<UserPlus className="h-5 w-5" />} />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Signup-Klicks" value={String(signupClicks)} hint="Klicks auf Team starten / Registrierung." icon={<UserPlus className="h-5 w-5" />} />
          <MetricCard label="Login-Klicks" value={String(loginClicks)} hint="Klicks auf Login von der Landingpage." icon={<LogIn className="h-5 w-5" />} />
          <MetricCard label="Mobile Visits" value={String(mobileVisits)} hint="Landingpage-Aufrufe von Smartphones." icon={<Smartphone className="h-5 w-5" />} />
          <MetricCard label="Events" value={String(events.length)} hint="Erfasste CTA- und Landingpage-Events." icon={<BarChart3 className="h-5 w-5" />} />
        </div>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4"><div><div className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-600">Live</div><h2 className="mt-1 text-xl font-black">Gerade in strikr online</h2></div><Users className="h-6 w-6 text-slate-400" /></div>
          <div className="mt-4 overflow-x-auto">
            {online.length === 0 ? <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Aktuell niemand erkannt. Die Anzeige füllt sich ab jetzt mit dem neuen Heartbeat.</div> : (
              <table className="min-w-full text-left text-sm">
                <thead className="text-[11px] uppercase tracking-wide text-slate-400"><tr><th className="py-2 pr-4">Wer</th><th className="py-2 pr-4">Club</th><th className="py-2 pr-4">Seite</th><th className="py-2">Zuletzt</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{online.map((row) => <tr key={row.user_id}><td className="py-3 pr-4 font-bold">{onlineName(row)}<div className="text-[11px] font-normal text-slate-400">{emailByUserId.get(row.user_id) ?? ""}</div></td><td className="py-3 pr-4">{row.club_id ? clubNameById.get(row.club_id) ?? row.club_id : "–"}</td><td className="py-3 pr-4 font-mono text-xs text-slate-500">{row.path ?? "–"}</td><td className="py-3 whitespace-nowrap">{formatDateTime(row.last_seen_at)}</td></tr>)}</tbody>
              </table>
            )}
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <BreakdownCard title="Quellen" items={sourceItems} />
          <BreakdownCard title="Kampagnen" items={campaignItems} />
          <BreakdownCard title="Geräte" items={deviceItems} />
          <BreakdownCard title="Referrer" items={referrerItems} />
          <BreakdownCard title="CTA Events" items={eventItems} />
          <BreakdownCard title="Visits pro Tag" items={dailyItems} />
        </div>

        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5"><div className="flex items-center gap-2"><Globe2 className="h-5 w-5 text-slate-400" /><h2 className="text-lg font-black">Letzte Landingpage-Besuche</h2></div></div>
          <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400"><tr><th className="px-5 py-3">Zeit</th><th className="px-5 py-3">Quelle</th><th className="px-5 py-3">Kampagne</th><th className="px-5 py-3">Referrer</th><th className="px-5 py-3">Gerät</th><th className="px-5 py-3">Land</th></tr></thead><tbody className="divide-y divide-slate-100">{visits.slice(0, 40).map((visit) => <tr key={visit.id}><td className="whitespace-nowrap px-5 py-3 font-semibold">{formatDateTime(visit.created_at)}</td><td className="px-5 py-3">{visit.utm_source || "direct"}</td><td className="px-5 py-3">{visit.utm_campaign || "–"}</td><td className="px-5 py-3">{visit.referrer_host || "direct"}</td><td className="px-5 py-3">{visit.device_type || "–"}</td><td className="px-5 py-3">{visit.country_code || "–"}</td></tr>)}</tbody></table></div>
        </section>
      </section>
    </main>
  );
}
