"use client";

import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useEffect } from "react";
import { getNativeInternalPath } from "@/components/native/NativeDeepLinkHandler";

export default function NativeAppEntryRedirect() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

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
