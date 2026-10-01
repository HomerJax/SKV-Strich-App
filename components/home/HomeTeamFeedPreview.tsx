"use client";

import Link from "next/link";
import { LoaderCircle, Medal, X } from "lucide-react";
import AchievementBadgeVisual from "@/components/badges/AchievementBadgeVisual";
import { useCallback, useEffect, useRef, useState } from "react";
import type { TeamFeedItem } from "@/lib/team-feed";
import { useI18n } from "@/components/i18n/I18nProvider";
import type { AppLocale } from "@/lib/i18n/config";
import { trackProductEvent } from "@/components/ProductAnalyticsTracker";

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
  const [reactionBusy, setReactionBusy] = useState<string | null>(null);
  const [openReactions, setOpenReactions] = useState<string | null>(null);
  const [reactionBoom, setReactionBoom] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const { locale, t } = useI18n();

  const toggleReaction = async (itemId: string, reaction: string) => {
    if (reactionBusy === itemId) return;

    setReactionBusy(itemId);
    const previous = items;
    const target = items.find((item) => item.id === itemId);
    const willActivate = !(target?.myReactions ?? []).includes(reaction);
    if (willActivate) {
      setReactionBoom(itemId);
      window.setTimeout(() => setReactionBoom((current) => current === itemId ? null : current), 650);
    }

    setItems((current) =>
      current.map((item) => {
        if (item.id !== itemId) return item;

        const currentReactions = item.myReactions ?? [];
        const alreadyActive = currentReactions.includes(reaction);
        const reactions = { ...(item.reactions ?? {}) };

        for (const currentReaction of currentReactions) {
          reactions[currentReaction] = Math.max(
            0,
            (reactions[currentReaction] ?? 0) - 1,
          );
        }

        if (!alreadyActive) {
          reactions[reaction] = (reactions[reaction] ?? 0) + 1;
        }

        return {
          ...item,
          reactions,
          myReactions: alreadyActive ? [] : [reaction],
        };
      }),
    );

    try {
      const response = await fetch("/api/team-feed/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedId: itemId, reaction }),
      });

      if (!response.ok) throw new Error("reaction_failed");
    } catch {
      setItems(previous);
    } finally {
      setReactionBusy(null);
    }
  };

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);

    try {
      const response = await fetch(
        `/api/team-feed?offset=${offset}&limit=8`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        throw new Error(t("teamFeed.loadMoreFailed"));
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
  }, [hasMore, loading, offset, t]);

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
      <section className="rounded-2xl border border-slate-200/90 bg-white px-4 py-4">
        <div>
          <h2 className="text-base font-bold tracking-tight text-slate-900">
            {t("teamFeed.title")}
          </h2>
          <div className="mt-0.5 text-[10px] font-medium text-slate-400">
            {t("teamFeed.subtitle")}
          </div>
        </div>

        {items.length > 0 ? (
          <div className="mt-2 divide-y divide-slate-100">
            {items.map((item) => {
              if (item.kind === "badge" && item.badgeKey) {
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 px-1 py-3 transition hover:bg-slate-50/70"
                  >
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        trackProductEvent("badge_open", { badgeKey: item.badgeKey });
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
                      onClick={() => trackProductEvent(item.actorName ? "compare_open" : "team_feed_open", { kind: item.kind })}
                      className="flex min-w-0 flex-1 items-center gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        {item.body ? (
                          <div className="text-[10px] font-semibold leading-4 text-amber-600">
                            {item.body}
                          </div>
                        ) : null}
                        <div className="mt-0.5 line-clamp-2 text-[13px] font-semibold leading-5 text-slate-900">
                          {item.title}
                        </div>
                        {item.actorName ? (
                          <div className="mt-1 text-[10px] font-semibold text-cyan-700">
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

              if (item.kind === "birthday" || item.kind === "beer" || item.kind === "late_rsvp") {
                const options = item.kind === "beer"
                  ? [{ key: "biermaschine", label: locale === "de" ? "FEIER ICH" : "LOVE IT" }]
                  : item.kind === "late_rsvp"
                    ? [
                        { key: "daumen_hoch", label: "👍" },
                        { key: "geilo", label: locale === "de" ? "GEILO 😄" : "NICE 😄" },
                      ]
                    : [{ key: "glueckwunsch", label: locale === "de" ? "GLÜCKWUNSCH" : "CONGRATS" }];

                return (
                  <div key={item.id} className="px-1 py-3">
                    <div className="flex items-start gap-2.5 rounded-xl px-1 py-1">
                      <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] ring-1 ring-inset ${item.kind === "beer" ? "bg-amber-50 text-amber-700 ring-amber-100/80" : item.kind === "late_rsvp" ? "bg-cyan-50 text-cyan-700 ring-cyan-100/80" : "bg-rose-50 text-rose-600 ring-rose-100/80"}`}>
                        {item.kind === "beer" ? "🍺" : item.kind === "late_rsvp" ? "⏰" : "🎂"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-bold leading-[18px] tracking-[-0.01em] text-slate-900">
                          {item.title}
                        </div>
                        <div className="mt-px text-[10px] font-medium leading-4 text-slate-400">
                          {item.body}
                        </div>
                      </div>
                      <div className="shrink-0 pt-0.5 text-[9px] font-semibold text-slate-300">
                        {formatDate(item.occurredAt, locale)}
                      </div>
                    </div>

                    <div className="relative ml-[38px] mt-2 flex flex-wrap gap-1.5">
                      {reactionBoom === item.id ? (
                        <span className="pointer-events-none absolute left-7 top-3 z-20 h-0 w-0">
                          <span className="absolute -left-7 -top-7 h-14 w-14 animate-ping rounded-full border-2 border-cyan-400/70" />
                          <span className="absolute -left-1 -top-7 h-2 w-2 animate-bounce rounded-full bg-cyan-400" />
                          <span className="absolute left-6 -top-3 h-1.5 w-1.5 animate-ping rounded-full bg-amber-400" />
                          <span className="absolute -left-7 top-3 h-2 w-2 animate-ping rounded-full bg-cyan-300" />
                          <span className="absolute left-4 top-5 h-1.5 w-1.5 animate-bounce rounded-full bg-amber-300" />
                        </span>
                      ) : null}
                      {options.map(({ key, label }) => {
                        const count = item.reactions?.[key] ?? 0;
                        const active = item.myReactions?.includes(key) === true;
                        const busy = reactionBusy === item.id;
                        return (
                          <button
                            key={key}
                            type="button"
                            aria-pressed={active}
                            disabled={busy}
                            onClick={() => void toggleReaction(item.id, key)}
                            className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[10px] transition duration-150 active:scale-90 ${active ? `${reactionBoom === item.id ? "scale-125" : "scale-[1.04]"} border-cyan-500 bg-cyan-500 font-extrabold uppercase tracking-[0.02em] text-white shadow-[0_4px_12px_rgba(6,182,212,0.24)] ring-2 ring-cyan-100` : "border-slate-200 bg-white font-semibold text-slate-500 shadow-sm hover:border-slate-300 hover:text-slate-700"}`}
                          >
                            <span>{active ? "🙌 " : ""}{label}</span>
                            {count > 0 ? (
                              <span className={`min-w-[14px] rounded-full px-1 text-center text-[9px] font-bold tabular-nums ${active ? "bg-white/90 text-cyan-700" : "bg-slate-100 text-slate-400"}`}>
                                {count}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => trackProductEvent("team_feed_open", { kind: item.kind })}
                  className="flex items-center gap-3 px-1 py-3 transition hover:bg-slate-50/70"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Medal className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-900">
                      {item.title}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] font-normal text-slate-500">
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
