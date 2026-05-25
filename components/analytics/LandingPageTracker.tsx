"use client";

import { useEffect } from "react";

function getParam(searchParams: URLSearchParams, key: string) {
  const value = searchParams.get(key);
  return value && value.trim() ? value.trim() : null;
}

function sendAnalyticsEvent(endpoint: string, payload: Record<string, unknown>) {
  const body = JSON.stringify(payload);

  if (navigator.sendBeacon) {
    navigator.sendBeacon(
      endpoint,
      new Blob([body], { type: "application/json" })
    );
    return;
  }

  void fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // Tracking darf nie UX kaputt machen.
  });
}

export default function LandingPageTracker() {
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);

    const payload = {
      path: window.location.pathname,
      referrer: document.referrer || null,
      utm_source: getParam(searchParams, "utm_source"),
      utm_medium: getParam(searchParams, "utm_medium"),
      utm_campaign: getParam(searchParams, "utm_campaign"),
      utm_content: getParam(searchParams, "utm_content"),
      utm_term: getParam(searchParams, "utm_term"),
    };

    const visitKey = `strikr-landing-visit-${window.location.pathname}-${new Date()
      .toISOString()
      .slice(0, 10)}`;

    if (!sessionStorage.getItem(visitKey)) {
      sessionStorage.setItem(visitKey, "1");
      sendAnalyticsEvent("/api/analytics/landing-visit", payload);
    }

    function handleClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const trigger = target.closest("[data-analytics-event]");
      if (!(trigger instanceof HTMLElement)) return;

      const eventName = trigger.dataset.analyticsEvent;
      if (!eventName) return;

      sendAnalyticsEvent("/api/analytics/landing-event", {
        ...payload,
        event_name: eventName,
      });
    }

    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, []);

  return null;
}
