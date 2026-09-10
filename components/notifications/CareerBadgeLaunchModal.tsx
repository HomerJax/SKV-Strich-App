"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BIG_UPDATE_SEEN_EVENT,
  BIG_UPDATE_STORAGE_KEY,
} from "@/components/notifications/BigUpdateLaunchModal";

const BADGES: Record<string, { title: string; artwork: string }> = {
  career_appearances_10: { title: "10 Einsätze", artwork: "/badges/career-appearances-10-blech.png" },
  career_appearances_25: { title: "25 Einsätze", artwork: "/badges/career-appearances-25-bronze.png" },
  career_appearances_50: { title: "50 Einsätze", artwork: "/badges/career-appearances-50-silver.png" },
  career_appearances_100: { title: "100 Einsätze", artwork: "/badges/career-appearances-100-gold.png" },
  career_appearances_250: { title: "250 Einsätze", artwork: "/badges/career-appearances-250-legend.png" },
  career_appearances_500: { title: "500 Einsätze", artwork: "/badges/career-appearances-500-goat.png" },
  career_wins_1: { title: "1. Karrieresieg", artwork: "/badges/career-wins-1-blech.png" },
  career_wins_10: { title: "10 Siege", artwork: "/badges/career-wins-10-bronze.png" },
  career_wins_25: { title: "25 Siege", artwork: "/badges/career-wins-25-silver.png" },
  career_wins_50: { title: "50 Siege", artwork: "/badges/career-wins-50-gold.png" },
  career_wins_100: { title: "100 Siege", artwork: "/badges/career-wins-100-legend.png" },
  career_wins_250: { title: "250 Siege", artwork: "/badges/career-wins-250-goat.png" },
};

type LaunchData = {
  notificationId: number;
  badgeKeys: string[];
};

export default function CareerBadgeLaunchModal() {
  const [launch, setLaunch] = useState<LaunchData | null>(null);
  const [readyForCareerLaunch, setReadyForCareerLaunch] = useState(false);
  const [slide, setSlide] = useState(0);
  const [busy, setBusy] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    function checkReady() {
      setReadyForCareerLaunch(
        window.localStorage.getItem(BIG_UPDATE_STORAGE_KEY) === "seen",
      );
    }

    checkReady();
    window.addEventListener(BIG_UPDATE_SEEN_EVENT, checkReady);
    return () => window.removeEventListener(BIG_UPDATE_SEEN_EVENT, checkReady);
  }, []);

  useEffect(() => {
    if (!readyForCareerLaunch) return;

    let cancelled = false;
    void fetch("/api/badges/career-launch", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.launch) setLaunch(data.launch as LaunchData);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [readyForCareerLaunch]);

  useEffect(() => {
    if (!launch) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [launch]);

  const earnedBadges = useMemo(
    () => (launch?.badgeKeys ?? []).map((key) => ({ key, ...BADGES[key] })).filter((badge) => badge.artwork),
    [launch],
  );

  if (!launch) return null;

  const totalSlides = Math.max(1, earnedBadges.length + 1);
  const isIntro = slide === 0;
  const badge = !isIntro ? earnedBadges[slide - 1] : null;
  const isLast = slide === totalSlides - 1;

  async function finish() {
    if (!isLast || busy) return;
    try {
      setBusy(true);
      const response = await fetch(`/api/notifications/${launch!.notificationId}/seen`, {
        method: "POST",
      });
      if (!response.ok) return;
      setLaunch(null);
      window.dispatchEvent(new Event("strikr-career-badge-launch-finished"));
    } finally {
      setBusy(false);
    }
  }

  function next() {
    if (isLast) {
      void finish();
      return;
    }
    setSlide((current) => Math.min(current + 1, totalSlides - 1));
  }

  function previous() {
    setSlide((current) => Math.max(current - 1, 0));
  }

  function onTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start == null) return;
    const delta = event.changedTouches[0]?.clientX - start;
    if (Math.abs(delta) < 45) return;
    if (delta < 0) next();
    else previous();
  }

  return (
    <div className="fixed inset-0 z-[1000] flex min-h-[100dvh] flex-col bg-slate-950 text-white">
      <div
        className="flex min-h-0 flex-1 flex-col"
        onTouchStart={(event) => {
          touchStartX.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={onTouchEnd}
      >
        <div className="flex items-center justify-between px-5 pb-2 pt-[calc(1rem+env(safe-area-inset-top))] sm:px-8">
          <div className="text-lg font-black tracking-tight">strikr</div>
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
            {slide + 1} / {totalSlides}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center px-5 py-4 sm:px-8">
          {isIntro ? (
            <div className="w-full max-w-xl text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[22px] border border-white/10 bg-white/[0.06] text-3xl shadow-2xl">🏆</div>
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-300">Neu bei strikr</div>
              <h1 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">Ab sofort sind die Karriere-Badges verfügbar.</h1>
              <p className="mx-auto mt-5 max-w-lg text-base leading-7 text-white/65 sm:text-lg">
                Bereits sammeln konntest du in deiner Karriere folgende Badges. Schau sie dir jetzt nacheinander an.
              </p>
              {earnedBadges.length === 0 ? (
                <p className="mt-6 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white/55">
                  Aktuell hast du noch kein Karriere-Badge freigeschaltet – dein erstes wartet schon auf dich.
                </p>
              ) : (
                <div className="mt-7 text-sm font-bold text-white/80">{earnedBadges.length} bereits freigeschaltet</div>
              )}
            </div>
          ) : badge ? (
            <div className="flex h-full w-full max-w-2xl flex-col items-center justify-center text-center">
              <div className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-300">Bereits freigeschaltet</div>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">{badge.title}</h2>
              <img
                src={badge.artwork}
                alt={badge.title}
                draggable={false}
                className="mt-5 max-h-[62dvh] w-auto max-w-full rounded-[28px] object-contain shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
              />
              <div className="mt-4 text-xs font-semibold text-white/40">Wischen oder „Weiter“ tippen</div>
            </div>
          ) : null}
        </div>

        <div className="px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2 sm:px-8">
          <div className="mx-auto flex w-full max-w-xl items-center gap-3">
            {slide > 0 ? (
              <button type="button" onClick={previous} className="min-h-12 rounded-2xl border border-white/15 px-5 text-sm font-bold text-white/75">
                Zurück
              </button>
            ) : null}
            <button
              type="button"
              onClick={next}
              disabled={busy}
              className="min-h-12 flex-1 rounded-2xl bg-white px-5 text-sm font-black text-slate-950 disabled:opacity-60"
            >
              {busy ? "Speichere…" : isLast ? "Fertig" : isIntro ? "Meine Badges ansehen" : "Weiter"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
