"use client";

import Link from "next/link";
import { LoaderCircle, Medal, X } from "lucide-react";
import AchievementBadgeVisual from "@/components/badges/AchievementBadgeVisual";
import { useCallback, useEffect, useRef, useState } from "react";
import type { TeamFeedItem } from "@/lib/team-feed";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

export default function HomeTeamFeedPreview({
  items: initialItems,
  initialOffset,
  initialHasMore,
}: {
  items: TeamFeedItem[];
  initialOffset: number;
  initialHasMore: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  const [offset, setOffset] = useState(initialOffset);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [openBadge, setOpenBadge] = useState<TeamFeedItem | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);

    try {
      const response = await fetch(
        `/api/team-feed?offset=${offset}&limit=8`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        throw new Error("Feed konnte nicht nachgeladen werden.");
      }

      const payload = (await response.json()) as {
        items?: TeamFeedItem[];
        nextOffset?: number | null;
        hasMore?: boolean;
      };

      const nextItems = payload.items ?? [];

      setItems((currentItems) => {
        const knownIds = new Set(currentItems.map((item) => item.id));
        return [
          ...currentItems,
          ...nextItems.filter((item) => !knownIds.has(item.id)),
        ];
      });

      setHasMore(payload.hasMore === true);
      setOffset(
        typeof payload.nextOffset === "number"
          ? payload.nextOffset
          : offset + nextItems.length,
      );
    } catch (error) {
      console.error(error);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [hasMore, loading, offset]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: "500px 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  useEffect(() => {
    if (!openBadge) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenBadge(null);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openBadge]);

  return (
    <>
      <section className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
        <div>
          <h2 className="text-base font-black tracking-tight text-slate-950">
            Kabinen-Talk
          </h2>
          <div className="mt-0.5 text-[10px] font-bold text-slate-400">
            Was bei euch passiert.
          </div>
        </div>

        {items.length > 0 ? (
          <div className="mt-2 space-y-1">
            {items.map((item) => {
              if (item.kind === "badge" && item.badgeKey) {
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl px-1 py-3 transition hover:bg-slate-50"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenBadge(item)}
                      aria-label={`${item.title} Details ansehen`}
                      title="Badge-Details ansehen"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition hover:bg-amber-50 active:scale-95"
                    >
                      <AchievementBadgeVisual badgeKey={item.badgeKey} size="lg" />
                    </button>

                    <Link
                      href={item.href}
                      className="flex min-w-0 flex-1 items-center gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-black text-slate-950">
                          {item.title}
                        </div>
                        {item.body ? (
                          <div className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">
                            {item.body}
                          </div>
                        ) : null}
                        {item.actorName ? (
                          <div className="mt-1 text-[10px] font-black text-violet-600">
                            Vergleiche dich mit {item.actorName} →
                          </div>
                        ) : null}
                      </div>

                      <div className="shrink-0 text-[10px] font-bold text-slate-400">
                        {formatDate(item.occurredAt)}
                      </div>
                    </Link>
                  </div>
                );
              }

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-center gap-3 rounded-xl px-1 py-3 transition hover:bg-slate-50"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Medal className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-black text-slate-950">
                      {item.title}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">
                      {item.body}
                    </div>
                  </div>

                  <div className="shrink-0 text-[10px] font-bold text-slate-400">
                    {formatDate(item.occurredAt)}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="mt-3 text-xs font-semibold text-slate-500">
            Noch keine Team-Ereignisse vorhanden.
          </div>
        )}

        {hasMore ? (
          <div
            ref={sentinelRef}
            className="flex min-h-8 items-center justify-center pt-2 text-slate-400"
            aria-live="polite"
          >
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          </div>
        ) : null}
      </section>

      {openBadge?.badgeKey ? (
        <div
          className="fixed inset-0 z-[700] flex items-start justify-center bg-slate-950/35 px-4 pt-[calc(5.5rem+env(safe-area-inset-top))] backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-label={openBadge.title}
          onClick={() => setOpenBadge(null)}
        >
          <div
            className="relative flex w-full max-w-sm items-center gap-3 rounded-[22px] border border-slate-200 bg-white p-4 pr-12 text-left shadow-[0_24px_70px_rgba(15,23,42,0.24)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex h-16 w-16 shrink-0 items-center justify-center">
              <AchievementBadgeVisual badgeKey={openBadge.badgeKey} size="xl" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-600">
                {openBadge.badgeKey.startsWith("career_") ? "Karriere-Badge" : "Badge"}
              </div>
              <div className="mt-1 text-sm font-black leading-5 text-slate-950">
                {openBadge.title}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpenBadge(null)}
              aria-label="Schließen"
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
