"use client";

import { Capacitor } from "@capacitor/core";
import { FirebaseMessaging } from "@capacitor-firebase/messaging";
import { useEffect } from "react";

type NotificationData = {
  url?: unknown;
};

async function registerToken(token: string) {
  await fetch("/api/push/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      token,
      platform: Capacitor.getPlatform(),
      appVersion: "native-capacitor",
    }),
  });
}

export default function NativePushRegistration() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;
    const removeListeners: Array<() => void> = [];

    async function registerPush() {
      try {
        const supported = await FirebaseMessaging.isSupported();

        if (!supported.isSupported) {
          console.info("Firebase Messaging is not supported on this platform");
          return;
        }

        const tokenListener = await FirebaseMessaging.addListener(
          "tokenReceived",
          async (event) => {
            if (cancelled || !event.token) return;

            try {
              await registerToken(event.token);
            } catch (error) {
              console.error("Push token registration failed", error);
            }
          },
        );

        removeListeners.push(() => {
          void tokenListener.remove();
        });

        const notificationListener = await FirebaseMessaging.addListener(
          "notificationReceived",
          (event) => {
            console.info("Push notification received", event.notification);
          },
        );

        removeListeners.push(() => {
          void notificationListener.remove();
        });

        const actionListener = await FirebaseMessaging.addListener(
          "notificationActionPerformed",
          (event) => {
            const data = event.notification.data as
              NotificationData | undefined;
            const url = data?.url;

            if (typeof url === "string" && url.startsWith("/")) {
              window.location.href = url;
            }
          },
        );

        removeListeners.push(() => {
          void actionListener.remove();
        });

        if (Capacitor.getPlatform() === "android") {
          await FirebaseMessaging.createChannel({
            id: "default",
            name: "strikr",
            description: "strikr Benachrichtigungen",
            importance: 4,
            vibration: true,
          });
        }

        const permission = await FirebaseMessaging.checkPermissions();

        const finalPermission =
          permission.receive === "prompt"
            ? await FirebaseMessaging.requestPermissions()
            : permission;

        if (finalPermission.receive !== "granted") {
          console.info("Push permission not granted");
          return;
        }

        const tokenResult = await FirebaseMessaging.getToken();

        if (!cancelled && tokenResult.token) {
          await registerToken(tokenResult.token);
        }
      } catch (error) {
        console.error("Native push setup failed", error);
      }
    }

    void registerPush();

    return () => {
      cancelled = true;
      removeListeners.forEach((remove) => remove());
    };
  }, []);

  return null;
}
