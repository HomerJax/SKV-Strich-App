"use client";

import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useLayoutEffect, useState } from "react";
import { getNativeInternalPath } from "@/components/native/NativeDeepLinkHandler";

export default function NativeAppEntryRedirect() {
  const [nativeBoot, setNativeBoot] = useState(false);

  useLayoutEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    setNativeBoot(true);
    document.documentElement.style.backgroundColor = "#070B12";
    document.body.style.backgroundColor = "#070B12";

    if (Capacitor.getPlatform() !== "android") {
      window.setTimeout(() => {
        window.location.replace("/home");
      }, 40);
      return;
    }

    if (!Capacitor.isPluginAvailable("App")) {
      window.setTimeout(() => {
        window.location.replace("/home");
      }, 40);
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

  if (!nativeBoot) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex min-h-[100dvh] items-center justify-center bg-[#070B12] px-6 text-white">
      <div className="-translate-y-[2vh] text-center">
        <div className="text-[42px] font-black leading-none tracking-[-0.05em]">
          strikr
        </div>
        <div className="mt-3 text-[10px] font-extrabold uppercase tracking-[0.24em] text-white/45">
          Jedes Training zählt.
        </div>
        <div className="mx-auto mt-7 h-7 w-7 animate-spin rounded-full border-[3px] border-white/10 border-t-white/80" />
      </div>
    </div>
  );
}
