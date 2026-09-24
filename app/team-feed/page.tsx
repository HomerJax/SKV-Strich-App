import Link from "next/link";
import { ArrowLeft, Medal, Trophy } from "lucide-react";
import { requireClub } from "@/lib/auth/guards";
import { getTeamFeedItems } from "@/lib/team-feed";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export default async function TeamFeedPage() {
  const { clubId } = await requireClub();
  const items = await getTeamFeedItems(clubId, 60);

  return (
    <main className="min-h-screen bg-neutral-100 pb-24">
      <section className="mx-auto w-full max-w-3xl px-4 py-4 sm:px-6">
        <Link
          href="/home"
          className="inline-flex items-center gap-2 text-sm font-black text-slate-500 transition hover:text-slate-950"
        >
          <ArrowLeft className="h-4 w-4" />
          Home
        </Link>

        <div className="mt-4 rounded-[30px] bg-slate-950 px-5 py-6 text-white shadow-sm">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-300">
            Team-Feed
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">
            Was bei euch passiert.
          </h1>
          <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-white/55">
            Ergebnisse, Badges und besondere Team-Momente an einem Ort.
          </p>
        </div>

        <section className="mt-3 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
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
                          ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"
                          : "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"
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
                        {formatDate(item.occurredAt)}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="p-5 text-sm font-semibold text-slate-500">
              Noch keine Team-Ereignisse vorhanden.
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
