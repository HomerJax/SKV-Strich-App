"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PlayerBadge from "@/components/badges/PlayerBadge";
import ProFeatureLock from "@/components/billing/ProFeatureLock";
import { getBadgeMetaFromMvpCount } from "@/lib/badges/helpers";
import { preloadMvpShareImage, shareMvpResult } from "@/lib/share/mvp-share";
import MvpShareImage from "@/components/share/mvp-share/MvpShareImage";
import type { LeaderboardEntry as ShareLeaderboardEntry } from "@/components/share/mvp-share/mvp-share.types";

type Participant = {
  id: number;
  name: string;
  mvpCount?: number | null;
};

type ResultEntry = {
  playerId: number;
  name: string;
  votes: number;
  mvpCount?: number | null;
};

type BadgeUpgrade = {
  playerId: number;
  playerName: string;
  previousMvpCount: number;
  newMvpCount: number;
};

type MvpVotingAccess = {
  isPro: boolean;
  allowed: boolean;
  usedThisSeason: number;
  freeLimit: number;
  reason: "pro" | "free_available" | "free_limit_reached";
};

type MvpState = {
  sessionId: number;
  hasResult: boolean;
  votingOpen: boolean;
  revealLabel: string;
  canVote: boolean;
  currentUserPlayerId: number | null;
  userHasVoted: boolean;
  userVotePlayerId: number | null;
  participants: Participant[];
  voteCount: number;
  eligibleVoterCount: number;
  votedByNames: string[];
  clubName?: string | null;
  clubLogoUrl?: string | null;
  mvpAccess?: MvpVotingAccess;
  results: {
    winners: ResultEntry[];
    leaderboard: ResultEntry[];
    totalVotes: number;
    badgeUpgrade?: BadgeUpgrade | null;
    badgeUpgrades?: BadgeUpgrade[];
  } | null;
};

type SessionMvpCardProps = {
  sessionId: number;
};

type LoadState = "idle" | "loading" | "ready" | "error";

function ResultPill({
  text,
  tone = "default",
}: {
  text: string;
  tone?: "default" | "success";
}) {
  const className =
    tone === "success"
      ? "bg-emerald-100 text-emerald-800"
      : "bg-amber-100 text-amber-800";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {text}
    </span>
  );
}

function VoteCountPill({
  voteCount,
  eligibleVoterCount,
  votingOpen,
}: {
  voteCount: number;
  eligibleVoterCount: number;
  votingOpen: boolean;
}) {
  const text = votingOpen
    ? `${voteCount} von ${eligibleVoterCount} Stimmen`
    : `${voteCount} ${voteCount === 1 ? "Stimme" : "Stimmen"} gesamt`;

  return (
    <span className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-black/10">
      {text}
    </span>
  );
}

function safeMvpCount(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getBadgeAssetKeyFromMvpCount(count: number) {
  if (count >= 10) return "goat";
  if (count >= 7) return "gold";
  if (count >= 5) return "silber";
  if (count >= 3) return "bronze";
  return "blech";
}

function getShareBadgeLabel(count: number) {
  if (count >= 10) return "GOAT";
  if (count >= 7) return "Gold";
  if (count >= 5) return "Silber";
  if (count >= 3) return "Bronze";
  return "Blech";
}

function getShareEarnedBadgeText(count: number) {
  return `${getShareBadgeLabel(count)} strikr badge`;
}

function toAbsoluteAssetUrl(url: string | null | undefined) {
  if (!url) return null;

  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:")
  ) {
    return url;
  }

  if (typeof window === "undefined") {
    return url;
  }

  return new URL(url, window.location.origin).toString();
}

function getBadgeUpgradeForPlayer(
  badgeUpgrades: BadgeUpgrade[],
  playerId: number,
  fallback: BadgeUpgrade | null = null
) {
  return (
    badgeUpgrades.find((upgrade) => upgrade.playerId === playerId) ??
    (fallback?.playerId === playerId ? fallback : null)
  );
}

function toShareEntry(
  entry: ResultEntry,
  badgeUpgrade: BadgeUpgrade | null
): ShareLeaderboardEntry {
  const fallbackCurrent = Math.max(safeMvpCount(entry.mvpCount), 1);

  const current =
    badgeUpgrade?.playerId === entry.playerId
      ? Math.max(safeMvpCount(badgeUpgrade.newMvpCount), fallbackCurrent)
      : fallbackCurrent;

  const previous =
    badgeUpgrade?.playerId === entry.playerId
      ? Math.max(safeMvpCount(badgeUpgrade.previousMvpCount), 0)
      : Math.max(current - 1, 0);

  return {
    playerId: entry.playerId,
    name: entry.name,
    votes: entry.votes,
    previous,
    current,
    badgeLabel: getShareBadgeLabel(current),
    earnedBadgeText: getShareEarnedBadgeText(current),
  };
}

function MergedWinnerCard({
  winner,
  badgeUpgrade,
}: {
  winner: ResultEntry;
  badgeUpgrade: BadgeUpgrade | null;
}) {
  const winnerCount = safeMvpCount(winner.mvpCount);

  const rawPreviousCount =
    badgeUpgrade && badgeUpgrade.playerId === winner.playerId
      ? safeMvpCount(badgeUpgrade.previousMvpCount)
      : Math.max(winnerCount - 1, 0);

  const rawNextCount =
    badgeUpgrade && badgeUpgrade.playerId === winner.playerId
      ? safeMvpCount(badgeUpgrade.newMvpCount)
      : winnerCount;

  const previousCount = Math.max(rawPreviousCount, 0);
  const nextCount = badgeUpgrade
    ? Math.max(rawNextCount, previousCount + 1)
    : Math.max(rawNextCount, previousCount + 1);

  const previousBadge = getBadgeMetaFromMvpCount(previousCount);
  const nextBadge = getBadgeMetaFromMvpCount(nextCount);
  const tierChanged = previousBadge.key !== nextBadge.key;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <PlayerBadge
            badgeKey={nextBadge.key}
            size="md"
            hideIfNone
            title={nextBadge.label}
            className="shrink-0"
          />

          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
              MVP des Trainings
            </div>
            <div className="mt-1 truncate text-lg font-extrabold tracking-tight text-slate-950">
              {winner.name}
            </div>
            <div className="mt-0.5 text-sm text-slate-500">
              {winner.votes} {winner.votes === 1 ? "Stimme" : "Stimmen"}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-900">
              {tierChanged ? "Neues Badge erreicht" : "Badge-Fortschritt"}
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              {previousBadge.label} → {nextBadge.label}
            </div>
          </div>

          <div className="shrink-0 text-sm font-extrabold text-slate-900">
            {previousCount} → {nextCount}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SessionMvpCard({ sessionId }: SessionMvpCardProps) {
  const router = useRouter();
  const shareCardRef = useRef<HTMLDivElement>(null);
  const winnerShareRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const [state, setState] = useState<MvpState | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [sharingResult, setSharingResult] = useState(false);
  const [sharingWinnerPlayerId, setSharingWinnerPlayerId] = useState<number | null>(null);
  const [sharingVotingReminder, setSharingVotingReminder] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);

  async function loadMvpState() {
    try {
      setLoadState("loading");
      setErr(null);

      const response = await fetch(`/api/sessions/${sessionId}/mvp`, {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error || "MVP-Daten konnten nicht geladen werden."
        );
      }

      setState(payload);
      setSelectedPlayerId(payload.userVotePlayerId ?? null);
      setLoadState("ready");

      if (payload.votingOpen && payload.userHasVoted) {
        setCollapsed(true);
      }

      if (!payload.votingOpen && payload.results) {
        setCollapsed(false);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "MVP-Daten konnten nicht geladen werden.";
      setErr(message);
      setLoadState("error");
    }
  }

  useEffect(() => {
    loadMvpState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const selectedPlayerName = useMemo(() => {
    if (!state || !selectedPlayerId) return null;
    return (
      state.participants.find((player) => player.id === selectedPlayerId)
        ?.name ?? null
    );
  }, [state, selectedPlayerId]);

  const shareData = useMemo(() => {
    if (!state?.results || state.results.winners.length === 0) {
      return null;
    }

    const badgeUpgrades = state.results.badgeUpgrades ?? [];
    const fallbackBadgeUpgrade = state.results.badgeUpgrade ?? null;

    const isCurrentUserWinner =
      state.currentUserPlayerId !== null &&
      state.results.winners.some(
        (resultWinner) => resultWinner.playerId === state.currentUserPlayerId
      );

    const winner =
      isCurrentUserWinner && state.currentUserPlayerId !== null
        ? state.results.winners.find(
            (resultWinner) => resultWinner.playerId === state.currentUserPlayerId
          ) ?? state.results.winners[0]
        : state.results.winners[0];

    const winnerBadgeUpgrade = getBadgeUpgradeForPlayer(
      badgeUpgrades,
      winner.playerId,
      fallbackBadgeUpgrade
    );

    const shareWinner = toShareEntry(winner, winnerBadgeUpgrade);

    const shareWinners = state.results.winners.map((entry) =>
      toShareEntry(
        entry,
        getBadgeUpgradeForPlayer(badgeUpgrades, entry.playerId, fallbackBadgeUpgrade)
      )
    );

    const shareLeaderboard = state.results.leaderboard.map((entry) =>
      toShareEntry(
        entry,
        getBadgeUpgradeForPlayer(badgeUpgrades, entry.playerId, fallbackBadgeUpgrade)
      )
    );

    const shareWinnerCards = shareWinners.map((winnerEntry) => {
      const winnerBadgeKey = getBadgeAssetKeyFromMvpCount(winnerEntry.current);

      return {
        winner: winnerEntry,
        badgeImageUrl:
          toAbsoluteAssetUrl(`/badges/hero/${winnerBadgeKey}.webp`) ??
          `/badges/hero/${winnerBadgeKey}.webp`,
      };
    });

    const badgeKey = getBadgeAssetKeyFromMvpCount(shareWinner.current);
    const strikrLogoUrl =
      toAbsoluteAssetUrl("/brand/strikr-mark.png") ?? "/brand/strikr-mark.png";

    return {
      mode: isCurrentUserWinner ? ("winner" as const) : ("team" as const),
      winner: shareWinner,
      winners: shareWinners,
      winnerCards: shareWinnerCards,
      leaderboard: shareLeaderboard,
      badgeImageUrl:
        toAbsoluteAssetUrl(`/badges/hero/${badgeKey}.webp`) ??
        `/badges/hero/${badgeKey}.webp`,
      clubLogoUrl: toAbsoluteAssetUrl(state.clubLogoUrl) ?? strikrLogoUrl,
      strikrLogoUrl,
      clubName: state.clubName ?? "strikr Team",
      sessionDateLabel: state.revealLabel,
    };
  }, [state]);

  async function handleVoteSubmit() {
    if (!selectedPlayerId || saving) return;

    try {
      setSaving(true);
      setErr(null);
      setMsg(null);

      const response = await fetch(`/api/sessions/${sessionId}/mvp`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          votedPlayerId: selectedPlayerId,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error || "MVP-Stimme konnte nicht gespeichert werden."
        );
      }

      setMsg(`Deine Stimme wurde gezählt. Ergebnis ab ${payload.revealLabel}`);
      await loadMvpState();
      setCollapsed(true);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "MVP-Stimme konnte nicht gespeichert werden.";
      setErr(message);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!shareData) return;

    const mode = shareData.mode;
    const imageUrl = `/api/share/mvp/${sessionId}/image?variant=${mode}`;
    const fileName =
      mode === "winner"
        ? `strikr-mvp-winner-${sessionId}.png`
        : `strikr-mvp-result-${sessionId}.png`;

    void preloadMvpShareImage({
      imageUrl,
      fileName,
    }).catch(() => {
      // Komfort-Preload. Beim Klick wird es erneut versucht.
    });

    for (const winnerCard of shareData.winnerCards) {
      void preloadMvpShareImage({
        imageUrl: winnerCard.badgeImageUrl,
        fileName: `strikr-mvp-badge-${winnerCard.winner.playerId}.webp`,
      }).catch(() => {
        // Badge-Preload ist Komfort. Beim Klick wird erneut gewartet.
      });
    }
  }, [sessionId, shareData]);

  async function handleShareMvpResult() {
    if (!shareCardRef.current || !shareData) {
      setShareMsg("MVP Share Card ist noch nicht bereit.");
      return;
    }

    try {
      setSharingResult(true);
      setShareMsg("Share Card wird gebaut…");

      await new Promise((resolve) => window.setTimeout(resolve, 1400));

      await shareMvpResult({
        element: shareCardRef.current,
        imageUrl: `/api/share/mvp/${sessionId}/image?variant=${shareData.mode}`,
        fileName:
          shareData.mode === "winner"
            ? `strikr-mvp-winner-${sessionId}.png`
            : `strikr-mvp-result-${sessionId}.png`,
        title:
          shareData.mode === "winner"
            ? "Ich wurde zum MVP gewählt"
            : "MVP Ergebnis",
        text:
          shareData.mode === "winner"
            ? "Meine MVP Card aus strikr."
            : "Das MVP Ergebnis aus strikr.",
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setShareMsg("Teilen konnte nicht vorbereitet werden. Bitte erneut versuchen.");
    } finally {
      setSharingResult(false);
    }
  }

  async function handleShareWinnerCard(playerId: number) {
    if (!shareData) {
      setShareMsg("MVP Share Card ist noch nicht bereit.");
      return;
    }

    const card = shareData.winnerCards.find(
      (winnerCard) => winnerCard.winner.playerId === playerId
    );
    const element = winnerShareRefs.current[playerId];

    if (!card || !element) {
      setShareMsg("MVP Gewinner-Card ist noch nicht bereit.");
      return;
    }

    try {
      setSharingWinnerPlayerId(playerId);
      setShareMsg("Lade Badge…");

      await preloadMvpShareImage({
        imageUrl: card.badgeImageUrl,
        fileName: `strikr-mvp-badge-${playerId}.webp`,
      });

      setShareMsg("MVP Gewinner-Card wird gebaut…");

      await new Promise((resolve) => window.setTimeout(resolve, 1400));

      await shareMvpResult({
        element,
        imageUrl: `/api/share/mvp/${sessionId}/image?variant=winner&playerId=${playerId}&perspective=team`,
        fileName: `strikr-mvp-${sessionId}-${playerId}.png`,
        title: `${card.winner.name} wurde zum MVP gewählt`,
        text: `MVP Card von ${card.winner.name} aus strikr.`,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setShareMsg("MVP Gewinner-Card konnte nicht geteilt werden.");
    } finally {
      setSharingWinnerPlayerId(null);
    }
  }

  async function handleShareVotingReminder() {
    if (sharingVotingReminder) return;

    try {
      setSharingVotingReminder(true);
      setShareMsg(null);

      const sessionUrl =
        typeof window !== "undefined"
          ? window.location.href
          : `/sessions/${sessionId}`;

      const text = [
        "MVP-Voting läuft 🗳️",
        "",
        "Jungs, denkt dran abzustimmen:",
        sessionUrl,
        "",
        "made with strikr",
      ].join("\n");

      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: "MVP-Voting läuft",
          text,
          url: sessionUrl,
        });

        return;
      }

      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setShareMsg("Voting-Erinnerung wurde in die Zwischenablage kopiert.");
        return;
      }

      setShareMsg("Teilen ist auf diesem Gerät leider nicht verfügbar.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setShareMsg("Voting-Erinnerung konnte nicht geteilt werden.");
    } finally {
      setSharingVotingReminder(false);
    }
  }

  if (loadState === "loading" || loadState === "idle") {
    return (
      <section className="rounded-[24px] border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-amber-700">⭐ MVP Voting</div>
        <div className="mt-2 text-sm text-slate-600">Lade MVP-Bereich…</div>
      </section>
    );
  }

  if (loadState === "error" || !state) {
    return (
      <section className="rounded-[24px] border border-red-200 bg-red-50 p-4 shadow-sm">
        <div className="text-sm font-semibold text-red-700">MVP Voting</div>
        <div className="mt-2 text-sm text-red-700">
          {err ?? "MVP-Bereich konnte nicht geladen werden."}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadMvpState}
            className="inline-flex items-center justify-center rounded-2xl border border-red-300 bg-white px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50"
          >
            Erneut laden
          </button>
        </div>
      </section>
    );
  }

  const votingOpen = state.votingOpen;
  const mvpAccess = state.mvpAccess ?? null;
  const showMvpLimitLock =
    votingOpen && mvpAccess?.allowed === false && mvpAccess.reason === "free_limit_reached";
  const freeMvpSlotsLeft = mvpAccess
    ? Math.max(0, mvpAccess.freeLimit - mvpAccess.usedThisSeason)
    : null;
  const badgeUpgrade = state.results?.badgeUpgrade ?? null;
  const badgeUpgrades = state.results?.badgeUpgrades ?? [];
  const progressPercent =
    state.eligibleVoterCount > 0
      ? Math.max(
          0,
          Math.min(100, (state.voteCount / state.eligibleVoterCount) * 100)
        )
      : 0;

  const userDone = votingOpen && state.userHasVoted;
  const shellClassName = userDone
    ? "rounded-[24px] border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm"
    : "rounded-[24px] border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm";

  const titleColorClass = userDone ? "text-emerald-700" : "text-amber-700";
  const pillTone = userDone ? "success" : "default";

  const collapsedSummary = !votingOpen
    ? state.results?.winners && state.results.winners.length > 0
      ? `Ergebnis verfügbar${
          state.results.winners.length === 1
            ? ` · MVP: ${state.results.winners[0].name}`
            : ""
        }`
      : "Voting beendet"
    : state.userHasVoted
      ? selectedPlayerName
        ? `Deine Stimme ist abgegeben · gewählt: ${selectedPlayerName}`
        : "Deine Stimme ist abgegeben"
      : `${state.voteCount} von ${state.eligibleVoterCount} haben abgestimmt`;

  return (
    <>
      {shareData ? (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            left: "-10000px",
            top: 0,
            pointerEvents: "none",
            zIndex: -1,
          }}
        >
          <div
            ref={shareCardRef}
            style={{
              width: 1080,
              height: 1920,
              background: "#020617",
            }}
          >
            <MvpShareImage
              mode={shareData.mode}
              strikrLogoUrl={shareData.strikrLogoUrl}
              clubLogoUrl={shareData.clubLogoUrl}
              clubName={shareData.clubName}
              sessionDateLabel={shareData.sessionDateLabel}
              badgeImageUrl={shareData.badgeImageUrl}
              winner={shareData.winner}
              winners={shareData.winners}
              leaderboard={shareData.leaderboard}
            />
          </div>

          {shareData.winnerCards.map((winnerCard) => (
            <div
              key={winnerCard.winner.playerId}
              ref={(node) => {
                winnerShareRefs.current[winnerCard.winner.playerId] = node;
              }}
              style={{
                width: 1080,
                height: 1920,
                background: "#020617",
              }}
            >
              <MvpShareImage
                mode="winner"
                sharePerspective="team"
                strikrLogoUrl={shareData.strikrLogoUrl}
                clubLogoUrl={shareData.clubLogoUrl}
                clubName={shareData.clubName}
                sessionDateLabel={shareData.sessionDateLabel}
                badgeImageUrl={winnerCard.badgeImageUrl}
                winner={winnerCard.winner}
                winners={shareData.winners}
                leaderboard={shareData.leaderboard}
              />
            </div>
          ))}
        </div>
      ) : null}

      {collapsed ? (
        <section className={shellClassName}>
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className={`flex w-full items-center justify-between gap-4 rounded-[20px] text-left ${
              userDone ? "text-emerald-950" : "text-slate-950"
            }`}
          >
            <div className="flex items-center gap-3">
              {userDone ? (
                <span
                  aria-hidden="true"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white"
                >
                  ✓
                </span>
              ) : null}

              <div>
                <div
                  className={`text-base font-bold ${
                    userDone ? "text-emerald-950" : "text-slate-950"
                  }`}
                >
                  {userDone ? "MVP erledigt" : "MVP Voting"}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  {collapsedSummary}
                </div>
              </div>
            </div>

            <div className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
              Aufklappen
            </div>
          </button>
        </section>
      ) : (
        <section className={shellClassName}>
          <div className="relative">
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className={`absolute right-0 top-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                userDone
                  ? "border border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Einklappen
            </button>

            <div className="pr-28">
              <div className={`text-sm font-semibold ${titleColorClass}`}>
                ⭐ MVP Voting
              </div>

              <h2 className="mt-1 text-lg font-extrabold tracking-tight text-slate-950">
                Spieler des Trainings wählen
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Alle anwesenden Teilnehmer können hier direkt ihren MVP wählen.
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <VoteCountPill
                  voteCount={state.voteCount}
                  eligibleVoterCount={state.eligibleVoterCount}
                  votingOpen={votingOpen}
                />

                <ResultPill
                  text={
                    votingOpen
                      ? `Offen bis ${state.revealLabel}`
                      : `Ergebnis seit ${state.revealLabel}`
                  }
                  tone={pillTone}
                />

                {mvpAccess && !mvpAccess.isPro ? (
                  <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                    Free: {mvpAccess.usedThisSeason}/{mvpAccess.freeLimit} MVP-Abstimmungen genutzt
                  </span>
                ) : mvpAccess?.isPro ? (
                  <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    Pro: MVP unbegrenzt
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {err ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </div>
          ) : null}

          {msg ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {msg}
            </div>
          ) : null}

          {shareMsg ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
              {shareMsg}
            </div>
          ) : null}

          {showMvpLimitLock ? (
            <div className="mt-4">
              <ProFeatureLock
                clubName={state.clubName}
                title="4 kostenlose MVP-Abstimmungen genutzt"
                description={`Ihr habt die ${mvpAccess?.freeLimit ?? 4} kostenlosen MVP-Abstimmungen dieser Saison ausgeschöpft. Mit strikr Pro bleibt MVP Voting für euer Team unbegrenzt aktiv.`}
                featureList={[
                  "Unbegrenztes MVP Voting pro Saison",
                  "MVP-Badges und Fortschritt",
                  "MVP- und Ergebnis-Share-Cards",
                  "Awards, Serien und Trophäenraum",
                ]}
                compact
              />
            </div>
          ) : votingOpen ? (
            <>
              <div
                className={`mt-4 rounded-2xl border px-4 py-4 ${
                  state.userHasVoted
                    ? "border-emerald-200 bg-white"
                    : "border-amber-200 bg-white"
                }`}
              >
                <div
                  className={`text-sm font-semibold ${
                    state.userHasVoted ? "text-emerald-800" : "text-amber-800"
                  }`}
                >
                  {state.voteCount} von {state.eligibleVoterCount} haben
                  abgestimmt
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all ${
                      state.userHasVoted ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <div className="mt-3 text-xs text-slate-500">
                  Sichtbar ist nur, wer bereits abgestimmt hat — nicht, für wen.
                </div>

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={handleShareVotingReminder}
                    disabled={sharingVotingReminder}
                    className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    {sharingVotingReminder
                      ? "Bereite Teilen vor…"
                      : "Voting teilen"}
                  </button>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Teilt eine kurze Erinnerung mit Link zur Session.
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {state.votedByNames.length > 0 ? (
                    state.votedByNames.map((name) => (
                      <span
                        key={name}
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                          state.userHasVoted
                            ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
                            : "border border-amber-200 bg-amber-50 text-amber-900"
                        }`}
                      >
                        {name}
                      </span>
                    ))
                  ) : (
                    <div className="text-sm text-slate-500">
                      Bisher hat noch niemand abgestimmt.
                    </div>
                  )}
                </div>
              </div>

              {state.canVote ? (
                <div className="mt-4">
                  <div className="mb-3 text-sm font-semibold text-slate-900">
                    {state.userHasVoted
                      ? "Stimme ändern"
                      : "Wer war heute euer Spieler des Trainings?"}
                  </div>

                  {state.userHasVoted ? (
                    <div className="mb-3 rounded-2xl border border-emerald-200 bg-white px-4 py-4">
                      <div className="text-sm font-semibold text-emerald-800">
                        Deine Stimme wurde gezählt
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        {selectedPlayerName
                          ? `Aktuell gewählt: ${selectedPlayerName}.`
                          : "Du hast bereits abgestimmt."}{" "}
                        Du kannst deine Stimme bis {state.revealLabel} noch
                        ändern.
                      </div>
                    </div>
                  ) : null}

                  <div className="grid gap-2 sm:grid-cols-2">
                    {state.participants.map((player) => {
                      const active = selectedPlayerId === player.id;
                      const badge = getBadgeMetaFromMvpCount(player.mvpCount);

                      return (
                        <button
                          key={player.id}
                          type="button"
                          onClick={() => setSelectedPlayerId(player.id)}
                          className={[
                            "rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition",
                            active
                              ? state.userHasVoted
                                ? "border-emerald-400 bg-emerald-100 text-emerald-900"
                                : "border-amber-400 bg-amber-100 text-amber-900"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                          ].join(" ")}
                        >
                          <div className="flex items-center gap-2">
                            <span className="truncate">{player.name}</span>
                            <PlayerBadge
                              badgeKey={badge.key}
                              size="sm"
                              hideIfNone
                              title={badge.label}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleVoteSubmit}
                      disabled={!selectedPlayerId || saving}
                      className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving
                        ? "Speichere…"
                        : state.userHasVoted
                          ? "Stimme ändern"
                          : "Stimme abgeben"}
                    </button>

                    <div className="text-xs text-slate-500">
                      Ergebnis ab {state.revealLabel}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
                  Abstimmen können nur anwesende Teilnehmer mit verknüpftem
                  Spielerprofil.
                </div>
              )}
            </>
          ) : (
            <div className="mt-4 space-y-4">
              {state.results?.winners && state.results.winners.length > 0 ? (
                state.results.winners.length === 1 ? (
                  <MergedWinnerCard
                    winner={state.results.winners[0]}
                    badgeUpgrade={badgeUpgrade}
                  />
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                      <div className="text-sm font-semibold text-slate-700">
                        MVP Ergebnis
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        Gleichstand mit je {state.results.winners[0].votes}{" "}
                        Stimmen
                      </div>
                    </div>

                    {state.results.winners.map((winner) => (
                      <MergedWinnerCard
                        key={winner.playerId}
                        winner={winner}
                        badgeUpgrade={getBadgeUpgradeForPlayer(
                          badgeUpgrades,
                          winner.playerId,
                          badgeUpgrade
                        )}
                      />
                    ))}
                  </div>
                )
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
                  Noch keine Stimmen abgegeben.
                </div>
              )}

              {state.results ? (
                <div className="rounded-[24px] border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                        Share Moment
                      </div>
                      <div className="mt-1 text-base font-extrabold tracking-tight text-slate-950">
                        {shareData?.mode === "winner"
                          ? "Deine MVP Card ist bereit"
                          : "Das MVP Ergebnis ist bereit"}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        {shareData?.mode === "winner"
                          ? "Teile deinen MVP-Moment direkt mit Team und Gruppe."
                          : "Teile das finale MVP-Ergebnis direkt mit deinem Team."}
                      </div>
                    </div>

                    <div className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                      strikr
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <button
                      type="button"
                      onClick={handleShareMvpResult}
                      disabled={sharingResult}
                      className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3.5 text-base font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {sharingResult
                        ? "Bereite Card vor…"
                        : shareData?.mode === "winner"
                          ? "Meinen MVP teilen"
                          : "MVP Ergebnis teilen"}
                    </button>

                    {shareData && shareData.winners.length > 1 ? (
                      <div className="rounded-2xl border border-slate-200 bg-white p-3">
                        <div className="px-1 pb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                          Einzelne MVP Cards
                        </div>
                        <div className="space-y-2">
                          {shareData.winnerCards.map((winnerCard) => (
                            <button
                              key={winnerCard.winner.playerId}
                              type="button"
                              onClick={() =>
                                handleShareWinnerCard(winnerCard.winner.playerId)
                              }
                              disabled={sharingWinnerPlayerId !== null}
                              className="inline-flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <span className="truncate">
                                {winnerCard.winner.name}
                              </span>
                              <span className="shrink-0 text-xs font-extrabold text-slate-500">
                                {sharingWinnerPlayerId === winnerCard.winner.playerId
                                  ? "Bereite vor…"
                                  : "teilen"}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {state.votedByNames.length > 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900">
                        Abgestimmt haben
                      </div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">
                        {state.votedByNames.length} von{" "}
                        {state.eligibleVoterCount} Stimmen wurden abgegeben.
                      </div>
                    </div>

                    <div className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                      Voting beendet
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {state.votedByNames.map((name) => (
                      <span
                        key={name}
                        className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {state.results?.leaderboard &&
              state.results.leaderboard.length > 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-slate-900">
                      Voting-Ergebnis
                    </div>
                    <div className="text-xs font-semibold text-slate-500">
                      {state.voteCount}{" "}
                      {state.voteCount === 1 ? "Stimme" : "Stimmen"}
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    {state.results.leaderboard.map((entry, index) => {
                      const badge = getBadgeMetaFromMvpCount(entry.mvpCount);

                      return (
                        <div
                          key={entry.playerId}
                          className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                              {index + 1}
                            </div>

                            <div className="flex min-w-0 items-center gap-2">
                              <div className="truncate text-sm font-semibold text-slate-900">
                                {entry.name}
                              </div>
                              <PlayerBadge
                                badgeKey={badge.key}
                                size="sm"
                                hideIfNone
                                title={badge.label}
                              />
                            </div>
                          </div>

                          <div className="shrink-0 text-sm font-semibold text-slate-600">
                            {entry.votes}{" "}
                            {entry.votes === 1 ? "Stimme" : "Stimmen"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </section>
      )}
    </>
  );
}