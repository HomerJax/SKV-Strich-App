"use client";

import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useEffect } from "react";

const ALLOWED_HOSTS = new Set(["strikr.team", "www.strikr.team"]);

export function getNativeInternalPath(
  rawUrl: string | null | undefined,
): string | null {
  if (!rawUrl) return null;

  try {
    const url = new URL(rawUrl);

    if (url.protocol !== "https:") return null;
    if (!ALLOWED_HOSTS.has(url.hostname)) return null;
    if (url.pathname !== "/join") return null;

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

function openInternalPath(rawUrl: string | null | undefined) {
  const target = getNativeInternalPath(rawUrl);

  if (!target) return;

  const current =
    window.location.pathname +
    window.location.search +
    window.location.hash;

  if (current === target) return;

  window.location.replace(target);
}

export default function NativeDeepLinkHandler() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (Capacitor.getPlatform() !== "android") return;

    let cancelled = false;
    let removeUrlListener: (() => void) | null = null;

    void App.addListener("appUrlOpen", ({ url }) => {
      if (!cancelled) {
        openInternalPath(url);
      }
    }).then((handle) => {
      if (cancelled) {
        void handle.remove();
        return;
      }

      removeUrlListener = () => {
        void handle.remove();
      };
    });

    void App.getLaunchUrl()
      .then((launchUrl) => {
        if (!cancelled) {
          openInternalPath(launchUrl?.url);
        }
      })
      .catch((error) => {
        console.error("Native launch URL could not be read", error);
      });

    return () => {
      cancelled = true;
      removeUrlListener?.();
    };
  }, []);

  return null;
}
