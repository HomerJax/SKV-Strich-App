import Link from "next/link";
import ProFeatureLock from "@/components/billing/ProFeatureLock";
import { requireClub } from "@/lib/auth/guards";
import { getClubBillingAccess } from "@/lib/billing/club-billing";
import { createClient } from "@/lib/supabase/server";
import {
  addWorkDutyShift,
  completeWorkDutySignup,
  createWorkDutyEvent,
  joinWorkDutyShift,
  leaveWorkDutyShift,
  setWorkDutyTarget,
} from "./actions";

type Props = {
  searchParams?: Promise<{ saved?: string; error?: string }>;
};

type Player = {
  id: number;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
};

type DutyEvent = {
  id: number;
  title: string;
  event_date: string;
  location: string | null;
};

type DutyShift = {
  id: number;
  event_id: number;
  label: string;
  start_time: string;
  end_time: string;
  capacity: number;
};

type DutySignup = {
  id: number;
  shift_id: number;
  player_id: number;
  completed: boolean;
  credited_minutes: number | null;
};

function playerLabel(player: Player | undefined) {
  if (!player) return "Unbekannt";
  return (
    player.nickname?.trim() ||
    [player.first_name, player.last_name].filter(Boolean).join(" ") ||
    player.name ||
    `Spieler ${player.id}`
  );
}

function timeLabel(value: string) {
  return value.slice(0, 5);
}

function minutesBetween(start: string, end: string) {
  const [sh, sm] = start.slice(0, 5).split(":").map(Number);
  const [eh, em] = end.slice(0, 5).split(":").map(Number);
  return Math.max(0, eh * 60 + em - (sh * 60 + sm));
}

function hoursLabel(minutes: number) {
  const hours = minutes / 60;
  return Number.isInteger(hours) ? `${hours} h` : `${hours.toFixed(1).replace(".", ",")} h`;
}

function dutyBadge(minutes: number) {
  const hours = minutes / 60;
  if (hours >= 50) return "🏆 Vereinsheld";
  if (hours >= 25) return "🔥 Dauerbrenner";
  if (hours >= 10) return "💪 Anpacker";
  if (hours > 0) return "🛠 Erste Schicht";
  return null;
}

function message(error?: string, saved?: string) {
  if (saved) {
    const map: Record<string, string> = {
      event: "Arbeitsdienst angelegt.",
      shift: "Schicht ergänzt.",
      signup: "Du bist eingetragen.",
      left: "Eintragung entfernt.",
      completed: "Arbeitsdienst bestätigt.",
      target: "Saison-Soll gespeichert.",
    };
    return { ok: true, text: map[saved] ?? "Gespeichert." };
  }

  if (!error) return null;

  const map: Record<string, string> = {
    invalid_event: "Bitte Termin und erste Schicht vollständig ausfüllen.",
    invalid_shift: "Bitte die Schichtdaten prüfen.",
    free_limit: "Free erlaubt maximal zwei kommende Arbeitsdienst-Termine gleichzeitig.",
    shift_full: "Diese Schicht ist bereits voll.",
    pro_required: "Diese Funktion gehört zu strikr Pro.",
    invalid_target: "Bitte ein gültiges Stunden-Soll eingeben.",
  };

  return { ok: false, text: map[error] ?? "Das hat leider nicht geklappt." };
}

export default async function WorkDutiesPage({ searchParams }: Props) {
  const ctx = await requireClub();
  const query = (await searchParams) ?? {};
  const supabase = await createClient();
  const isAdmin = ctx.isPowerUser || ctx.membership.role === "admin";

  const [
    billingAccess,
    { data: club },
    { data: settings },
    { data: playersData },
    { data: eventsData },
    { data: shiftsData },
    { data: signupsData },
    { data: seasonsData },
  ] = await Promise.all([
    getClubBillingAccess(supabase, ctx.clubId),
    supabase.from("clubs").select("display_name").eq("id", ctx.clubId).maybeSingle<{ display_name: string | null }>(),
    supabase.from("club_settings").select("work_duty_target_minutes").eq("club_id", ctx.clubId).maybeSingle<{ work_duty_target_minutes: number | null }>(),
    supabase.from("players").select("id,name,first_name,last_name,nickname").eq("club_id", ctx.clubId).eq("is_active", true).order("name"),
    supabase.from("work_duty_events").select("id,title,event_date,location").eq("club_id", ctx.clubId).order("event_date"),
    supabase.from("work_duty_shifts").select("id,event_id,label,start_time,end_time,capacity").eq("club_id", ctx.clubId).order("start_time"),
    supabase.from("work_duty_signups").select("id,shift_id,player_id,completed,credited_minutes").eq("club_id", ctx.clubId),
    supabase.from("seasons").select("id,name,start_date,end_date").eq("club_id", ctx.clubId).order("start_date", { ascending: false }),
  ]);

  const players = (playersData ?? []) as Player[];
  const events = (eventsData ?? []) as DutyEvent[];
  const shifts = (shiftsData ?? []) as DutyShift[];
  const signups = (signupsData ?? []) as DutySignup[];
  const playersById = new Map(players.map((player) => [player.id, player]));
  const myPlayerId = ctx.player?.id ?? null;
  const targetMinutes = settings?.work_duty_target_minutes ?? 0;
  const today = new Date().toISOString().slice(0, 10);

  const currentSeason =
    (seasonsData ?? []).find((season) => season.start_date <= today && (!season.end_date || season.end_date >= today)) ??
    (seasonsData ?? [])[0] ??
    null;

  const seasonEventIds = new Set(
    events
      .filter((event) => {
        if (!currentSeason) return true;
        return event.event_date >= currentSeason.start_date && (!currentSeason.end_date || event.event_date <= currentSeason.end_date);
      })
      .map((event) => event.id)
  );

  const seasonShiftIds = new Set(shifts.filter((shift) => seasonEventIds.has(shift.event_id)).map((shift) => shift.id));
  const creditedByPlayer = new Map<number, number>();

  for (const signup of signups) {
    if (!signup.completed || !seasonShiftIds.has(signup.shift_id)) continue;
    const shift = shifts.find((row) => row.id === signup.shift_id);
    if (!shift) continue;
    const minutes = signup.credited_minutes ?? minutesBetween(shift.start_time, shift.end_time);
    creditedByPlayer.set(signup.player_id, (creditedByPlayer.get(signup.player_id) ?? 0) + minutes);
  }

  const summary = players
    .map((player) => ({ player, minutes: creditedByPlayer.get(player.id) ?? 0 }))
    .sort((a, b) => b.minutes - a.minutes || playerLabel(a.player).localeCompare(playerLabel(b.player)));

  const flash = message(query.error, query.saved);
  const clubName = club?.display_name?.trim() || "Dein Team";

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto max-w-5xl space-y-4 px-4 py-5 pb-24">
        <div className="flex items-center justify-between gap-3">
          <Link href="/home" className="text-sm font-semibold text-slate-600">← Home</Link>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-600">
            {billingAccess.isPro ? "strikr Pro" : "Free"}
          </span>
        </div>

        <header className="rounded-[28px] bg-slate-950 p-6 text-white shadow-sm">
          <div className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-300">Teamleben</div>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Arbeitsdienste</h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-300">
            Schichten besetzen, Dienste fair verteilen und – mit Pro – die geleisteten Stunden über die Saison transparent halten.
          </p>
        </header>

        {flash ? (
          <div className={`rounded-2xl border px-4 py-3 text-sm font-bold ${flash.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
            {flash.text}
          </div>
        ) : null}

        {billingAccess.isPro ? (
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700">Pro · Saisonübersicht</div>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  {currentSeason?.name || "Aktuelle Saison"}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {targetMinutes > 0 ? `Soll pro Person: ${hoursLabel(targetMinutes)}` : "Noch kein Saison-Soll gesetzt."}
                </p>
              </div>
              {isAdmin ? (
                <form action={setWorkDutyTarget} className="flex items-end gap-2">
                  <label className="text-xs font-bold text-slate-600">
                    Sollstunden
                    <input
                      name="target_hours"
                      type="number"
                      min="0"
                      max="1000"
                      step="0.5"
                      defaultValue={targetMinutes / 60}
                      className="mt-1 block w-28 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-950"
                    />
                  </label>
                  <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white">Speichern</button>
                </form>
              ) : null}
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
              <div className="grid grid-cols-[1fr_auto_auto] gap-3 bg-slate-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-500">
                <span>Spieler</span><span>Stunden</span><span>Offen</span>
              </div>
              {summary.map(({ player, minutes }) => {
                const open = Math.max(0, targetMinutes - minutes);
                const badge = dutyBadge(minutes);
                return (
                  <div key={player.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-t border-slate-100 px-4 py-3 text-sm">
                    <div>
                      <div className="font-black text-slate-950">{playerLabel(player)}</div>
                      {badge ? <div className="mt-0.5 text-xs font-bold text-amber-700">{badge}</div> : null}
                    </div>
                    <div className="font-black text-slate-900">{hoursLabel(minutes)}</div>
                    <div className={`font-black ${open === 0 && targetMinutes > 0 ? "text-emerald-700" : "text-slate-500"}`}>
                      {targetMinutes > 0 ? (open === 0 ? "✓" : hoursLabel(open)) : "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : (
          <ProFeatureLock
            clubName={clubName}
            title="Arbeitsdienste Pro"
            description="Mit Pro bekommst du Saison-Stundenkonto, Soll/Ist-Vergleich, Teamübersicht, Admin-Korrekturen und Arbeitsdienst-Badges."
            featureList={[
              "Arbeitsstunden über die ganze Saison",
              "Soll/Ist und offene Reststunden pro Person",
              "Arbeitsdienst-Badges",
              "Unbegrenzte kommende Arbeitsdienste",
            ]}
            compact
          />
        )}

        <section className="space-y-3">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Schichten</div>
            <h2 className="mt-1 text-xl font-black text-slate-950">Kommende & vergangene Dienste</h2>
          </div>

          {events.length === 0 ? (
            <div className="rounded-[24px] border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
              Noch keine Arbeitsdienste angelegt.
            </div>
          ) : null}

          {events.map((event) => {
            const eventShifts = shifts.filter((shift) => shift.event_id === event.id);
            return (
              <article key={event.id} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-slate-950">{event.title}</h3>
                    <div className="mt-1 text-sm font-semibold text-slate-500">
                      {event.event_date}{event.location ? ` · ${event.location}` : ""}
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                    {eventShifts.length} {eventShifts.length === 1 ? "Schicht" : "Schichten"}
                  </span>
                </div>

                <div className="mt-4 grid gap-3">
                  {eventShifts.map((shift) => {
                    const shiftSignups = signups.filter((signup) => signup.shift_id === shift.id);
                    const mine = myPlayerId ? shiftSignups.find((signup) => signup.player_id === myPlayerId) : null;
                    const shiftMinutes = minutesBetween(shift.start_time, shift.end_time);
                    const full = shiftSignups.length >= shift.capacity;
                    return (
                      <div key={shift.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="font-black text-slate-950">{shift.label}</div>
                            <div className="text-sm font-semibold text-slate-500">
                              {timeLabel(shift.start_time)}–{timeLabel(shift.end_time)} · {hoursLabel(shiftMinutes)} · {shiftSignups.length}/{shift.capacity} belegt
                            </div>
                          </div>
                          {mine ? (
                            <form action={leaveWorkDutyShift}>
                              <input type="hidden" name="shift_id" value={shift.id} />
                              <button disabled={mine.completed} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-40">
                                {mine.completed ? "Erledigt ✓" : "Austragen"}
                              </button>
                            </form>
                          ) : (
                            <form action={joinWorkDutyShift}>
                              <input type="hidden" name="shift_id" value={shift.id} />
                              <button disabled={!myPlayerId || full} className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white disabled:bg-slate-300">
                                {full ? "Voll" : "Eintragen"}
                              </button>
                            </form>
                          )}
                        </div>

                        {shiftSignups.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {shiftSignups.map((signup) => (
                              <div key={signup.id} className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700">
                                <span>{playerLabel(playersById.get(signup.player_id))}{signup.completed ? " ✓" : ""}</span>
                                {isAdmin && !signup.completed ? (
                                  <form action={completeWorkDutySignup}>
                                    <input type="hidden" name="signup_id" value={signup.id} />
                                    <input type="hidden" name="shift_minutes" value={shiftMinutes} />
                                    <button className="text-emerald-700 underline underline-offset-2">erledigt</button>
                                  </form>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                {isAdmin ? (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-black text-slate-700">+ weitere Schicht</summary>
                    <form action={addWorkDutyShift} className="mt-3 grid gap-2 sm:grid-cols-5">
                      <input type="hidden" name="event_id" value={event.id} />
                      <input name="label" required placeholder="z. B. Bierstand 2" className="rounded-xl border border-slate-200 px-3 py-2 text-sm sm:col-span-2" />
                      <input name="start_time" required type="time" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                      <input name="end_time" required type="time" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                      <div className="flex gap-2">
                        <input name="capacity" required type="number" min="1" max="50" defaultValue="2" className="w-20 rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                        <button className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white">+</button>
                      </div>
                    </form>
                  </details>
                ) : null}
              </article>
            );
          })}
        </section>

        {isAdmin ? (
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Admin</div>
            <h2 className="mt-1 text-xl font-black text-slate-950">Arbeitsdienst anlegen</h2>
            {!billingAccess.isPro ? (
              <p className="mt-1 text-sm text-slate-600">Free: maximal zwei kommende Termine gleichzeitig. Pro: unbegrenzt.</p>
            ) : null}
            <form action={createWorkDutyEvent} className="mt-4 grid gap-3 sm:grid-cols-2">
              <input name="title" required placeholder="z. B. Vereinsfest · Bierstand" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
              <input name="event_date" required type="date" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
              <input name="location" placeholder="Ort (optional)" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
              <input name="shift_label" required placeholder="Schichtname" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
              <input name="start_time" required type="time" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
              <input name="end_time" required type="time" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
              <label className="text-xs font-bold text-slate-600">
                Personen
                <input name="capacity" required type="number" min="1" max="50" defaultValue="2" className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
              </label>
              <button className="self-end rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">Arbeitsdienst anlegen</button>
            </form>
          </section>
        ) : null}
      </section>
    </main>
  );
}
