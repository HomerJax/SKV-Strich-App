import MvpShareImage from "@/components/share/mvp-share/MvpShareImage";
import type { LeaderboardEntry } from "@/components/share/mvp-share/mvp-share.types";

function makeWinner(params: {
  playerId: number;
  name: string;
  previous: number;
  current: number;
  votes: number;
}): LeaderboardEntry {
  const badgeLabel =
    params.current >= 10
      ? "GOAT"
      : params.current >= 7
        ? "Gold"
        : params.current >= 5
          ? "Silber"
          : params.current >= 3
            ? "Bronze"
            : "Blech";

  return {
    playerId: params.playerId,
    name: params.name,
    votes: params.votes,
    previous: params.previous,
    current: params.current,
    badgeLabel,
    earnedBadgeText: `${badgeLabel} strikr badge`,
  };
}

export default function DevMvpSharePage() {
  const mockData: LeaderboardEntry[] = [
    makeWinner({
      playerId: 1,
      name: "Steffen",
      previous: 0,
      current: 1,
      votes: 4,
    }),
    makeWinner({
      playerId: 2,
      name: "Karim",
      previous: 2,
      current: 3,
      votes: 6,
    }),
    makeWinner({
      playerId: 3,
      name: "Marcello",
      previous: 4,
      current: 5,
      votes: 7,
    }),
    makeWinner({
      playerId: 4,
      name: "Timo",
      previous: 6,
      current: 7,
      votes: 8,
    }),
    makeWinner({
      playerId: 5,
      name: "GOAT Spieler",
      previous: 9,
      current: 10,
      votes: 10,
    }),
  ];

  return (
    <main className="min-h-screen bg-white p-10 text-zinc-900">
      <h1 className="mb-10 text-4xl font-black">MVP Share DEV</h1>

      <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
        {mockData.map((winner) => {
          const badgeKey =
            winner.current >= 10
              ? "goat"
              : winner.current >= 7
                ? "gold"
                : winner.current >= 5
                  ? "silber"
                  : winner.current >= 3
                    ? "bronze"
                    : "blech";

          const leaderboard: LeaderboardEntry[] = [
            winner,
            makeWinner({
              playerId: 99,
              name: "Steffen",
              previous: 1,
              current: 2,
              votes: Math.max(1, winner.votes - 2),
            }),
          ];

          return (
            <div
              key={winner.playerId}
              className="rounded-3xl bg-zinc-100 p-6 shadow-lg"
            >
              <div className="mb-4 text-sm font-bold uppercase tracking-wide text-zinc-500">
                {badgeKey}
              </div>

              <div className="overflow-hidden rounded-3xl bg-black">
                <div
                  style={{
                    transform: "scale(0.35)",
                    transformOrigin: "top left",
                    width: "1080px",
                    height: "1920px",
                  }}
                >
                  <MvpShareImage
                    mode="winner"
                    strikrLogoUrl="/brand/strikr-mark.png"
                    clubLogoUrl="/brand/strikr-mark.png"
                    clubName="SKV Rutesheim AH"
                    sessionDateLabel="Mittwoch, 29.04.2026"
                    badgeImageUrl={`/badges/hero/${badgeKey}.webp`}
                    winner={winner}
                    leaderboard={leaderboard}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}