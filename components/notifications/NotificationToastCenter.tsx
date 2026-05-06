"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import MvpSharePreviewCard from "@/components/share/mvp-share/MvpSharePreviewCard";
import MvpShareImage from "@/components/share/mvp-share/MvpShareImage";
import type { LeaderboardEntry as ShareLeaderboardEntry } from "@/components/share/mvp-share/mvp-share.types";
import { shareMvpResult } from "@/lib/share/mvp-share";

type PayloadLeaderboardEntry = {
  playerId: number;
  name: string;
  votes: number;
  mvpCount?: number;
};

type PayloadWinnerEntry = {
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

type NotificationPayload = {
  sessionId?: number;
  clubName?: string;
  winnerName?: string;
  isWinner?: boolean;
  leaderboard?: PayloadLeaderboardEntry[];
  winners?: PayloadWinnerEntry[];
  badgeUpgrade?: BadgeUpgrade | null;
};

type NotificationItem = {
  id: number;
  type: string;
  title: string;
  body: string | null;
  cta_href: string | null;
  cta_label: string | null;
  payload: NotificationPayload | null;
  created_at: string;
  seen_at: string | null;
};

function getTypeLabel(type: string) {
  switch (type) {
    case "badge_awarded":
      return "Badge";
    case "mvp_winner":
      return "MVP";
    case "mvp_result":
      return "MVP Ergebnis";
    default:
      return "Info";
  }
}

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 1000 / 60);

  if (diffMin < 1) return "Gerade eben";
  if (diffMin < 60) return `Vor ${diffMin} Min.`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Vor ${diffHours} Std.`;

  const diffDays = Math.floor(diffHours / 24);
  return `Vor ${diffDays} Tag${diffDays === 1 ? "" : "en"}`;
}

function isMvpNotification(notification: NotificationItem) {
  return notification.type === "mvp_winner" || notification.type === "mvp_result";
}

function safeNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getBadgeLabel(count: number) {
  if (count >= 10) return "GOAT";
  if (count >= 7) return "Gold";
  if (count >= 5) return "Silber";
  if (count >= 3) return "Bronze";
  return "Blech";
}

function getBadgeKey(count: number) {
  if (count >= 10) return "goat";
  if (count >= 7) return "gold";
  if (count >= 5) return "silber";
  if (count >= 3) return "bronze";
  return "blech";
}

function toShareEntry(
  entry: PayloadLeaderboardEntry | PayloadWinnerEntry,
  badgeUpgrade?: BadgeUpgrade | null
): ShareLeaderboardEntry {
  const fallbackCurrent = Math.max(safeNumber(entry.mvpCount), 1);

  const current =
    badgeUpgrade?.playerId === entry.playerId
      ? Math.max(safeNumber(badgeUpgrade.newMvpCount), fallbackCurrent)
      : fallbackCurrent;

  const previous =
    badgeUpgrade?.playerId === entry.playerId
      ? Math.max(safeNumber(badgeUpgrade.previousMvpCount), 0)
      : Math.max(current - 1, 0);

  const label = getBadgeLabel(current);

  return {
    playerId: entry.playerId,
    name: entry.name,
    votes: entry.votes,
    previous,
    current,
    badgeLabel: label,
    earnedBadgeText: `${label} strikr badge`,
  };
}

function buildShareData(notification: NotificationItem) {
  const payload = notification.payload;
  if (!payload) return null;

  const winnerSource = payload.winners?.[0] ?? payload.leaderboard?.[0];
  if (!winnerSource) return null;

  const winner = toShareEntry(winnerSource, payload.badgeUpgrade);
  const leaderboard = (payload.leaderboard ?? [winnerSource]).map((entry) =>
    toShareEntry(entry, payload.badgeUpgrade)
  );

  const isWinner = payload.isWinner === true;
  const badgeKey = getBadgeKey(winner.current);

  return {
    mode: isWinner ? "winner" : "team",
    clubName: payload.clubName ?? "strikr Team",
    sessionDateLabel: "MVP Ergebnis",
    strikrLogoUrl: "/brand/strikr-mark.png",
    clubLogoUrl: "/brand/strikr-mark.png",
    badgeImageUrl: `/badges/hero/${badgeKey}.webp`,
    winner,
    leaderboard,
  } as const;
}

function getDisplayText(notification: NotificationItem) {
  const payload = notification.payload;
  const shareData = buildShareData(notification);
  const badgeLabel = shareData ? getBadgeLabel(shareData.winner.current) : null;
  const winnerName =
    payload?.winnerName ?? payload?.winners?.[0]?.name ?? payload?.leaderboard?.[0]?.name;

  if (notification.type === "mvp_winner") {
    return {
      title: "Du wurdest zum MVP gewählt.",
      body: badgeLabel
        ? `Du hast das ${badgeLabel} Badge freigeschaltet.`
        : "Deine MVP Card ist bereit.",
      cta: "Teilen",
    };
  }

  if (notification.type === "mvp_result") {
    return {
      title: winnerName ? `${winnerName} wurde MVP.` : "MVP Ergebnis ist da.",
      body: badgeLabel
        ? `${badgeLabel} Badge freigeschaltet.`
        : "Das MVP Ergebnis ist bereit.",
      cta: "Ergebnis ansehen",
    };
  }

  return {
    title: notification.title,
    body: notification.body,
    cta: notification.cta_label,
  };
}

export function NotificationToastCenter() {
  const pathname = usePathname();
  const shareRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyIds, setBusyIds] = useState<number[]>([]);
  const [errorById, setErrorById] = useState<Record<number, string>>({});

  async function loadNotifications() {
    try {
      const res = await fetch("/api/notifications/unseen", {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) return;

      const json = (await res.json()) as {
        notifications?: NotificationItem[];
      };

      setNotifications(json.notifications ?? []);
    } catch {
      // bewusst still
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadNotifications();
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [pathname]);

  useEffect(() => {
    function handleFocus() {
      void loadNotifications();
    }

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  async function markSeen(id: number) {
    const res = await fetch(`/api/notifications/${id}/seen`, {
      method: "POST",
    });

    if (!res.ok) return;

    setNotifications((prev) => prev.filter((item) => item.id !== id));
  }

  async function dismissNotification(id: number) {
    setBusyIds((prev) => [...prev, id]);

    try {
      await markSeen(id);
    } finally {
      setBusyIds((prev) => prev.filter((item) => item !== id));
    }
  }

  async function handleCta(notification: NotificationItem) {
    const isMvp = isMvpNotification(notification);
    const isWinner = notification.payload?.isWinner === true;

    setBusyIds((prev) => [...prev, notification.id]);
    setErrorById((prev) => {
      const next = { ...prev };
      delete next[notification.id];
      return next;
    });

    try {
      if (isMvp) {
        const element = shareRefs.current[notification.id];

        if (!element) {
          throw new Error("MVP Share Card ist noch nicht bereit.");
        }

        await shareMvpResult({
          element,
          fileName: isWinner
            ? `strikr-mvp-winner-${notification.payload?.sessionId ?? notification.id}.png`
            : `strikr-mvp-result-${notification.payload?.sessionId ?? notification.id}.png`,
          title: isWinner ? "Ich wurde zum MVP gewählt" : "MVP Ergebnis",
          text: isWinner
            ? "Meine MVP Card aus strikr."
            : "Das MVP Ergebnis aus strikr.",
        });

        await markSeen(notification.id);
        return;
      }

      if (notification.cta_href) {
        await markSeen(notification.id);
        window.location.href = notification.cta_href;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setErrorById((prev) => ({
        ...prev,
        [notification.id]: "Teilen konnte nicht gestartet werden.",
      }));
    } finally {
      setBusyIds((prev) => prev.filter((item) => item !== notification.id));
    }
  }

  const visibleNotifications = useMemo(
    () => notifications.slice(0, 2),
    [notifications]
  );

  if (loading || visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-3 px-3 sm:top-4 sm:px-4">
      {visibleNotifications.map((notification) => {
        const isBusy = busyIds.includes(notification.id);
        const isMvp = isMvpNotification(notification);
        const payload = notification.payload;
        const isWinner = payload?.isWinner === true;
        const shareData = isMvp ? buildShareData(notification) : null;
        const display = getDisplayText(notification);

        return (
          <div
            key={notification.id}
            className="pointer-events-auto relative w-full max-w-[22rem] overflow-hidden rounded-[26px] border border-white/10 bg-[#020617] shadow-2xl sm:max-w-sm"
          >
            {shareData ? (
              <div
                aria-hidden="true"
                className="pointer-events-none fixed left-[-200vw] top-0"
              >
                <div
                  ref={(node) => {
                    shareRefs.current[notification.id] = node;
                  }}
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
                    leaderboard={shareData.leaderboard}
                  />
                </div>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => void dismissNotification(notification.id)}
              disabled={isBusy}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/55 text-base font-black text-white/80 shadow-lg backdrop-blur transition hover:bg-black/75 hover:text-white disabled:opacity-50"
              aria-label="Benachrichtigung schließen"
            >
              ×
            </button>

            {isMvp ? (
              <div className="p-2.5 sm:p-3">
                <MvpSharePreviewCard
                  isWinner={isWinner}
                  winnerName={payload?.winnerName}
                  leaderboard={payload?.leaderboard}
                  badgeUpgrade={payload?.badgeUpgrade}
                />
              </div>
            ) : null}

            <div className="p-3.5 pt-1.5 sm:p-4 sm:pt-2">
              <div className="mb-2 pr-10">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white/70">
                    {getTypeLabel(notification.type)}
                  </span>
                  <span className="text-[11px] text-white/40">
                    {formatRelativeTime(notification.created_at)}
                  </span>
                </div>

                <p className="text-[13px] font-black leading-snug text-white sm:text-sm">
                  {display.title}
                </p>

                {display.body ? (
                  <p className="mt-1 text-[12px] font-semibold leading-snug text-white/58 sm:text-sm">
                    {display.body}
                  </p>
                ) : null}
              </div>

              {errorById[notification.id] ? (
                <div className="mt-3 rounded-2xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100">
                  {errorById[notification.id]}
                </div>
              ) : null}

              {display.cta ? (
                <button
                  type="button"
                  onClick={() => void handleCta(notification)}
                  disabled={isBusy}
                  className="mt-3 inline-flex w-full justify-center rounded-xl bg-white px-3 py-2 text-sm font-black text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isBusy
                    ? isMvp
                      ? "Öffne Teilen…"
                      : "Öffne…"
                    : display.cta}
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}