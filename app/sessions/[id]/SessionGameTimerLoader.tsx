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

type Props = {
  sessionId: number;
  onStarted?: () => void;
  startLabel?: string;
  showAvailabilityMessage?: boolean;
};

export default function SessionGameTimerLoader({ sessionId, onStarted, startLabel, showAvailabilityMessage = false }: Props) {
  const [data, setData] = useState<TimerResponse | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError("");
      try {
        const response = await fetch("/api/sessions/" + sessionId + "/timer", {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Spieluhr konnte nicht geladen werden.");
        const payload = (await response.json()) as TimerResponse;
        if (!cancelled) setData(payload);
      } catch {
        if (!cancelled) setLoadError("Spieluhr momentan nicht verfügbar. Training ohne Uhr bleibt möglich.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [sessionId]);

  if (loading) {
    return showAvailabilityMessage ? (
      <p role="status" className="p-4 text-sm font-medium text-slate-600">Spieluhr wird geladen …</p>
    ) : null;
  }

  if (loadError || data?.enabled !== true || !data.settings || !data.clubDefaultSettings) {
    return showAvailabilityMessage ? (
      <p role="alert" className="m-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
        {loadError || "Die Spieluhr ist in diesem Verein nicht aktiviert. Ohne Spieluhr kannst du direkt starten."}
      </p>
    ) : null;
  }

  return (
    <SessionGameTimerCard
      sessionId={sessionId}
      initialSettings={data.settings}
      clubDefaultSettings={data.clubDefaultSettings}
      initialUsesOverride={data.usesOverride === true}
      onStarted={onStarted}
      startLabel={startLabel}
    />
  );
}
