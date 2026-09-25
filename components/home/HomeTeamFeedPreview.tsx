"use client";

import Link from "next/link";
import { LoaderCircle, Medal, Trophy } from "lucide-react";
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

  return (
    <section className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <h2 className="text-base font-black tracking-tight text-slate-950">
        Neu im Team
      </h2>

      {items.length > 0 ? (
        <div className="mt-2 space-y-1">
          {items.map((item) => {
            const Icon = item.kind === "badge" ? Trophy : Medal;

            return (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-center gap-3 rounded-xl px-1 py-3 transition hover:bg-slate-50"
              >
                <div
                  className={
                    item.kind === "badge"
                      ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600"
                      : "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"
                  }
                >
                  <Icon className="h-4 w-4" />
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
  );
}
