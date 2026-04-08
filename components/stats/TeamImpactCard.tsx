import { formatImpactValue } from "@/lib/stats/utils";

type TeamImpactCardProps = {
  impactGames: number;
  impactWins: number;
  impactTotal: number;
  impactPerMatch: number;
  impactMeta: {
    title: string;
    text: string;
    badgeClasses: string;
    boxClasses: string;
  };
};

export default function TeamImpactCard({
  impactGames,
  impactWins,
  impactTotal,
  impactPerMatch,
  impactMeta,
}: TeamImpactCardProps) {
  return (
    <section className="mt-5 rounded-[28px] border border-black/10 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-950">
            Team Impact
          </div>
          <div className="mt-1 text-sm text-slate-600">
            Zeigt, wie Teams mit dir performen – nicht nur ob du gewinnst,
            sondern auch wie stark dein Team im Vergleich war.
          </div>
        </div>

        <span
          className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${impactMeta.badgeClasses}`}
        >
          {impactMeta.title}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Spiele mit dir
          </div>
          <div className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
            {impactGames}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Siege mit dir
          </div>
          <div className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
            {impactWins}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Impact gesamt
          </div>
          <div className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
            {formatImpactValue(impactTotal)}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Impact / Spiel
          </div>
          <div className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
            {formatImpactValue(impactPerMatch)}
          </div>
        </div>
      </div>

      <div className={`mt-5 rounded-2xl border p-4 text-sm leading-6 ${impactMeta.boxClasses}`}>
        <div className="font-semibold">{impactMeta.title}</div>
        <div className="mt-1">{impactMeta.text}</div>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <div className="font-semibold text-slate-900">
          So wird Team Impact berechnet
        </div>

        <div className="mt-2 space-y-1">
          <div>• Sieg mit stärkerem Team → +1</div>
          <div>• Sieg als Underdog → +2</div>
          <div>• Niederlage trotz stärkerem Team → -1</div>
          <div>• Niederlage als Underdog → 0</div>
        </div>

        <p className="mt-3 text-slate-600">
          Grundlage ist die erwartete Teamstärke aus den gespeicherten Teams.
          Wenn in deinem Club Stärken aktiv sind, wird mit der Summe der
          Spieler-Stärken gerechnet. Sonst zählt die Teamgröße als neutrale Basis.
        </p>
      </div>
    </section>
  );
}