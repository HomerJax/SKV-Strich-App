import Link from "next/link";
import { BarChart3, Globe2, Laptop, MousePointerClick, Smartphone } from "lucide-react";
import { requirePowerUser } from "@/lib/auth/power-user";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  app_env: string | null;
};

type StatCardProps = {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
};

function StatCard({ label, value, description, icon }: StatCardProps) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
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
    </div>
  );
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "–";
  return new Date(value).toLocaleString("de-DE");
}

function formatSource(value: string | null | undefined) {
  if (!value) return "direct";
  return value;
}

function countSince(rows: LandingVisitRow[], date: Date) {
  const minTime = date.getTime();
  return rows.filter((row) => new Date(row.created_at).getTime() >= minTime).length;
}

function getTopCounts(
  rows: LandingVisitRow[],
  getKey: (row: LandingVisitRow) => string | null | undefined,
  fallback = "unbekannt",
  limit = 8
) {
  const counts = new Map<string, number>();

  for (const row of rows) {
    const rawKey = getKey(row);
    const key = rawKey?.trim() || fallback;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "de"))
    .slice(0, limit);
}

function PercentBar({ count, max }: { count: number; max: number }) {
  const width = max > 0 ? Math.max(6, Math.round((count / max) * 100)) : 0;

  return (
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-slate-900"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

function BreakdownCard({
  title,
  items,
}: {
  title: string;
  items: { label: string; count: number }[];
}) {
  const max = Math.max(...items.map((item) => item.count), 0);

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-extrabold tracking-tight text-slate-950">
        {title}
      </h2>

      <div className="mt-4 space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">Noch keine Daten.</p>
        ) : (
          items.map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="truncate font-bold text-slate-800">
                  {item.label}
                </span>
                <span className="font-extrabold text-slate-950">
                  {item.count}
                </span>
              </div>
              <PercentBar count={item.count} max={max} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default async function LandingStatsPage() {
  await requirePowerUser();

  const admin = createAdminClient();
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const { data, error } = await admin
    .from("landing_page_visits")
    .select(
      "id, created_at, path, referrer_host, utm_source, utm_medium, utm_campaign, country_code, device_type, user_agent_family, app_env"
    )
    .order("created_at", { ascending: false })
    .limit(500);

  const rows = error ? [] : ((data ?? []) as LandingVisitRow[]);

  const visitsToday = countSince(rows, todayStart);
  const visits7d = countSince(rows, sevenDaysAgo);
  const visits30d = countSince(rows, thirtyDaysAgo);

  const sourceItems = getTopCounts(rows, (row) => formatSource(row.utm_source));
  const campaignItems = getTopCounts(rows, (row) => row.utm_campaign, "ohne Kampagne");
  const deviceItems = getTopCounts(rows, (row) => row.device_type, "unbekannt");
  const countryItems = getTopCounts(rows, (row) => row.country_code, "unbekannt");
  const browserItems = getTopCounts(rows, (row) => row.user_agent_family, "unbekannt");
  const referrerItems = getTopCounts(rows, (row) => row.referrer_host, "direct");

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link
            href="/power-user"
            className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-900/20"
          >
            ← Zurück zum Power Dashboard
          </Link>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Landing Analytics
              </div>

              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                Wer schaut auf strikr?
              </h1>

              <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                Übersicht über Landingpage-Besuche, Quellen, Kampagnen, Geräte
                und letzte Aufrufe. Ohne IP-Adressen oder personenbezogene
                Besucherprofile.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-slate-950">
              <div className="text-sm font-medium">Datensätze</div>
              <div className="mt-1 text-2xl font-bold">{rows.length}</div>
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-800">
            Landing-Stats konnten nicht geladen werden: {error.message}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Heute"
            value={String(visitsToday)}
            description="Besuche seit Tagesbeginn."
            icon={<MousePointerClick className="h-6 w-6" strokeWidth={2.1} />}
          />

          <StatCard
            label="Letzte 7 Tage"
            value={String(visits7d)}
            description="Kurzfristige Kampagnenwirkung."
            icon={<BarChart3 className="h-6 w-6" strokeWidth={2.1} />}
          />

          <StatCard
            label="Letzte 30 Tage"
            value={String(visits30d)}
            description="Gesamter Marketing-Traffic der letzten Wochen."
            icon={<Globe2 className="h-6 w-6" strokeWidth={2.1} />}
          />

          <StatCard
            label="Mobile"
            value={String(rows.filter((row) => row.device_type === "mobile").length)}
            description="Besuche von Smartphones."
            icon={<Smartphone className="h-6 w-6" strokeWidth={2.1} />}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <BreakdownCard title="Quellen" items={sourceItems} />
          <BreakdownCard title="Kampagnen" items={campaignItems} />
          <BreakdownCard title="Geräte" items={deviceItems} />
          <BreakdownCard title="Länder" items={countryItems} />
          <BreakdownCard title="Browser / App" items={browserItems} />
          <BreakdownCard title="Referrer" items={referrerItems} />
        </div>

        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h2 className="text-lg font-extrabold tracking-tight text-slate-950">
              Letzte Besuche
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Die letzten 50 erfassten Landingpage-Aufrufe.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.16em] text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-bold">Zeit</th>
                  <th className="px-5 py-3 font-bold">Quelle</th>
                  <th className="px-5 py-3 font-bold">Medium</th>
                  <th className="px-5 py-3 font-bold">Kampagne</th>
                  <th className="px-5 py-3 font-bold">Gerät</th>
                  <th className="px-5 py-3 font-bold">Browser/App</th>
                  <th className="px-5 py-3 font-bold">Land</th>
                  <th className="px-5 py-3 font-bold">Pfad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.slice(0, 50).map((row) => (
                  <tr key={row.id} className="align-top">
                    <td className="whitespace-nowrap px-5 py-3 font-semibold text-slate-700">
                      {formatDateTime(row.created_at)}
                    </td>
                    <td className="px-5 py-3 font-bold text-slate-950">
                      {formatSource(row.utm_source)}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {row.utm_medium ?? "–"}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {row.utm_campaign ?? "–"}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {row.device_type ?? "–"}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {row.user_agent_family ?? "–"}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {row.country_code ?? "–"}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {row.path}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
