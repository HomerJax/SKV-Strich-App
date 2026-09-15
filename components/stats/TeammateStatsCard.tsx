"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Entry = { playerId: number; name: string; value: number };
type Data = { played: Entry[]; wins: Entry[]; losses: Entry[] };

function Ranking({ title, emoji, entries, suffix }: { title: string; emoji: string; entries: Entry[]; suffix: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{emoji} {title}</div>
      <div className="mt-3 space-y-2">
        {entries.length > 0 ? entries.map((entry, index) => (
          <div key={entry.playerId} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 shadow-sm">
            <div className="min-w-0 text-sm font-bold text-slate-900"><span className="mr-2 text-slate-400">#{index + 1}</span>{entry.name}</div>
            <div className="shrink-0 text-xs font-black text-slate-600">{entry.value} {suffix}</div>
          </div>
        )) : <div className="text-xs font-semibold text-slate-400">Noch keine Daten.</div>}
      </div>
    </div>
  );
}

export default function TeammateStatsCard() {
  const searchParams = useSearchParams();
  const scope = searchParams.get("scope") === "career" ? "career" : "season";
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/stats/teammates?scope=${scope}`, { signal: controller.signal, cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("stats")))
      .then((nextData: Data) => setData(nextData))
      .catch((error) => { if (error?.name !== "AbortError") setData({ played: [], wins: [], losses: [] }); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [scope]);

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-5 sm:px-6 lg:px-8">
      <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-black text-slate-950">Meine Mitspieler</div>
        <div className="mt-1 text-xs font-semibold text-slate-500">Top 3 · {scope === "career" ? "Karriere" : "aktuelle Saison"}</div>
        {loading ? (
          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-500">Mitspieler-Stats werden geladen…</div>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Ranking title="Am meisten zusammen" emoji="🤝" entries={data?.played ?? []} suffix="Spiele" />
            <Ranking title="Am meisten gewonnen" emoji="🏆" entries={data?.wins ?? []} suffix="Siege" />
            <Ranking title="Am meisten verloren" emoji="😬" entries={data?.losses ?? []} suffix="Niederlagen" />
          </div>
        )}
      </div>
    </section>
  );
}
