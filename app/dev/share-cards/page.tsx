import MvpShareImage from "@/components/share/mvp-share/MvpShareImage";
import type { LeaderboardEntry } from "@/components/share/mvp-share/mvp-share.types";
import ResultShareCard from "@/components/share/result-share/ResultShareCard";
import type { ExtendedResultShareData } from "@/components/share/result-share/result-share.types";

const badgeKeys = ["blech", "bronze", "silber", "gold", "goat"] as const;

function getCurrent(badgeKey: (typeof badgeKeys)[number]) {
  if (badgeKey === "goat") return 10;
  if (badgeKey === "gold") return 7;
  if (badgeKey === "silber") return 5;
  if (badgeKey === "bronze") return 3;
  return 1;
}

function getPrevious(current: number) {
  return Math.max(0, current - 1);
}

function getBadgeLabel(current: number) {
  if (current >= 10) return "GOAT";
  if (current >= 7) return "Gold";
  if (current >= 5) return "Silber";
  if (current >= 3) return "Bronze";
  return "Blech";
}

function makeWinner(badgeKey: (typeof badgeKeys)[number]): LeaderboardEntry {
  const current = getCurrent(badgeKey);

  return {
    playerId: current,
    name: current >= 10 ? "GOAT Spieler" : "Marcello",
    votes: current >= 10 ? 12 : 5,
    previous: getPrevious(current),
    current,
    badgeLabel: getBadgeLabel(current),
    earnedBadgeText: `${getBadgeLabel(current)} strikr badge`,
  };
}

const resultShareMock = {
  sessionId: 999,
  title: "Team Weiß gewinnt",
  subtitle: "Ein enges Spiel unter Flutlicht.",
  date: "2026-04-29",
  winnerLabel: "Team Weiß",

  clubName: "SKV Rutesheim AH",
  clubLogoUrl: "/brand/strikr-mark.png",
  clubPrimaryColor: "#22C55E",
  strikrLogoUrl: "/brand/strikr-mark.png",

  winnerPhotoUrl: null,

  goalsA: "4",
  goalsB: "5",
  teamAName: "Team Schwarz",
  teamBName: "Team Weiß",

  winnerWasShorthanded: false,
  upsetWin: false,
  dramaticFinish: true,

  branding: {
    clubName: "SKV Rutesheim AH",
    clubCrestUrl: "/brand/strikr-mark.png",
    appName: "strikr",
    appTagline: "TEAM TRAINING. REDEFINED.",
    appLogoUrl: "/brand/strikr-mark.png",
  },
} satisfies ExtendedResultShareData;

function PreviewFrame({
  title,
  width,
  height,
  scale,
  children,
}: {
  title: string;
  width: number;
  height: number;
  scale: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
          {title}
        </div>
        <div className="rounded-full bg-zinc-100 px-3 py-1 text-[11px] font-bold text-zinc-500">
          {width}×{height}
        </div>
      </div>

      <div className="mx-auto overflow-hidden rounded-[22px] bg-zinc-100 ring-1 ring-zinc-200">
        <div
          style={{
            width: width * scale,
            height: height * scale,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width,
              height,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function ShareCardsDevPage() {
  return (
    <main className="min-h-screen bg-white px-6 py-8 text-zinc-950">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-4xl font-black tracking-[-0.06em]">
          Share Cards DEV
        </h1>

        <p className="mt-2 text-sm font-medium text-zinc-500">
          Übersicht für Result Share, MVP Winner und MVP Team.
        </p>

        <div className="mt-8">
          <h2 className="mb-4 text-sm font-black uppercase tracking-[0.18em] text-zinc-400">
            Result Share
          </h2>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <PreviewFrame
              title="Result · Floodlight"
              width={1080}
              height={1350}
              scale={0.2}
            >
              <ResultShareCard data={resultShareMock} />
            </PreviewFrame>
          </div>
        </div>

        <div className="mt-10">
          <h2 className="mb-4 text-sm font-black uppercase tracking-[0.18em] text-zinc-400">
            MVP Winner Share
          </h2>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {badgeKeys.map((badgeKey) => {
              const winner = makeWinner(badgeKey);

              const leaderboard: LeaderboardEntry[] = [
                winner,
                {
                  playerId: 99,
                  name: "Steffen",
                  votes: 3,
                  previous: 0,
                  current: 1,
                  badgeLabel: "Blech",
                  earnedBadgeText: "Blech strikr badge",
                },
              ];

              return (
                <PreviewFrame
                  key={badgeKey}
                  title={`Winner · ${badgeKey}`}
                  width={1080}
                  height={1920}
                  scale={0.2}
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
                </PreviewFrame>
              );
            })}
          </div>
        </div>

        <div className="mt-10">
          <h2 className="mb-4 text-sm font-black uppercase tracking-[0.18em] text-zinc-400">
            MVP Team Share
          </h2>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {badgeKeys.map((badgeKey) => {
              const winner = makeWinner(badgeKey);

              const leaderboard: LeaderboardEntry[] = [
                winner,
                {
                  playerId: 99,
                  name: "Steffen",
                  votes: 3,
                  previous: 0,
                  current: 1,
                  badgeLabel: "Blech",
                  earnedBadgeText: "Blech strikr badge",
                },
              ];

              return (
                <PreviewFrame
                  key={badgeKey}
                  title={`Team · ${badgeKey}`}
                  width={1080}
                  height={1920}
                  scale={0.2}
                >
                  <MvpShareImage
                    mode="team"
                    strikrLogoUrl="/brand/strikr-mark.png"
                    clubLogoUrl="/brand/strikr-mark.png"
                    clubName="SKV Rutesheim AH"
                    sessionDateLabel="Mittwoch, 29.04.2026"
                    badgeImageUrl={`/badges/hero/${badgeKey}.webp`}
                    winner={winner}
                    leaderboard={leaderboard}
                  />
                </PreviewFrame>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}