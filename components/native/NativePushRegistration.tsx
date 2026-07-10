"use client";

import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { useEffect } from "react";

export default function NativePushRegistration() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;
    const removeListeners: Array<() => void> = [];

    async function registerPush() {
      try {
        const registrationListener = await PushNotifications.addListener(
          "registration",
          async (token) => {
            if (cancelled) return;

            try {
              await fetch("/api/push/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({
                  token: token.value,
                  platform: Capacitor.getPlatform(),
                  appVersion: "native-capacitor",
                }),
              });
            } catch (error) {
              console.error("Push token registration failed", error);
            }
          },
        );

        removeListeners.push(() => {
          void registrationListener.remove();
        });

        const registrationErrorListener = await PushNotifications.addListener(
          "registrationError",
          (error) => {
            console.error("Push registration error", error);
          },
        );

        removeListeners.push(() => {
          void registrationErrorListener.remove();
        });

        const receivedListener = await PushNotifications.addListener(
          "pushNotificationReceived",
          (notification) => {
            console.info("Push notification received", notification);
          },
        );

        removeListeners.push(() => {
          void receivedListener.remove();
        });

        const actionListener = await PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (action) => {
            const url = action.notification.data?.url;

            if (typeof url === "string" && url.startsWith("/")) {
              window.location.href = url;
            }
          },
        );

        removeListeners.push(() => {
          void actionListener.remove();
        });

        if (Capacitor.getPlatform() === "android") {
          await PushNotifications.createChannel({
            id: "default",
            name: "strikr",
            description: "strikr Benachrichtigungen",
            importance: 4,
            vibration: true,
          });
        }

        const permission = await PushNotifications.checkPermissions();

        const finalPermission =
          permission.receive === "prompt"
            ? await PushNotifications.requestPermissions()
            : permission;

        if (finalPermission.receive !== "granted") {
          console.info("Push permission not granted");
          return;
        }

        await PushNotifications.register();
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
