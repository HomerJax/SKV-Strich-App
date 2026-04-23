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

type ImpactStatProps = {
  label: string;
  value: string;
  hint?: string;
};

function ImpactStat({ label, value, hint }: ImpactStatProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-3xl font-bold leading-none tracking-tight text-slate-950">
        {value}
      </div>
      {hint ? <div className="mt-3 text-xs leading-5 text-slate-500">{hint}</div> : null}
    </div>
  );
}

export default function TeamImpactCard({
  impactGames,
  impactWins,
  impactTotal,
  impactPerMatch,
  impactMeta,
}: TeamImpactCardProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl text-sm leading-6 text-slate-600">
          Zeigt, wie Teams mit dir performen – nicht nur ob du gewinnst,
          sondern auch wie stark dein Team im Vergleich war.
        </div>

        <span
          className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${impactMeta.badgeClasses}`}
        >
          {impactMeta.title}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <ImpactStat
          label="Spiele mit dir"
          value={String(impactGames)}
          hint="Grundlage für den Impact"
        />
        <ImpactStat
          label="Siege mit dir"
          value={String(impactWins)}
          hint="Gewonnene Spiele"
        />
        <ImpactStat
          label="Impact gesamt"
          value={formatImpactValue(impactTotal)}
          hint="Aufsummierter Wert"
        />
        <ImpactStat
          label="Impact / Spiel"
          value={formatImpactValue(impactPerMatch)}
          hint="Durchschnitt pro Einsatz"
        />
      </div>

      <div className={`rounded-2xl border px-4 py-4 text-sm leading-6 ${impactMeta.boxClasses}`}>
        <div className="font-semibold">{impactMeta.title}</div>
        <div className="mt-1">{impactMeta.text}</div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <div className="font-semibold text-slate-900">So wird Team Impact berechnet</div>

        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
            Sieg mit stärkerem Team → <span className="font-semibold">+1</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
            Sieg als Underdog → <span className="font-semibold">+2</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
            Niederlage trotz stärkerem Team → <span className="font-semibold">-1</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
            Niederlage als Underdog → <span className="font-semibold">0</span>
          </div>
        </div>

        <p className="mt-3 text-slate-600">
          Grundlage ist die erwartete Teamstärke aus den gespeicherten Teams.
          Wenn in deinem Club Stärken aktiv sind, wird mit der Summe der
          Spieler-Stärken gerechnet. Sonst zählt die Teamgröße als neutrale Basis.
        </p>
      </div>
    </div>
  );
}