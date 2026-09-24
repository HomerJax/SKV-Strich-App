"use client";

import { useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

const REFRESH_THRESHOLD = 64;
const MAX_PULL = 92;

export default function HomePullToRefresh({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const startY = useRef<number | null>(null);
  const tracking = useRef(false);
  const pullRef = useRef(0);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  function resetPull() {
    startY.current = null;
    tracking.current = false;
    pullRef.current = 0;
    setPull(0);
  }

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    if (refreshing || window.scrollY > 0) return;

    const touch = event.touches[0];
    if (!touch) return;

    startY.current = touch.clientY;
    tracking.current = true;
  }

  function handleTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    if (!tracking.current || startY.current === null || window.scrollY > 0) {
      return;
    }

    const touch = event.touches[0];
    if (!touch) return;

    const distance = touch.clientY - startY.current;

    if (distance <= 0) {
      pullRef.current = 0;
      setPull(0);
      return;
    }

    const nextPull = Math.min(MAX_PULL, distance * 0.5);
    pullRef.current = nextPull;
    setPull(nextPull);
  }

  function handleTouchEnd() {
    if (!tracking.current) return;

    const shouldRefresh = pullRef.current >= REFRESH_THRESHOLD;
    resetPull();

    if (!shouldRefresh || refreshing) return;

    setRefreshing(true);
    router.refresh();

    window.setTimeout(() => {
      setRefreshing(false);
    }, 900);
  }

  const visible = pull > 0 || refreshing;
  const ready = pull >= REFRESH_THRESHOLD;

  return (
    <div
      className="min-h-screen"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={resetPull}
    >
      <div
        aria-live="polite"
        className={[
          "pointer-events-none fixed left-1/2 top-[calc(env(safe-area-inset-top)+4.75rem)] z-[90] -translate-x-1/2 rounded-full border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur transition-all duration-150",
          visible ? "opacity-100" : "-translate-y-2 opacity-0",
        ].join(" ")}
      >
        <div className="flex items-center gap-2 whitespace-nowrap text-xs font-black text-slate-700">
          <RefreshCw
            className={[
              "h-4 w-4 text-blue-600",
              refreshing ? "animate-spin" : "",
            ].join(" ")}
            style={
              refreshing
                ? undefined
                : { transform: `rotate(${Math.min(300, pull * 4)}deg)` }
            }
          />
          <span>
            {refreshing
              ? "Aktualisiere …"
              : ready
                ? "Loslassen zum Aktualisieren"
                : "Zum Aktualisieren ziehen"}
          </span>
        </div>
      </div>

      {children}
    </div>
  );
}
