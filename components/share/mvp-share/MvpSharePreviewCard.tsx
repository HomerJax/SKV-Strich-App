type LeaderboardEntry = {
  playerId: number;
  name: string;
  votes: number;
  mvpCount?: number;
};

type BadgeUpgrade = {
  playerId: number;
  playerName: string;
  previousMvpCount: number;
  newMvpCount: number;
};

type MvpSharePreviewCardProps = {
  isWinner: boolean;
  winnerName?: string;
  leaderboard?: LeaderboardEntry[];
  badgeUpgrade?: BadgeUpgrade | null;
};

function getBadgeMeta(count: number) {
  if (count >= 10)
    return { label: "GOAT", src: "/badges/hero/goat.webp", text: "text-fuchsia-100" };
  if (count >= 7)
    return { label: "Gold", src: "/badges/hero/gold.webp", text: "text-yellow-100" };
  if (count >= 5)
    return { label: "Silber", src: "/badges/hero/silber.webp", text: "text-slate-100" };
  if (count >= 3)
    return { label: "Bronze", src: "/badges/hero/bronze.webp", text: "text-orange-100" };

  return { label: "Blech", src: "/badges/hero/blech.webp", text: "text-zinc-200" };
}

export default function MvpSharePreviewCard({
  isWinner,
  winnerName = "Der MVP",
  leaderboard = [],
  badgeUpgrade,
}: MvpSharePreviewCardProps) {
  const count = badgeUpgrade?.newMvpCount ?? leaderboard[0]?.mvpCount ?? 1;
  const previous = badgeUpgrade?.previousMvpCount ?? Math.max(count - 1, 0);
  const badge = getBadgeMeta(count);

  return (
    <div className="relative overflow-hidden rounded-[26px] bg-[#050816] p-4 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_20%,rgba(255,255,255,0.12),transparent_28%)]" />

      <div className="relative flex items-center justify-between">
        <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/70">
          MVP
        </div>
        <div className="text-sm font-black text-white/80">strikr</div>
      </div>

      <div className="relative mt-4 flex items-center gap-3">
        <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-[28px] border border-white/10 bg-black/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={badge.src}
            alt={`${badge.label} Badge`}
            className="h-24 w-24 object-contain"
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">
            Glückwunsch
          </p>

          <p className="mt-1 text-xl font-black leading-tight tracking-[-0.04em]">
            {isWinner ? "Du wurdest zum MVP gewählt." : `${winnerName} wurde MVP.`}
          </p>

          <p className={`mt-2 text-xs font-black uppercase ${badge.text}`}>
            Du hast {badge.label} freigeschaltet.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-black">
              MVP #{count}
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-black text-white/65">
              {previous} → {count}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}