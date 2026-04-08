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

export default function MvpCards({ mvpWins, mvpPerGame }: MvpCardsProps) {
  const badgeLevel = getMvpBadgeLevel(mvpWins);
  const nextThreshold = getNextBadgeThreshold(mvpWins);
  const nextBadgeLevel =
    nextThreshold !== null ? getMvpBadgeLevel(nextThreshold) : "none";
  const nextMissing = nextThreshold !== null ? nextThreshold - mvpWins : 0;

  return (
    <>
      <section className="mt-5 rounded-[28px] border border-amber-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-950">
              MVP Übersicht
            </div>
            <div className="mt-1 text-sm text-slate-600">
              Zeigt, wie oft du bisher zum MVP gewählt wurdest.
            </div>
          </div>

          <span className="inline-flex w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
            {mvpWins === 0 ? "Noch kein MVP" : mvpWins === 1 ? "1x MVP" : `${mvpWins}x MVP`}
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              MVPs gesamt
            </div>
            <div className="mt-2 text-3xl font-extrabold tracking-tight text-amber-900">
              {mvpWins}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              MVP / Spiel
            </div>
            <div className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
              {formatRatio(mvpPerGame)}
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <div className="font-semibold text-slate-900">So wird gezählt</div>
          <div className="mt-2 space-y-1">
            <div>• Pro Session zählt ein MVP-Gewinn</div>
            <div>• Bei Gleichstand erhalten alle Gewinner einen MVP</div>
            <div>• Es zählen nur abgeschlossene und bereits revealte Votings</div>
            <div>• MVP / Spiel = MVPs geteilt durch deine Einsätze</div>
          </div>
        </div>
      </section>

      <section className="mt-5 rounded-[28px] border border-amber-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-950">
              MVP Badges
            </div>
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
          {[
            { label: "Kupfer", value: 1 },
            { label: "Bronze", value: 3 },
            { label: "Silber", value: 5 },
            { label: "Gold", value: 7 },
            { label: "Platin", value: 10 },
          ].map((badge) => {
            const active = mvpWins >= badge.value;

            return (
              <div
                key={badge.label}
                className={[
                  "rounded-2xl border px-4 py-4 text-center",
                  active
                    ? "border-amber-300 bg-amber-50 text-amber-900"
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
          <div className="text-sm font-semibold text-slate-950">
            Badge Übersicht
          </div>
          <div className="mt-1 text-sm text-slate-600">
            MVP ist jetzt aktiv. Weitere Badges können später folgen.
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              Aktiv
            </div>
            <div className="mt-2 text-base font-bold text-amber-900">
              MVP Badge
            </div>
            <div className="mt-1 text-sm text-amber-800">
              Verdient durch MVP-Gewinne im Voting.
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 opacity-60">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Bald
            </div>
            <div className="mt-2 text-base font-bold text-slate-700">
              Goldener Elefant
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Beispiel: 5 Trainingseinheiten in einer Saison.
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 opacity-60">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Bald
            </div>
            <div className="mt-2 text-base font-bold text-slate-700">
              Meister
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Für Saisongewinner oder Club-Champions.
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 opacity-60">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Bald
            </div>
            <div className="mt-2 text-base font-bold text-slate-700">
              Serie
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Für besondere Streaks und wiederkehrende Leistung.
            </div>
          </div>
        </div>
      </section>
    </>
  );
}