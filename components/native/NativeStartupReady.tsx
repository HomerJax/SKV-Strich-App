"use client";

import { Capacitor, registerPlugin } from "@capacitor/core";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

type StartupOverlayPlugin = {
  hide: () => Promise<{ ok?: boolean }>;
};

const StartupOverlay = registerPlugin<StartupOverlayPlugin>("StartupOverlay");

export default function NativeStartupReady() {
  const pathname = usePathname();

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") {
      return;
    }

    if (pathname === "/") {
      return;
    }

    let cancelled = false;
    let frameOne = 0;
    let frameTwo = 0;
    let timeoutId = 0;

    const hideWhenPainted = () => {
      frameOne = window.requestAnimationFrame(() => {
        frameTwo = window.requestAnimationFrame(() => {
          timeoutId = window.setTimeout(() => {
            if (cancelled) return;
            void StartupOverlay.hide().catch(() => {
              // Older native builds do not have this plugin. Nothing to do there.
            });
          }, 80);
        });
      });
    };

    if (document.readyState === "complete") {
      hideWhenPainted();
    } else {
      window.addEventListener("load", hideWhenPainted, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", hideWhenPainted);
      window.cancelAnimationFrame(frameOne);
      window.cancelAnimationFrame(frameTwo);
      window.clearTimeout(timeoutId);
    };
  }, [pathname]);

  return null;
}
