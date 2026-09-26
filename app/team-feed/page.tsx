import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Medal, Trophy } from "lucide-react";
import { requireClub } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { getTeamFeedItems } from "@/lib/team-feed";
import { getServerI18n } from "@/lib/i18n/server";
import type { AppLocale } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatDate(value: string, locale: AppLocale) {
  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    timeZone: "Europe/Berlin",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export default async function TeamFeedPage() {
  const { locale, t } = await getServerI18n();
  const { clubId } = await requireClub();
  const supabase = await createClient();

  const { data: settings } = await supabase
    .from("club_settings")
    .select("home_team_feed_enabled")
    .eq("club_id", clubId)
    .maybeSingle<{ home_team_feed_enabled: boolean | null }>();

  if (settings?.home_team_feed_enabled !== true) {
    redirect("/home");
  }

  const items = await getTeamFeedItems(clubId, 60);

  return (
    <main className="min-h-screen bg-neutral-100 pb-24">
      <section className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6">
        <Link
          href="/home"
          className="inline-flex items-center gap-2 text-sm font-black text-slate-500 transition hover:text-slate-950"
        >
          <ArrowLeft className="h-4 w-4" />
          Home
        </Link>

        <div className="mt-4">
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
            {t("teamFeed.eyebrow")}
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
            {t("teamFeed.pageTitle")}
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {t("teamFeed.description")}
          </p>
        </div>

        <section className="mt-4 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
          {items.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {items.map((item) => {
                const Icon = item.kind === "badge" ? Trophy : Medal;

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex gap-3 px-4 py-4 transition hover:bg-slate-50"
                  >
                    <div
                      className={
                        item.kind === "badge"
                          ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600"
                          : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"
                      }
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-black text-slate-950">
                        {item.title}
                      </div>
                      <div className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                        {item.body}
                      </div>
                      <div className="mt-1.5 text-[10px] font-bold text-slate-400">
                        {formatDate(item.occurredAt, locale)}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="p-5 text-sm font-semibold text-slate-500">
              {t("teamFeed.empty")}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
