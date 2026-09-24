import Link from "next/link";
import { ArrowRight, Medal, Trophy } from "lucide-react";
import type { TeamFeedItem } from "@/lib/team-feed";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

export default function HomeTeamFeedPreview({
  items,
}: {
  items: TeamFeedItem[];
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-600">
            Team-Feed
          </div>
          <h2 className="mt-0.5 text-lg font-black tracking-tight text-slate-950">
            Neu im Team
          </h2>
        </div>

        <Link
          href="/team-feed"
          className="inline-flex items-center gap-1 text-xs font-black text-slate-500 transition hover:text-slate-950"
        >
          Alle <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {items.length > 0 ? (
        <div className="divide-y divide-slate-100">
          {items.map((item) => {
            const Icon = item.kind === "badge" ? Trophy : Medal;

            return (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50"
              >
                <div
                  className={
                    item.kind === "badge"
                      ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"
                      : "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"
                  }
                >
                  <Icon className="h-4.5 w-4.5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-black text-slate-950">
                    {item.title}
                  </div>
                  <div className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                    {item.body}
                  </div>
                </div>

                <div className="shrink-0 text-[10px] font-bold text-slate-400">
                  {formatDate(item.occurredAt)}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="px-4 pb-4">
          <div className="rounded-2xl bg-slate-50 px-3 py-3 text-xs font-semibold text-slate-500">
            Noch ist es ruhig. Nach den nächsten Trainings passiert hier mehr. ⚽
          </div>
        </div>
      )}
    </section>
  );
}
