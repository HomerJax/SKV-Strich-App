"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type NotificationItem = {
  id: number;
  type: string;
  title: string;
  body: string | null;
  cta_href: string | null;
  cta_label: string | null;
  secondary_cta_href: string | null;
  secondary_cta_label: string | null;
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

function buildNotificationShareText(notification: NotificationItem) {
  const isWinner = notification.type === "mvp_winner";

  if (isWinner) {
    return `🏆 Ich bin MVP!

${notification.body ?? "MVP des Trainings bei strikr."}

Markiere dein Team + @getstrikr
#strikr`;
  }

  return `🏆 MVP Ergebnis ist da!

${notification.body ?? "Das MVP Voting ist beendet."}

Markiere dein Team + @getstrikr
#strikr`;
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

      setNotifications((prev) =>
        prev.filter((notification) => notification.id !== notificationId)
      );
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

  if (loading) {
    return null;
  }

  if (notifications.length === 0) {
    return null;
  }

  const notification = notifications[0];
  const isWinner = notification.type === "mvp_winner";
  const isMvpNotification =
    notification.type === "mvp_winner" || notification.type === "mvp_result";

  return (
    <div className="pointer-events-none fixed inset-x-0 top-24 z-[90] flex justify-center px-4">
      <div className="pointer-events-auto w-full max-w-xl rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {isWinner ? "Dein Moment" : "Im Verein"}
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
          {isWinner ? (
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
          )}

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

            {notification.secondary_cta_href &&
            notification.secondary_cta_label ? (
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