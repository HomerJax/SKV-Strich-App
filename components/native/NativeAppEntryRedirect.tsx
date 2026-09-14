"use client";

import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useLayoutEffect } from "react";
import { getNativeInternalPath } from "@/components/native/NativeDeepLinkHandler";

export default function NativeAppEntryRedirect() {
  useLayoutEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    document.documentElement.style.backgroundColor = "#f5f5f5";
    document.body.style.backgroundColor = "#f5f5f5";

    if (Capacitor.getPlatform() !== "android") {
      window.location.replace("/home");
      return;
    }

    if (!Capacitor.isPluginAvailable("App")) {
      window.location.replace("/home");
      return;
    }

    let cancelled = false;

    async function redirect() {
      try {
        const launchUrl = await App.getLaunchUrl();
        const deepLinkPath = getNativeInternalPath(launchUrl?.url);

        if (!cancelled) {
          window.location.replace(deepLinkPath ?? "/home");
        }
      } catch {
        if (!cancelled) {
          window.location.replace("/home");
        }
      }
    }

    void redirect();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
