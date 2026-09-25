"use client";

import Link from "next/link";
import { LoaderCircle, Medal, X } from "lucide-react";
import AchievementBadgeVisual from "@/components/badges/AchievementBadgeVisual";
import { useCallback, useEffect, useRef, useState } from "react";
import type { TeamFeedItem } from "@/lib/team-feed";
import { useI18n } from "@/components/i18n/I18nProvider";
import type { AppLocale } from "@/lib/i18n/config";

function formatDate(value: string, locale: AppLocale) {
  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
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
  const { locale, t } = useI18n();

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
            {t("teamFeed.title")}
          </h2>
          <div className="mt-0.5 text-[10px] font-bold text-slate-400">
            {t("teamFeed.subtitle")}
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
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setOpenBadge(item);
                      }}
                      aria-label={t("teamFeed.viewDetails", { title: item.title })}
                      title={t("teamFeed.badgeDetails")}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition hover:bg-amber-50 active:scale-95"
                    >
                      <AchievementBadgeVisual badgeKey={item.badgeKey} size="lg" interactive={false} />
                    </button>

                    <Link
                      href={item.href}
                      className="flex min-w-0 flex-1 items-center gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        {item.body ? (
                          <div className="text-[10px] font-black leading-4 text-amber-600">
                            {item.body}
                          </div>
                        ) : null}
                        <div className="mt-0.5 line-clamp-2 text-[13px] font-black leading-4 text-slate-950">
                          {item.title}
                        </div>
                        {item.actorName ? (
                          <div className="mt-1 text-[10px] font-black text-violet-600">
                            {t("teamFeed.compare", { name: item.actorName })}
                          </div>
                        ) : null}
                      </div>

                      <div className="shrink-0 text-[10px] font-bold text-slate-400">
                        {formatDate(item.occurredAt, locale)}
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
                    {formatDate(item.occurredAt, locale)}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="mt-3 text-xs font-semibold text-slate-500">
            {t("teamFeed.empty")}
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
          className="fixed inset-0 z-[700] flex items-center justify-center bg-slate-950/75 px-5 py-8 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={openBadge.title}
          onClick={() => setOpenBadge(null)}
        >
          <div
            className="relative w-full max-w-sm overflow-hidden rounded-[30px] border border-white/10 bg-[#070b12] px-5 pb-7 pt-5 text-center text-white shadow-[0_28px_90px_rgba(0,0,0,0.45)]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpenBadge(null)}
              aria-label={t("teamFeed.close")}
              className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/15 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300/80">
              {openBadge.badgeKey.startsWith("career_")
                ? t("teamFeed.careerBadge")
                : "strikr Badge"}
            </div>

            <div className="relative mx-auto mt-5 flex h-52 w-52 items-center justify-center">
              <div className="absolute inset-5 rounded-full bg-cyan-300/10 blur-3xl" />
              <div className="relative scale-[2.45]">
                <AchievementBadgeVisual badgeKey={openBadge.badgeKey} size="xl" interactive={false} />
              </div>
            </div>

            <div className="mx-auto mt-5 max-w-[18rem] text-lg font-black leading-6 tracking-tight text-white">
              {openBadge.badgeDetailText ?? openBadge.title}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
