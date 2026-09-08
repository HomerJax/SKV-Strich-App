"use client";

import type { GameTimerAlarmSound } from "@/lib/game-timer";

let audioContext: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;

  if (!audioContext) {
    const AudioContextCtor =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextCtor) return null;
    audioContext = new AudioContextCtor();
  }

  return audioContext;
}

export async function primeTimerAudio() {
  const context = getAudioContext();
  if (!context) return false;

  try {
    if (context.state === "suspended") {
      await context.resume();
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.01);
    return true;
  } catch {
    return false;
  }
}

function scheduleTone(
  context: AudioContext,
  params: {
    start: number;
    duration: number;
    frequency: number;
    endFrequency?: number;
    type: OscillatorType;
    gain: number;
  },
) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const end = params.start + params.duration;

  oscillator.type = params.type;
  oscillator.frequency.setValueAtTime(params.frequency, params.start);

  if (params.endFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(params.endFrequency, end);
  }

  gain.gain.setValueAtTime(0.0001, params.start);
  gain.gain.exponentialRampToValueAtTime(params.gain, params.start + 0.025);
  gain.gain.setValueAtTime(params.gain, Math.max(params.start + 0.03, end - 0.05));
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(params.start);
  oscillator.stop(end + 0.02);
}

export async function playTimerAlarm(
  sound: GameTimerAlarmSound,
  options?: { preview?: boolean },
) {
  const context = getAudioContext();
  if (!context) return false;

  try {
    if (context.state === "suspended") {
      await context.resume();
    }

    const now = context.currentTime + 0.03;
    const previewFactor = options?.preview ? 0.72 : 1;

    if (sound === "whistle") {
      for (let index = 0; index < 3; index += 1) {
        const start = now + index * 0.34 * previewFactor;
        scheduleTone(context, {
          start,
          duration: 0.24 * previewFactor,
          frequency: 1650,
          endFrequency: 2450,
          type: "sine",
          gain: 0.42,
        });
        scheduleTone(context, {
          start,
          duration: 0.24 * previewFactor,
          frequency: 1850,
          endFrequency: 2700,
          type: "sine",
          gain: 0.16,
        });
      }
    } else if (sound === "horn") {
      for (let index = 0; index < 2; index += 1) {
        const start = now + index * 0.62 * previewFactor;
        scheduleTone(context, {
          start,
          duration: 0.5 * previewFactor,
          frequency: 390,
          endFrequency: 330,
          type: "sawtooth",
          gain: 0.32,
        });
      }
    } else {
      for (let index = 0; index < 4; index += 1) {
        const start = now + index * 0.23 * previewFactor;
        scheduleTone(context, {
          start,
          duration: 0.15 * previewFactor,
          frequency: 230,
          type: "square",
          gain: 0.28,
        });
      }
    }

    if (!options?.preview && typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.([250, 120, 250, 120, 400]);
    }

    return true;
  } catch {
    return false;
  }
}
