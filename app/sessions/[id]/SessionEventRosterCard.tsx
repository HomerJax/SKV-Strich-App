"use client";

import { useMemo, useState } from "react";
import { getPlayerDisplayName } from "@/lib/player-display";
import type { Player } from "./session-types";
import { useI18n } from "@/components/i18n/I18nProvider";

type Props = {
  sessionId: number;
  players: Player[];
  isAdmin: boolean;
};

const ATTENDANCE_SCROLL_KEY = "strikr-session-attendance-scroll-y";

function isNominated(player: Player) {
  return player.event_nominated !== false;
}

export default function SessionEventRosterCard({ sessionId, players, isAdmin }: Props) {
  const { t } = useI18n();
  const eligiblePlayers = useMemo(
    () => players.filter((player) => !player.is_guest),
    [players],
  );
  const nominatedCount = eligiblePlayers.filter(isNominated).length;
  const excludedCount = eligiblePlayers.length - nominatedCount;

  const [open, setOpen] = useState(false);
  const [busyPlayerId, setBusyPlayerId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isAdmin || eligiblePlayers.length === 0) return null;

  async function toggleNomination(player: Player) {
    if (busyPlayerId) return;
    const nominated = !isNominated(player);

    try {
      setBusyPlayerId(player.id);
      setError(null);

      const response = await fetch(`/api/sessions/${sessionId}/event-roster`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: player.id, nominated }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error || t("rsvp.rosterUpdateFailed"));
      }

      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(ATTENDANCE_SCROLL_KEY, String(window.scrollY));
        window.location.reload();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("rsvp.rosterUpdateFailed"));
      setBusyPlayerId(null);
    }
  }

  return (
    <section className="rounded-[20px] border border-violet-200 bg-violet-50/60 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-black text-slate-950">{t("rsvp.eventRoster")}</div>
          <p className="mt-1 text-[11px] leading-5 text-slate-600">
            {t("rsvp.rosterDefaultFull")}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">
              {t("rsvp.inRosterCount", { count: nominatedCount })}
            </span>
            {excludedCount > 0 ? (
              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600 ring-1 ring-slate-200">
                {t("rsvp.notNominatedCount", { count: excludedCount })}
              </span>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="shrink-0 rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white"
        >
          {open ? t("rsvp.close") : t("rsvp.setRoster")}
        </button>
      </div>

      {open ? (
        <div className="mt-4 grid gap-2 border-t border-violet-200 pt-4 sm:grid-cols-2">
          {eligiblePlayers.map((player) => {
            const nominated = isNominated(player);
            const busy = busyPlayerId === player.id;
            return (
              <button
                key={player.id}
                type="button"
                disabled={busyPlayerId !== null}
                onClick={() => void toggleNomination(player)}
                className={`flex min-h-11 items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition disabled:opacity-60 ${
                  nominated
                    ? "border-emerald-200 bg-white text-slate-900"
                    : "border-slate-200 bg-slate-100 text-slate-500"
                }`}
              >
                <span className="min-w-0 truncate text-sm font-semibold">
                  {getPlayerDisplayName(player)}
                </span>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black ${
                  nominated ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                }`}>
                  {busy ? "…" : nominated ? t("rsvp.inRoster") : t("rsvp.notInRoster")}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {error ? (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
          {error}
        </div>
      ) : null}
    </section>
  );
}
