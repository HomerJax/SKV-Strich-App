import {
  getBadgeLabel,
  getMvpBadgeLevel,
  getNextBadgeThreshold,
} from "@/lib/mvp-badges";
import { formatRatio } from "@/lib/stats/utils";

type MvpCardsProps = {
  mvpWins: number;
  mvpPerGame: number;
};

const BADGE_STEPS = [
  { label: "Kupfer", value: 1 },
  { label: "Bronze", value: 3 },
  { label: "Silber", value: 5 },
  { label: "Gold", value: 7 },
  { label: "Platin", value: 10 },
];

type MiniStatProps = {
  label: string;
  value: string;
  hint?: string;
};

function MiniStat({ label, value, hint }: MiniStatProps) {
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

export default function MvpCards({ mvpWins, mvpPerGame }: MvpCardsProps) {
  const badgeLevel = getMvpBadgeLevel(mvpWins);
  const nextThreshold = getNextBadgeThreshold(mvpWins);
  const nextBadgeLevel =
    nextThreshold !== null ? getMvpBadgeLevel(nextThreshold) : "none";
  const nextMissing = nextThreshold !== null ? nextThreshold - mvpWins : 0;

  return (
    <>
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-950">MVP Übersicht</div>
            <div className="mt-1 text-sm text-slate-600">
              Wie oft du bisher zum MVP gewählt wurdest.
            </div>
          </div>

          <span
            className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${
              mvpWins > 0
                ? "bg-amber-100 text-amber-800"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {mvpWins === 0 ? "Noch kein MVP" : mvpWins === 1 ? "1x MVP" : `${mvpWins}x MVP`}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <MiniStat
            label="MVPs gesamt"
            value={String(mvpWins)}
            hint="Ein MVP-Gewinn pro Session"
          />
          <MiniStat
            label="MVP / Spiel"
            value={formatRatio(mvpPerGame)}
            hint="MVPs geteilt durch Einsätze"
          />
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <div className="font-semibold text-slate-900">So wird gezählt</div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
              Pro Session zählt ein MVP-Gewinn
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
              Bei Gleichstand erhalten alle Gewinner einen MVP
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
              Es zählen nur abgeschlossene und revealte Votings
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
              MVP / Spiel = MVPs geteilt durch deine Einsätze
            </div>
          </div>
        </div>
      </section>

      <section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-950">MVP Badges</div>
            <div className="mt-1 text-sm text-slate-600">
              Dein Fortschritt im MVP Voting.
            </div>
          </div>

          {badgeLevel !== "none" ? (
            <span className="inline-flex w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              Aktuell: {getBadgeLabel(badgeLevel)}
            </span>
          ) : (
            <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              Noch kein Badge
            </span>
          )}
        </div>

        {nextThreshold ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Noch <span className="font-semibold">{nextMissing}</span> MVP
            {nextMissing === 1 ? "" : "s"} bis{" "}
            <span className="font-semibold">{getBadgeLabel(nextBadgeLevel)}</span>.
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            Höchstes Badge erreicht 🏆
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {BADGE_STEPS.map((badge) => {
            const active = mvpWins >= badge.value;

            return (
              <div
                key={badge.label}
                className={[
                  "rounded-2xl border px-4 py-4 text-center shadow-sm",
                  active
                    ? "border-amber-200 bg-white text-slate-950"
                    : "border-slate-200 bg-slate-50 text-slate-400",
                ].join(" ")}
              >
                <div className="text-sm font-semibold">{badge.label}</div>
                <div className="mt-1 text-xs">ab {badge.value} MVP</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div>
          <div className="text-sm font-semibold text-slate-950">Badge Übersicht</div>
          <div className="mt-1 text-sm text-slate-600">
            MVP ist jetzt aktiv. Weitere Badges können später folgen.
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Aktiv
            </div>
            <div className="mt-2 text-base font-bold text-slate-950">MVP Badge</div>
            <div className="mt-1 text-sm text-slate-600">
              Verdient durch MVP-Gewinne im Voting.
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-500">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Bald
            </div>
            <div className="mt-2 text-base font-bold text-slate-700">
              Goldener Elefant
            </div>
            <div className="mt-1 text-sm">
              Beispiel: 5 Trainingseinheiten in einer Saison.
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-500">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Bald
            </div>
            <div className="mt-2 text-base font-bold text-slate-700">Meister</div>
            <div className="mt-1 text-sm">
              Für Saisongewinner oder Club-Champions.
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-500">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Bald
            </div>
            <div className="mt-2 text-base font-bold text-slate-700">Serie</div>
            <div className="mt-1 text-sm">
              Für besondere Streaks und wiederkehrende Leistung.
            </div>
          </div>
        </div>
      </section>
    </>
  );
}