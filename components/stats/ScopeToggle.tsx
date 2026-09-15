"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

type StatsScope = "season" | "career";

export default function ScopeToggle({
  scope,
  seasonName,
}: {
  scope: StatsScope;
  seasonName: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function changeScope(nextScope: StatsScope) {
    if (nextScope === scope || isPending) return;
    startTransition(() => router.push(`/stats?scope=${nextScope}`));
  }

  return (
    <div className="min-w-[220px] rounded-2xl border border-white/20 bg-black/15 p-1.5 shadow-inner backdrop-blur">
      <div className="mb-1 px-1 text-[9px] font-black uppercase tracking-[0.18em] text-white/60">
        Ansicht
      </div>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-black/15 p-1">
        <button
          type="button"
          onClick={() => changeScope("season")}
          disabled={isPending}
          aria-pressed={scope === "season"}
          className={`rounded-lg px-3 py-2 text-xs font-black transition ${scope === "season" ? "bg-white text-slate-950 shadow-sm" : "text-white/80 hover:bg-white/10 hover:text-white"} disabled:cursor-wait disabled:opacity-70`}
        >
          Saison
        </button>
        <button
          type="button"
          onClick={() => changeScope("career")}
          disabled={isPending}
          aria-pressed={scope === "career"}
          className={`rounded-lg px-3 py-2 text-xs font-black transition ${scope === "career" ? "bg-white text-slate-950 shadow-sm" : "text-white/80 hover:bg-white/10 hover:text-white"} disabled:cursor-wait disabled:opacity-70`}
        >
          Karriere
        </button>
      </div>
      <div className="mt-1 min-h-4 px-1 text-[10px] font-semibold text-white/65">
        {isPending ? "Lädt Ansicht…" : scope === "career" ? "Alle gespeicherten Sessions" : seasonName ? `Aktiv: ${seasonName}` : "Aktuelle Saison"}
      </div>
    </div>
  );
}
