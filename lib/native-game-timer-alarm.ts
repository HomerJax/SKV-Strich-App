"use client";

import { Capacitor, registerPlugin } from "@capacitor/core";
import type { GameTimerAlarmSound } from "@/lib/game-timer";

type NativeAlarmKind = "halftime" | "final";

type AuthorizationResult = {
  granted: boolean;
  mode?: string;
  needsSettings?: boolean;
};

type NativeAlarmAuthorizationState = AuthorizationResult & {
  unavailable: boolean;
};

type GameTimerAlarmNativePlugin = {
  requestAuthorization(): Promise<AuthorizationResult>;
  schedule(options: {
    key: string;
    atEpochMs: number;
    kind: NativeAlarmKind;
    sound: GameTimerAlarmSound;
    persistent?: boolean;
  }): Promise<{ ok: boolean }>;
  cancel(options: { key: string }): Promise<{ ok: boolean }>;
};

const NativeGameTimerAlarm = registerPlugin<GameTimerAlarmNativePlugin>(
  "GameTimerAlarm",
);

export function supportsNativeGameTimerAlarm() {
  return (
    Capacitor.isNativePlatform() &&
    Capacitor.isPluginAvailable("GameTimerAlarm")
  );
}

export async function requestNativeGameTimerAlarmAuthorization(): Promise<NativeAlarmAuthorizationState> {
  if (!supportsNativeGameTimerAlarm()) {
    return {
      granted: false,
      needsSettings: false,
      unavailable: true,
    };
  }

  try {
    const result = await NativeGameTimerAlarm.requestAuthorization();
    return {
      granted: result.granted,
      mode: result.mode,
      needsSettings: result.needsSettings ?? false,
      unavailable: false,
    };
  } catch (error) {
    console.warn("Native game timer alarm authorization failed", error);
    return {
      granted: false,
      needsSettings: false,
      unavailable: false,
    };
  }
}

export async function scheduleNativeGameTimerAlarm(options: {
  key: string;
  atEpochMs: number;
  kind: NativeAlarmKind;
  sound: GameTimerAlarmSound;
  persistent?: boolean;
}) {
  if (!supportsNativeGameTimerAlarm()) return false;

  try {
    await NativeGameTimerAlarm.schedule(options);
    return true;
  } catch (error) {
    console.warn("Scheduling native game timer alarm failed", error);
    return false;
  }
}

export async function cancelNativeGameTimerAlarm(key: string) {
  if (!supportsNativeGameTimerAlarm()) return;

  try {
    await NativeGameTimerAlarm.cancel({ key });
  } catch (error) {
    console.warn("Cancelling native game timer alarm failed", error);
  }
}
