"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";

type StatsScope = "season" | "career";

export default function ScopeToggle({
  scope,
  seasonName,
}: {
  scope: StatsScope;
  seasonName: string | null;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();

  function changeScope(nextScope: StatsScope) {
    if (nextScope === scope || isPending) return;
    startTransition(() => router.push(`/stats?scope=${nextScope}`));
  }

  return (
    <div className="w-full rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
        {t("stats.view")}
      </div>
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5">
        <button
          type="button"
          onClick={() => changeScope("season")}
          disabled={isPending}
          aria-pressed={scope === "season"}
          className={`min-h-14 rounded-xl px-3 py-3 text-base font-black transition sm:text-lg ${scope === "season" ? "bg-slate-950 text-white shadow-md" : "text-slate-500 hover:bg-slate-200 hover:text-slate-950"} disabled:cursor-wait disabled:opacity-70`}
        >
          {t("stats.season")}
        </button>
        <button
          type="button"
          onClick={() => changeScope("career")}
          disabled={isPending}
          aria-pressed={scope === "career"}
          className={`min-h-14 rounded-xl px-3 py-3 text-base font-black transition sm:text-lg ${scope === "career" ? "bg-slate-950 text-white shadow-md" : "text-slate-500 hover:bg-slate-200 hover:text-slate-950"} disabled:cursor-wait disabled:opacity-70`}
        >
          {t("stats.career")}
        </button>
      </div>
      <div className="mt-3 min-h-5 text-sm font-semibold text-slate-600">
        {isPending
          ? t("stats.loadingView")
          : scope === "career"
            ? t("stats.allSavedSessions")
            : seasonName
              ? t("stats.activeSeason", { name: seasonName })
              : t("stats.currentSeason")}
      </div>
    </div>
  );
}
