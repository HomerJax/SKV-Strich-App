"use client";

import { useEffect } from "react";

function getParam(searchParams: URLSearchParams, key: string) {
  const value = searchParams.get(key);
  return value && value.trim() ? value.trim() : null;
}

export default function LandingPageTracker() {
  useEffect(() => {
    const key = `strikr-landing-visit-${window.location.pathname}-${new Date()
      .toISOString()
      .slice(0, 10)}`;

    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");

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

    const body = JSON.stringify(payload);

    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/analytics/landing-visit",
        new Blob([body], { type: "application/json" })
      );
      return;
    }

    void fetch("/api/analytics/landing-visit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      // Tracking darf nie UX kaputt machen.
    });
  }, []);

  return null;
}
