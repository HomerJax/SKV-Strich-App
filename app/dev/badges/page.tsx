import PlayerBadge from "@/components/badges/PlayerBadge";
import {
  getBadgeMetaFromMvpCount,
  getBadgeProgress,
} from "@/lib/badges/helpers";

const TEST_VALUES = [0, 1, 3, 5, 7, 10];

export default function DevBadgesPage() {
  return (
    <div className="p-6 space-y-10">
      <h1 className="text-2xl font-bold">Badge System Preview</h1>

      {/* 🔹 Compact Sizes */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Compact Sizes</h2>

        <div className="space-y-4">
          {TEST_VALUES.map((val) => {
            const badge = getBadgeMetaFromMvpCount(val);

            return (
              <div key={val} className="flex items-center gap-4">
                <div className="w-24 text-sm">{val} MVP</div>

                <PlayerBadge mvpCount={val} size="xs" />
                <PlayerBadge mvpCount={val} size="sm" />
                <PlayerBadge mvpCount={val} size="md" />
                <PlayerBadge mvpCount={val} size="lg" />

                <span className="text-sm text-slate-600">
                  {badge.label}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 🔹 Hero Badges */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Hero</h2>

        <div className="flex gap-6">
          {TEST_VALUES.map((val) => {
            const badge = getBadgeMetaFromMvpCount(val);

            return (
              <div key={val} className="text-center">
                <PlayerBadge
                  mvpCount={val}
                  mode="hero"
                  size="xl"
                />
                <div className="mt-2 text-sm">{badge.label}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 🔹 Spielerliste Simulation */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Spielerliste</h2>

        <div className="bg-white rounded-xl border p-4 space-y-2 max-w-md">
          {[
            { name: "Steffen", mvp: 1 },
            { name: "Karim", mvp: 3 },
            { name: "Julian", mvp: 5 },
            { name: "Marcello", mvp: 7 },
            { name: "GOAT Spieler", mvp: 10 },
          ].map((p) => (
            <div
              key={p.name}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span>{p.name}</span>
                <PlayerBadge mvpCount={p.mvp} size="xs" />
              </div>

              <span className="text-sm text-slate-500">
                {p.mvp}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 🔹 Progress Beispiel */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Progress</h2>

        <div className="space-y-4 max-w-md">
          {[0, 2, 4, 6, 9].map((val) => {
            const progress = getBadgeProgress(val);

            return (
              <div key={val} className="border p-4 rounded-xl">
                <div className="flex items-center gap-3">
                  <PlayerBadge
                    mvpCount={val}
                    size="lg"
                    grayscale={progress.current.key === "none"}
                  />

                  <div>
                    <div className="font-semibold">
                      {progress.current.label}
                    </div>
                    <div className="text-sm text-slate-500">
                      {progress.progressLabel}
                    </div>
                  </div>
                </div>

                <div className="mt-3 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-slate-900"
                    style={{ width: `${progress.progressPercent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}