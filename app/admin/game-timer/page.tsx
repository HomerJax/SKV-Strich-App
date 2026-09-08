import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";
import { canManageClub } from "@/lib/auth/access";
import GameTimerSettingsCard from "@/components/admin/settings/GameTimerSettingsCard";
import {
  DEFAULT_GAME_TIMER_SETTINGS,
  normalizeTimerEndTime,
  type GameTimerAlarmSound,
  type GameTimerMode,
} from "@/lib/game-timer";

type TimerSettingsRow = {
  game_timer_enabled: boolean | null;
  game_timer_default_mode: string | null;
  game_timer_default_minutes: number | null;
  game_timer_default_end_time: string | null;
  game_timer_halftime_enabled: boolean | null;
  game_timer_alarm_sound: string | null;
};

function normalizeMode(value: string | null): GameTimerMode {
  return value === "end_time" ? "end_time" : "duration";
}

function normalizeAlarm(value: string | null): GameTimerAlarmSound {
  return value === "horn" || value === "buzzer" ? value : "whistle";
}

export default async function AdminGameTimerPage() {
  const { clubId, membership, isPowerUser } = await requireClub();
  const hasAdminAccess = canManageClub({
    isPowerUser,
    role: membership.role,
  });

  if (!hasAdminAccess) {
    redirect("/admin");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("club_settings")
    .select(
      "game_timer_enabled, game_timer_default_mode, game_timer_default_minutes, game_timer_default_end_time, game_timer_halftime_enabled, game_timer_alarm_sound",
    )
    .eq("club_id", clubId)
    .maybeSingle<TimerSettingsRow>();

  if (error) {
    throw new Error(`Spieluhr-Einstellungen konnten nicht geladen werden: ${error.message}`);
  }

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-900/20"
          >
            ← Zurück zum Adminbereich
          </Link>
        </div>

        <div className="rounded-[24px] border border-black/10 bg-white px-5 py-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Optionales Trainings-Tool
          </div>
          <h1 className="mt-2 text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">
            Spieluhr & Alarm
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Lege fest, ob dein Club die Spieluhr nutzt und welche Werte bei einem Training vorgeschlagen werden.
            Vor jedem Spiel können diese Werte für genau dieses Training angepasst werden.
          </p>
        </div>

        <div className="rounded-[24px] border border-black/10 bg-white p-5 shadow-sm">
          <GameTimerSettingsCard
            initialEnabled={data?.game_timer_enabled ?? false}
            initialMode={normalizeMode(data?.game_timer_default_mode ?? null)}
            initialDurationMinutes={
              data?.game_timer_default_minutes ??
              DEFAULT_GAME_TIMER_SETTINGS.durationMinutes
            }
            initialEndTime={normalizeTimerEndTime(data?.game_timer_default_end_time)}
            initialHalftimeEnabled={
              data?.game_timer_halftime_enabled ??
              DEFAULT_GAME_TIMER_SETTINGS.halftimeEnabled
            }
            initialAlarmSound={normalizeAlarm(data?.game_timer_alarm_sound ?? null)}
          />
        </div>
      </section>
    </main>
  );
}
