"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireClub } from "@/lib/auth/guards";
import { getClubBillingAccess } from "@/lib/billing/club-billing";
import { createClient } from "@/lib/supabase/server";

function isAdmin(role: string | null | undefined, isPowerUser: boolean) {
  return isPowerUser || role === "admin";
}

function numberValue(value: FormDataEntryValue | null) {
  const parsed = Number(String(value ?? "").trim());
  return Number.isFinite(parsed) ? parsed : NaN;
}

function dutyUrl(params: Record<string, string>) {
  const search = new URLSearchParams(params);
  return `/arbeitsdienste?${search.toString()}`;
}

export async function createWorkDutyEvent(formData: FormData) {
  const ctx = await requireClub();
  if (!isAdmin(ctx.membership.role, ctx.isPowerUser)) redirect("/arbeitsdienste");

  const title = String(formData.get("title") ?? "").trim();
  const eventDate = String(formData.get("event_date") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim() || null;
  const shiftLabel = String(formData.get("shift_label") ?? "").trim() || "Schicht";
  const startTime = String(formData.get("start_time") ?? "").trim();
  const endTime = String(formData.get("end_time") ?? "").trim();
  const capacity = Math.floor(numberValue(formData.get("capacity")));

  if (
    title.length < 2 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(eventDate) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime) ||
    endTime <= startTime ||
    !Number.isFinite(capacity) ||
    capacity < 1 ||
    capacity > 50
  ) {
    redirect(dutyUrl({ error: "invalid_event" }));
  }

  const supabase = await createClient();
  const billing = await getClubBillingAccess(supabase, ctx.clubId);

  if (!billing.isPro) {
    const today = new Date().toISOString().slice(0, 10);
    const { count } = await supabase
      .from("work_duty_events")
      .select("id", { count: "exact", head: true })
      .eq("club_id", ctx.clubId)
      .gte("event_date", today);

    if ((count ?? 0) >= 2) {
      redirect(dutyUrl({ error: "free_limit" }));
    }
  }

  const { data: event, error: eventError } = await supabase
    .from("work_duty_events")
    .insert({
      club_id: ctx.clubId,
      title,
      event_date: eventDate,
      location,
      created_by: ctx.user.id,
    })
    .select("id")
    .single<{ id: number }>();

  if (eventError || !event) {
    redirect(dutyUrl({ error: "save_failed" }));
  }

  const { error: shiftError } = await supabase.from("work_duty_shifts").insert({
    event_id: event.id,
    club_id: ctx.clubId,
    label: shiftLabel,
    start_time: startTime,
    end_time: endTime,
    capacity,
  });

  if (shiftError) {
    await supabase.from("work_duty_events").delete().eq("id", event.id).eq("club_id", ctx.clubId);
    redirect(dutyUrl({ error: "save_failed" }));
  }

  revalidatePath("/arbeitsdienste");
  redirect(dutyUrl({ saved: "event" }));
}

export async function addWorkDutyShift(formData: FormData) {
  const ctx = await requireClub();
  if (!isAdmin(ctx.membership.role, ctx.isPowerUser)) redirect("/arbeitsdienste");

  const eventId = Math.floor(numberValue(formData.get("event_id")));
  const label = String(formData.get("label") ?? "").trim();
  const startTime = String(formData.get("start_time") ?? "").trim();
  const endTime = String(formData.get("end_time") ?? "").trim();
  const capacity = Math.floor(numberValue(formData.get("capacity")));

  if (
    !Number.isFinite(eventId) ||
    !label ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime) ||
    endTime <= startTime ||
    !Number.isFinite(capacity) ||
    capacity < 1 ||
    capacity > 50
  ) {
    redirect(dutyUrl({ error: "invalid_shift" }));
  }

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("work_duty_events")
    .select("id")
    .eq("id", eventId)
    .eq("club_id", ctx.clubId)
    .maybeSingle();

  if (!event) redirect(dutyUrl({ error: "event_missing" }));

  const { error } = await supabase.from("work_duty_shifts").insert({
    event_id: eventId,
    club_id: ctx.clubId,
    label,
    start_time: startTime,
    end_time: endTime,
    capacity,
  });

  if (error) redirect(dutyUrl({ error: "save_failed" }));

  revalidatePath("/arbeitsdienste");
  redirect(dutyUrl({ saved: "shift" }));
}

export async function joinWorkDutyShift(formData: FormData) {
  const ctx = await requireClub();
  if (!ctx.player?.id) redirect("/arbeitsdienste");

  const shiftId = Math.floor(numberValue(formData.get("shift_id")));
  if (!Number.isFinite(shiftId)) redirect(dutyUrl({ error: "shift_missing" }));

  const supabase = await createClient();
  const { data: shift } = await supabase
    .from("work_duty_shifts")
    .select("id, capacity")
    .eq("id", shiftId)
    .eq("club_id", ctx.clubId)
    .maybeSingle<{ id: number; capacity: number }>();

  if (!shift) redirect(dutyUrl({ error: "shift_missing" }));

  const { count } = await supabase
    .from("work_duty_signups")
    .select("id", { count: "exact", head: true })
    .eq("shift_id", shiftId)
    .eq("club_id", ctx.clubId);

  if ((count ?? 0) >= shift.capacity) {
    redirect(dutyUrl({ error: "shift_full" }));
  }

  const { error } = await supabase.from("work_duty_signups").insert({
    shift_id: shiftId,
    club_id: ctx.clubId,
    player_id: ctx.player.id,
  });

  if (error && error.code !== "23505") redirect(dutyUrl({ error: "signup_failed" }));

  revalidatePath("/arbeitsdienste");
  redirect(dutyUrl({ saved: "signup" }));
}

export async function leaveWorkDutyShift(formData: FormData) {
  const ctx = await requireClub();
  if (!ctx.player?.id) redirect("/arbeitsdienste");

  const shiftId = Math.floor(numberValue(formData.get("shift_id")));
  const supabase = await createClient();

  await supabase
    .from("work_duty_signups")
    .delete()
    .eq("club_id", ctx.clubId)
    .eq("shift_id", shiftId)
    .eq("player_id", ctx.player.id)
    .eq("completed", false);

  revalidatePath("/arbeitsdienste");
  redirect(dutyUrl({ saved: "left" }));
}

export async function completeWorkDutySignup(formData: FormData) {
  const ctx = await requireClub();
  if (!isAdmin(ctx.membership.role, ctx.isPowerUser)) redirect("/arbeitsdienste");

  const signupId = Math.floor(numberValue(formData.get("signup_id")));
  const shiftMinutes = Math.floor(numberValue(formData.get("shift_minutes")));
  if (!Number.isFinite(signupId) || !Number.isFinite(shiftMinutes) || shiftMinutes < 0) {
    redirect(dutyUrl({ error: "invalid_credit" }));
  }

  const supabase = await createClient();
  const billing = await getClubBillingAccess(supabase, ctx.clubId);

  const payload = billing.isPro
    ? { completed: true, credited_minutes: Math.min(1440, shiftMinutes) }
    : { completed: true, credited_minutes: null };

  const { error } = await supabase
    .from("work_duty_signups")
    .update(payload)
    .eq("id", signupId)
    .eq("club_id", ctx.clubId);

  if (error) redirect(dutyUrl({ error: "save_failed" }));

  revalidatePath("/arbeitsdienste");
  redirect(dutyUrl({ saved: "completed" }));
}

export async function setWorkDutyTarget(formData: FormData) {
  const ctx = await requireClub();
  if (!isAdmin(ctx.membership.role, ctx.isPowerUser)) redirect("/arbeitsdienste");

  const hours = numberValue(formData.get("target_hours"));
  if (!Number.isFinite(hours) || hours < 0 || hours > 1000) {
    redirect(dutyUrl({ error: "invalid_target" }));
  }

  const supabase = await createClient();
  const billing = await getClubBillingAccess(supabase, ctx.clubId);
  if (!billing.isPro) redirect(dutyUrl({ error: "pro_required" }));

  const { error } = await supabase
    .from("club_settings")
    .upsert(
      { club_id: ctx.clubId, work_duty_target_minutes: Math.round(hours * 60) },
      { onConflict: "club_id" }
    );

  if (error) redirect(dutyUrl({ error: "save_failed" }));

  revalidatePath("/arbeitsdienste");
  redirect(dutyUrl({ saved: "target" }));
}
