import Link from "next/link";

type StatsScope = "season" | "career";

export default function ScopeToggle({
  scope,
  seasonName,
}: {
  scope: StatsScope;
  seasonName: string | null;
}) {
  return (
    <div className="inline-flex rounded-xl bg-white/10 p-1 backdrop-blur">
      <Link
        href="/stats?scope=season"
        aria-current={scope === "season" ? "page" : undefined}
        className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
          scope === "season"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-white/75 hover:text-white"
        }`}
      >
        {seasonName ? `Saison · ${seasonName}` : "Saison"}
      </Link>

      <Link
        href="/stats?scope=career"
        aria-current={scope === "career" ? "page" : undefined}
        className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
          scope === "career"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-white/75 hover:text-white"
        }`}
      >
        Karriere
      </Link>
    </div>
  );
}