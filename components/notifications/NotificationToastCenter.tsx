"use client";

import { useEffect, useMemo, useState } from "react";

type NotificationItem = {
  id: number;
  type: string;
  title: string;
  body: string | null;
  cta_href: string | null;
  cta_label: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
  seen_at: string | null;
};

function getTypeLabel(type: string) {
  switch (type) {
    case "badge_awarded":
      return "Badge";
    case "mvp_winner":
      return "MVP";
    case "mvp_result":
      return "Ergebnis";
    default:
      return "Info";
  }
}

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 1000 / 60);

  if (diffMin < 1) return "Gerade eben";
  if (diffMin < 60) return `Vor ${diffMin} Min.`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Vor ${diffHours} Std.`;

  const diffDays = Math.floor(diffHours / 24);
  return `Vor ${diffDays} Tag${diffDays === 1 ? "" : "en"}`;
}

export function NotificationToastCenter() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissingIds, setDismissingIds] = useState<number[]>([]);

  async function loadNotifications() {
    try {
      const res = await fetch("/api/notifications/unseen", {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        return;
      }

      const json = (await res.json()) as {
        notifications?: NotificationItem[];
      };

      setNotifications(json.notifications ?? []);
    } catch {
      // bewusst still
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadNotifications();
  }, []);

  useEffect(() => {
    function handleFocus() {
      void loadNotifications();
    }

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  async function dismissNotification(id: number) {
    setDismissingIds((prev) => [...prev, id]);

    try {
      const res = await fetch(`/api/notifications/${id}/seen`, {
        method: "POST",
      });

      if (!res.ok) {
        return;
      }

      setNotifications((prev) => prev.filter((item) => item.id !== id));
    } catch {
      // bewusst still
    } finally {
      setDismissingIds((prev) => prev.filter((item) => item !== id));
    }
  }

  const visibleNotifications = useMemo(
    () => notifications.slice(0, 3),
    [notifications]
  );

  if (loading || visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-3 px-4">
      {visibleNotifications.map((notification) => {
        const isDismissing = dismissingIds.includes(notification.id);

        return (
          <div
            key={notification.id}
            className="pointer-events-auto w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-4 shadow-lg"
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
                    {getTypeLabel(notification.type)}
                  </span>
                  <span className="text-xs text-neutral-500">
                    {formatRelativeTime(notification.created_at)}
                  </span>
                </div>

                <p className="truncate text-sm font-semibold text-neutral-900">
                  {notification.title}
                </p>

                {notification.body ? (
                  <p className="mt-1 text-sm text-neutral-600">
                    {notification.body}
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => void dismissNotification(notification.id)}
                disabled={isDismissing}
                className="shrink-0 rounded-md p-1 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800"
                aria-label="Benachrichtigung schließen"
              >
                ✕
              </button>
            </div>

            {notification.cta_href && notification.cta_label ? (
              <div className="mt-3">
                <a
                  href={notification.cta_href}
                  className="inline-flex rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50"
                >
                  {notification.cta_label}
                </a>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}