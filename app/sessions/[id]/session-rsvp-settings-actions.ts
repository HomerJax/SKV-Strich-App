"use server";

import { revalidatePath } from "next/cache";
import { requireClub } from "@/lib/auth/guards";
import { canManageClub } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { MAX_RSVP_DEADLINE_MINUTES } from "@/lib/session-rsvp-deadline";
import { getServerI18n } from "@/lib/i18n/server";

type Scope = "single" | "future" | "series";

function normalizeScope(value: FormDataEntryValue | null): Scope {
  const raw = String(value ?? "").trim();
  if (raw === "future" || raw === "series") return raw;
  return "single";
}

export async function updateSessionRsvpSettingsAction(formData: FormData) {
  const { clubId, membership, isPowerUser } = await requireClub();
  const { t } = await getServerI18n();

  if (!canManageClub({ isPowerUser, role: membership.role })) {
    throw new Error(t("sessionAction.adminOnlySettings"));
  }

  const sessionId = Number(String(formData.get("sessionId") ?? "").trim());
  const startTimeRaw = String(formData.get("start_time") ?? "").trim();
  const overrideRaw = String(formData.get("rsvp_deadline_minutes_before") ?? "").trim();
  const requestedScope = normalizeScope(formData.get("scope"));

  if (!Number.isFinite(sessionId)) {
    throw new Error(t("sessionAction.invalidId"));
  }

  const startTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(startTimeRaw)
    ? startTimeRaw
    : null;

  if (!startTime) {
    throw new Error(t("sessionAction.invalidStartTime"));
  }

  let deadlineOverride: number | null = null;
  if (overrideRaw !== "") {
    const parsed = Number(overrideRaw);
    if (
      !Number.isInteger(parsed) ||
      parsed < 0 ||
      parsed > MAX_RSVP_DEADLINE_MINUTES
    ) {
      throw new Error(t("sessionAction.invalidDeadline"));
    }
    deadlineOverride = parsed;
  }

  const supabase = await createClient();
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id,date,series_id")
    .eq("id", sessionId)
    .eq("club_id", clubId)
    .maybeSingle<{ id: number; date: string; series_id: string | null }>();

  if (sessionError) {
    throw new Error(t("sessionAction.checkFailed", { error: sessionError.message }));
  }
  if (!session) {
    throw new Error(t("sessionAction.notFound"));
  }

  const scope: Scope = session.series_id ? requestedScope : "single";
  let targetQuery = supabase
    .from("sessions")
    .select("id")
    .eq("club_id", clubId);

  if (scope === "single") {
    targetQuery = targetQuery.eq("id", sessionId);
  } else {
    targetQuery = targetQuery.eq("series_id", session.series_id!);
    if (scope === "future") {
      targetQuery = targetQuery.gte("date", session.date);
    }
  }

  const { data: targets, error: targetsError } = await targetQuery;
  if (targetsError) {
    throw new Error(t("sessionAction.seriesLoadFailed", { error: targetsError.message }));
  }

  const targetIds = (targets ?? []).map((row) => Number(row.id));
  if (targetIds.length === 0) {
    throw new Error(t("sessionAction.noTargets"));
  }

  const { error } = await supabase
    .from("sessions")
    .update({
      start_time: startTime,
      rsvp_deadline_minutes_before: deadlineOverride,
    })
    .eq("club_id", clubId)
    .in("id", targetIds);

  if (error) {
    throw new Error(t("sessionAction.settingsSaveFailed", { error: error.message }));
  }

  for (const targetId of targetIds) {
    revalidatePath(`/sessions/${targetId}`);
  }
  revalidatePath("/sessions");
  revalidatePath("/home");
}
