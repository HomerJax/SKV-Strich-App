"use client";

import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  BACKGROUND_AT_KEY, RETURN_HOME_AFTER_MS,
  getLiveSessionPath, hasRecentNativePushIntent, isSensitiveNativePath,
} from "@/lib/native/return-home";

/**
 * Short interruption: stay where you were.
 * >=15 min or a true cold start: Home, unless an active game/tournament or
 * unfinished form is present. Native push targets always take priority.
 * This is intentionally not installed in the regular website/PWA.
 */
export default function NativeHomeOnResume() {
  const router = useRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;
    let backgroundAt = 0;
    let nativeListener: { remove: () => Promise<void> } | null = null;

    function canNavigate() {
      const path = window.location.pathname;
      if (path === "/" || isSensitiveNativePath(path)) return false;
      if (hasRecentNativePushIntent()) return false;
      if (document.querySelector("[data-strikr-unsaved='true']")) return false;
      const focused = document.activeElement;
      if (focused instanceof HTMLElement &&
          (focused.matches("input, textarea, select, [contenteditable='true']") ||
            focused.closest("[data-strikr-unsaved='true']"))) return false;
      return true;
    }

    function navigateToStart() {
      if (!canNavigate()) return;
      const livePath = getLiveSessionPath(window.localStorage);
      const current = window.location.pathname;
      const target = livePath ?? "/home";
      if (current !== target) router.replace(target);
    }

    function rememberBackground() {
      if (!backgroundAt) backgroundAt = Date.now();
      try {
        window.sessionStorage.setItem(BACKGROUND_AT_KEY, String(backgroundAt));
      } catch { /* optional storage */ }
    }

    function restoreFromBackground() {
      if (cancelled || document.visibilityState === "hidden") return;
      let stored = 0;
      try { stored = Number(window.sessionStorage.getItem(BACKGROUND_AT_KEY)); }
      catch { /* optional storage */ }
      const leftAt = backgroundAt || stored;
      backgroundAt = 0;
      try { window.sessionStorage.removeItem(BACKGROUND_AT_KEY); }
      catch { /* optional storage */ }
      if (!leftAt || leftAt > Date.now() || Date.now() - leftAt < RETURN_HOME_AFTER_MS) return;
      navigateToStart();
    }

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") rememberBackground();
      else restoreFromBackground();
    }

    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) restoreFromBackground();
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", rememberBackground);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("focus", restoreFromBackground);

    if (Capacitor.isPluginAvailable("App")) {
      void App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) restoreFromBackground();
        else rememberBackground();
      }).then((listener) => {
        if (cancelled) void listener.remove();
        else nativeListener = listener;
      }).catch(() => { /* visibilitychange is also registered */ });
    }

    // Cold WebView launch: the normal native entry path redirects to Home.
    // If the OS restores an old subpage directly, apply the same policy here.
    // Avoid intercepting deliberate same-origin full-page navigations.
    let internalReferrer = false;
    try { internalReferrer = Boolean(document.referrer &&
      new URL(document.referrer).origin === window.location.origin); }
    catch { /* no referrer */ }
    if (!internalReferrer) {
      // Wait briefly for the native push/deep-link handler to claim navigation.
      const startup = window.setTimeout(() => {
        if (!cancelled) navigateToStart();
      }, 450);
      return () => {
        cancelled = true;
        window.clearTimeout(startup);
        document.removeEventListener("visibilitychange", onVisibilityChange);
        window.removeEventListener("pagehide", rememberBackground);
        window.removeEventListener("pageshow", onPageShow);
        window.removeEventListener("focus", restoreFromBackground);
        if (nativeListener) void nativeListener.remove();
      };
    }

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", rememberBackground);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("focus", restoreFromBackground);
      if (nativeListener) void nativeListener.remove();
    };
  }, [router]);

  return null;
}
