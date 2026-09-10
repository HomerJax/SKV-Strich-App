"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AchievementBadgeVisual from "@/components/badges/AchievementBadgeVisual";

type NotificationItem = {
  id: number;
  type: string;
  title: string;
  body: string | null;
  cta_href: string | null;
  cta_label: string | null;
  secondary_cta_href: string | null;
  secondary_cta_label: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};

type ApiResponse = {
  notifications: NotificationItem[];
};

function getSessionIdFromHref(href: string | null) {
  if (!href) return null;

  const match = href.match(/\/sessions\/(\d+)/);
  if (!match?.[1]) return null;

  const sessionId = Number(match[1]);
  return Number.isFinite(sessionId) ? sessionId : null;
}

function getBadgeKey(notification: NotificationItem) {
  const value = notification.payload?.badgeKey;
  return typeof value === "string" && value.trim() ? value : null;
}

function buildNotificationShareText(notification: NotificationItem) {
  const isWinner = notification.type === "mvp_winner";

  if (isWinner) {
    return `🏆 Ich bin MVP!\n\n${notification.body ?? "MVP des Trainings bei strikr."}\n\nMarkiere dein Team + @getstrikr\n#strikr`;
  }

  return `🏆 MVP Ergebnis ist da!\n\n${notification.body ?? "Das MVP Voting ist beendet."}\n\nMarkiere dein Team + @getstrikr\n#strikr`;
}

export default function InAppNotificationCenter() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  async function loadNotifications() {
    try {
      setLoading(true);

      const response = await fetch("/api/notifications", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => null)) as
        | ApiResponse
        | null;

      if (!response.ok || !payload) {
        setNotifications([]);
        return;
      }

      setNotifications(payload.notifications ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  async function markSeen(notificationId: number) {
    try {
      setBusyId(notificationId);

      const response = await fetch("/api/notifications", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          intent: "mark_seen",
          notificationId,
        }),
      });

      if (!response.ok) {
        return;
      }

      const shouldLoadNextBatch = notifications.length === 1;

      setNotifications((prev) =>
        prev.filter((notification) => notification.id !== notificationId),
      );
      setShareMessage(null);

      // Die API liefert bewusst nur einen kleinen Stapel. Sobald der lokale
      // Stapel leer ist, holen wir den nächsten nach, damit auch viele beim
      // Badge-Start freigeschaltete Achievements einzeln abgearbeitet werden.
      if (shouldLoadNextBatch) {
        await loadNotifications();
      }
    } finally {
      setBusyId(null);
    }
  }

  async function shareNotification(notification: NotificationItem) {
    try {
      setShareBusy(true);
      setShareMessage(null);

      const sessionId = getSessionIdFromHref(notification.cta_href);
      const text = buildNotificationShareText(notification);
      const sessionUrl =
        sessionId && typeof window !== "undefined"
          ? `${window.location.origin}/sessions/${sessionId}`
          : null;

      const fullText = sessionUrl ? `${text}\n\n${sessionUrl}` : text;

      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: notification.title,
          text: fullText,
        });
        return;
      }

      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(fullText);
        setShareMessage("Share-Text wurde kopiert.");
        return;
      }

      setShareMessage("Teilen wird auf diesem Gerät nicht unterstützt.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setShareMessage("Teilen konnte nicht gestartet werden.");
    } finally {
      setShareBusy(false);
    }
  }

  if (loading || notifications.length === 0) {
    return null;
  }

  const notification = notifications[0];
  const isWinner = notification.type === "mvp_winner";
  const isMvpNotification =
    notification.type === "mvp_winner" || notification.type === "mvp_result";
  const isBadgeLaunch = notification.type === "badge_launch";
  const isBadgeUnlocked = notification.type === "badge_unlocked";
  const badgeKey = isBadgeUnlocked ? getBadgeKey(notification) : null;

  if (isBadgeLaunch) {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-24 z-[90] flex justify-center px-4">
        <div className="pointer-events-auto w-full max-w-md overflow-hidden rounded-[28px] border border-amber-200 bg-white shadow-2xl">
          <div className="bg-slate-950 px-5 py-5 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">
                  Neu bei strikr
                </div>
                <h2 className="mt-2 text-2xl font-black tracking-tight">
                  {notification.title}
                </h2>
                {notification.body ? (
                  <p className="mt-2 text-sm leading-6 text-white/70">
                    {notification.body}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => markSeen(notification.id)}
                disabled={busyId === notification.id}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-60"
                aria-label="Notification schließen"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 p-4 sm:flex-row">
            {notification.cta_href ? (
              <Link
                href={notification.cta_href}
                onClick={() => markSeen(notification.id)}
                className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-slate-800"
              >
                {notification.cta_label ?? "Badges ansehen"}
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => markSeen(notification.id)}
              disabled={busyId === notification.id}
              className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              Weiter
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isBadgeUnlocked) {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-24 z-[90] flex justify-center px-4">
        <div className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
          <div className="relative bg-slate-950 px-5 pb-6 pt-5 text-center text-white">
            <button
              type="button"
              onClick={() => markSeen(notification.id)}
              disabled={busyId === notification.id}
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/55 transition hover:bg-white/10 hover:text-white disabled:opacity-60"
              aria-label="Notification schließen"
            >
              ✕
            </button>

            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">
              Badge freigeschaltet
            </div>

            {badgeKey ? (
              <div className="mx-auto mt-5 flex h-24 w-24 items-center justify-center">
                <AchievementBadgeVisual badgeKey={badgeKey} size="xl" />
              </div>
            ) : null}

            <h2 className="mt-4 text-2xl font-black tracking-tight">
              {notification.title}
            </h2>
            {notification.body ? (
              <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-white/65">
                {notification.body}
              </p>
            ) : null}

            {notifications.length > 1 ? (
              <div className="mt-3 text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">
                Noch {notifications.length - 1} Meldung{notifications.length - 1 === 1 ? "" : "en"}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 p-4 sm:flex-row">
            <button
              type="button"
              onClick={() => markSeen(notification.id)}
              disabled={busyId === notification.id}
              className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {notifications.length > 1 ? "Weiter" : "Fertig"}
            </button>
            {notification.cta_href ? (
              <Link
                href={notification.cta_href}
                onClick={() => markSeen(notification.id)}
                className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Badges ansehen
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-24 z-[90] flex justify-center px-4">
      <div className="pointer-events-auto w-full max-w-xl rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {isWinner ? "Dein Moment" : isMvpNotification ? "Im Verein" : "Neuigkeit"}
            </div>
            <h2 className="mt-1 text-lg font-bold text-slate-950">
              {notification.title}
            </h2>
            {notification.body ? (
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {notification.body}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => markSeen(notification.id)}
            disabled={busyId === notification.id}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 disabled:opacity-60"
            aria-label="Notification schließen"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-5">
          {isMvpNotification ? (
            isWinner ? (
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                <div className="text-sm font-semibold text-amber-900">
                  Glückwunsch 🎉
                </div>
                <div className="mt-1 text-sm text-amber-800">
                  Du wurdest zum MVP gewählt. Schau dir jetzt das Voting an und
                  teile deinen Moment mit dem Team.
                </div>
              </div>
            ) : (
              <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4">
                <div className="text-sm font-semibold text-sky-900">
                  Voting abgeschlossen
                </div>
                <div className="mt-1 text-sm text-sky-800">
                  Das Ergebnis des MVP Votings ist da. Öffne die Session, schau
                  dir die Bewertung an und teile den Moment weiter.
                </div>
              </div>
            )
          ) : null}

          {shareMessage ? (
            <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {shareMessage}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            {notification.cta_href && notification.cta_label ? (
              <Link
                href={notification.cta_href}
                onClick={() => markSeen(notification.id)}
                className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {notification.cta_label}
              </Link>
            ) : null}

            {isMvpNotification ? (
              <button
                type="button"
                onClick={() => shareNotification(notification)}
                disabled={shareBusy}
                className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                {shareBusy
                  ? "Öffne Teilen…"
                  : isWinner
                    ? "MVP teilen"
                    : "Ergebnis teilen"}
              </button>
            ) : null}

            {notification.secondary_cta_href && notification.secondary_cta_label ? (
              <Link
                href={notification.secondary_cta_href}
                onClick={() => markSeen(notification.id)}
                className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {notification.secondary_cta_label}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
