"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  createMvpShareFileFromImageUrl,
  sharePreparedMvpFile,
} from "@/lib/share/mvp-share";
import type { LeaderboardEntry } from "@/components/share/mvp-share/mvp-share.types";

type HomeMvpHighlightCardProps = {
  notificationKey: string;
  sessionId: number;
  sessionHref: string;
  clubName: string;
  clubLogoUrl: string | null;
  strikrLogoUrl: string;
  sessionDateLabel: string;
  isWinner: boolean;
  winner: LeaderboardEntry;
  winners?: LeaderboardEntry[];
  leaderboard: LeaderboardEntry[];
  badgeImageUrl: string;
};

export default function HomeMvpHighlightCard({
  notificationKey,
  sessionId,
  sessionHref,
  clubName,
  clubLogoUrl,
  strikrLogoUrl,
  sessionDateLabel,
  isWinner,
  winner,
  winners = [],
  leaderboard,
  badgeImageUrl,
}: HomeMvpHighlightCardProps) {
  const shareFileRef = useRef<File | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(notificationKey);
    setDismissed(storedValue === "dismissed");
  }, [notificationKey]);

  const title = isWinner
    ? "Du wurdest zum MVP gewählt."
    : `${winner.name} wurde MVP.`;

  const badgeLine = `Das ${winner.badgeLabel} Badge wurde freigeschaltet.`;

  const mode = isWinner ? "winner" : "team";

  const topThree = useMemo(() => leaderboard.slice(0, 3), [leaderboard]);

  useEffect(() => {
    const imageUrl =
      mode === "winner"
        ? `/api/share/mvp/${sessionId}/image?variant=winner&playerId=${winner.playerId}`
        : `/api/share/mvp/${sessionId}/image?variant=team`;

    const fileName =
      mode === "winner"
        ? `strikr-mvp-winner-${sessionId}.png`
        : `strikr-mvp-result-${sessionId}.png`;

    shareFileRef.current = null;

    void createMvpShareFileFromImageUrl({
      imageUrl,
      fileName,
    })
      .then((file) => {
        shareFileRef.current = file;
      })
      .catch((error) => {
        console.error("[HOME MVP SHARE PREP FAILED]", imageUrl, error);
        shareFileRef.current = null;
      });
  }, [mode, sessionId, winner.playerId]);

  function dismiss() {
    window.localStorage.setItem(notificationKey, "dismissed");
    setDismissed(true);
  }

  async function handleShare() {
    const preparedFile = shareFileRef.current;

    if (!preparedFile) {
      setShareError("MVP Share Card wird noch vorbereitet. Bitte kurz warten.");
      return;
    }

    try {
      setSharing(true);
      setShareError(null);

      await sharePreparedMvpFile({
        file: preparedFile,
        fileName:
          mode === "winner"
            ? `strikr-mvp-winner-${sessionId}.png`
            : `strikr-mvp-result-${sessionId}.png`,
        title: mode === "winner" ? "Ich wurde zum MVP gewählt" : "MVP Ergebnis",
        text:
          mode === "winner"
            ? "Meine MVP Card aus strikr."
            : "Das MVP Ergebnis aus strikr.",
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareError("Teilen konnte nicht vorbereitet werden. Bitte erneut versuchen.");
    } finally {
      setSharing(false);
    }
  }

  if (dismissed) return null;

  return (
    <>
      <section className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[#020617] p-4 text-white shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.14),transparent_26%),radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.08),transparent_30%)]" />

        <button
          type="button"
          onClick={dismiss}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white/70"
          aria-label="MVP Highlight ausblenden"
        >
          ×
        </button>

        <div className="relative pr-9">
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-white/45">
            MVP Highlight
          </div>

          <div className="mt-3 flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={badgeImageUrl}
              alt=""
              className="h-24 w-24 shrink-0 object-contain drop-shadow-2xl"
            />

            <div className="min-w-0">
              <h2 className="text-xl font-black leading-tight tracking-[-0.04em]">
                {title}
              </h2>
              <p className="mt-1 text-sm font-semibold text-white/60">
                {badgeLine}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-black">
                  MVP #{winner.current}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-black text-white/65">
                  {winner.previous} → {winner.current}
                </span>
              </div>
            </div>
          </div>

          {topThree.length > 1 ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                Voting Ergebnis
              </div>
              <div className="mt-2 space-y-1.5">
                {topThree.map((entry, index) => (
                  <div
                    key={entry.playerId}
                    className="flex justify-between gap-3 text-xs font-bold text-white/70"
                  >
                    <span className="truncate">
                      {index + 1}. {entry.name}
                    </span>
                    <span className="shrink-0">{entry.votes}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {shareError ? (
            <div className="mt-3 rounded-2xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100">
              {shareError}
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleShare}
              disabled={sharing}
              className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-black disabled:opacity-60"
            >
              {sharing ? "Bereite Card vor…" : isWinner ? "Teilen" : "Ergebnis teilen"}
            </button>

            <Link
              href={sessionHref}
              className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center text-sm font-black text-white"
            >
              Session ansehen
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}