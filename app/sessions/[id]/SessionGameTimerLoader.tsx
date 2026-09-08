"use client";

import { useEffect, useState } from "react";
import type { GameTimerSettings } from "@/lib/game-timer";
import SessionGameTimerCard from "./SessionGameTimerCard";

type TimerResponse = {
  enabled?: boolean;
  settings?: GameTimerSettings;
  clubDefaultSettings?: GameTimerSettings;
  usesOverride?: boolean;
};

export default function SessionGameTimerLoader({ sessionId }: { sessionId: number }) {
  const [data, setData] = useState<TimerResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`/api/sessions/${sessionId}/timer`, {
          credentials: "same-origin",
          cache: "no-store",
        });

        if (!response.ok) return;
        const payload = (await response.json()) as TimerResponse;

        if (!cancelled) {
          setData(payload);
        }
      } catch {
        // Die Session bleibt auch ohne Timer vollständig nutzbar.
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (
    data?.enabled !== true ||
    !data.settings ||
    !data.clubDefaultSettings
  ) {
    return null;
  }

  return (
    <SessionGameTimerCard
      sessionId={sessionId}
      initialSettings={data.settings}
      clubDefaultSettings={data.clubDefaultSettings}
      initialUsesOverride={data.usesOverride === true}
    />
  );
}
