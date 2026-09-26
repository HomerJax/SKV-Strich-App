import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";
import { canManageClub } from "@/lib/auth/access";
import { getServerI18n } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/messages";

type SeasonRow = {
  id: number;
  name: string;
  start_date: string | null;
  end_date: string | null;
};

function parseIsoDate(value: string) {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const date = new Date(`${trimmed}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getWeekdayNumber(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (raw === "") return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 6 ? parsed : null;
}

type Translate = (key: MessageKey, params?: Record<string, string | number | null | undefined>) => string;

function getDatesForWeekdaysInRange(startDateIso: string, endDateIso: string, weekdays: number[], t: Translate) {
  const start = parseIsoDate(startDateIso);
  const end = parseIsoDate(endDateIso);
  if (!start || !end) return { error: t("seasonApi.invalidDates"), dates: [] as string[] };
  if (start > end) return { error: t("seasonApi.startAfterEnd"), dates: [] as string[] };
  const weekdaySet = new Set(weekdays);
  if (weekdaySet.size === 0) return { error: "", dates: [] as string[] };
  const dates: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    if (weekdaySet.has(cursor.getDay())) {
      const yyyy = cursor.getFullYear();
      const mm = String(cursor.getMonth() + 1).padStart(2, "0");
      const dd = String(cursor.getDate()).padStart(2, "0");
      dates.push(`${yyyy}-${mm}-${dd}`);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return { error: "", dates };
}

function buildRedirectUrl(requestUrl: string, redirectTo: string) {
  return new URL(redirectTo || "/admin/seasons", requestUrl);
}

function withMessage(requestUrl: string, redirectTo: string, params: { message?: string; error?: string; season_message?: string; season_error?: string }) {
  const url = buildRedirectUrl(requestUrl, redirectTo);
  if (params.message) { url.searchParams.set("message", params.message); url.searchParams.set("season_message", params.message); }
  if (params.error) { url.searchParams.set("error", params.error); url.searchParams.set("season_error", params.error); }
  if (params.season_message) url.searchParams.set("season_message", params.season_message);
  if (params.season_error) url.searchParams.set("season_error", params.season_error);
  return NextResponse.redirect(url, { status: 303 });
}

function buildCreateSuccessMessage(seasonName: string, createdSessionsCount: number, skippedSessionsCount: number, t: Translate) {
  if (createdSessionsCount <= 0 && skippedSessionsCount <= 0) return t("seasonApi.created", { name: seasonName });
  if (createdSessionsCount > 0 && skippedSessionsCount <= 0) return t("seasonApi.createdTrainings", { name: seasonName, count: createdSessionsCount });
  if (createdSessionsCount <= 0 && skippedSessionsCount > 0) return t("seasonApi.createdExisting", { name: seasonName });
  return t("seasonApi.createdMixed", { name: seasonName, created: createdSessionsCount, skipped: skippedSessionsCount });
}

function revalidateSeasonRelatedPages() {
  revalidatePath("/admin/seasons");
  revalidatePath("/admin/settings");
  revalidatePath("/club-setup");
  revalidatePath("/sessions");
  revalidatePath("/sessions/archive");
}

export async function POST(request: Request) {
  const { t } = await getServerI18n();
  const formData = await request.formData();
  const redirectTo = String(formData.get("redirect_to") ?? "/admin/seasons").trim();
  try {
    const { clubId, membership, isPowerUser } = await requireClub();
    if (!canManageClub({ isPowerUser, role: membership.role })) return withMessage(request.url, redirectTo, { error: t("seasonApi.forbidden") });
    const supabase = await createClient();
    const intent = String(formData.get("intent") ?? "").trim();

    if (intent === "update-training-time") {
      const seasonId = Number(String(formData.get("season_id") ?? "").trim());
      const startTime = String(formData.get("start_time") ?? "").trim();
      const fromDate = String(formData.get("from_date") ?? "").trim();
      if (!Number.isFinite(seasonId)) return withMessage(request.url, redirectTo, { error: t("seasonApi.invalidSeason") });
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) return withMessage(request.url, redirectTo, { error: t("seasonApi.invalidTrainingTime") });
      if (!parseIsoDate(fromDate)) return withMessage(request.url, redirectTo, { error: t("seasonApi.invalidStartDate") });
      const { data: season, error: seasonError } = await supabase.from("seasons").select("id, name, start_date, end_date").eq("club_id", clubId).eq("id", seasonId).maybeSingle<SeasonRow>();
      if (seasonError || !season) return withMessage(request.url, redirectTo, { error: seasonError?.message || t("seasonApi.loadFailed") });
      let query = supabase.from("sessions").update({ start_time: startTime }).eq("club_id", clubId).eq("season_id", seasonId).eq("type", "training").gte("date", fromDate);
      if (season.end_date) query = query.lte("date", season.end_date);
      const { data: updated, error: updateError } = await query.select("id");
      if (updateError) return withMessage(request.url, redirectTo, { error: updateError.message || t("seasonApi.trainingTimeFailed") });
      revalidateSeasonRelatedPages();
      const count = updated?.length ?? 0;
      return withMessage(request.url, redirectTo, { message: t("seasonApi.trainingTimeUpdated", { count, name: season.name, time: startTime }) });
    }

    if (intent === "delete") {
      const seasonId = Number(String(formData.get("season_id") ?? "").trim());
      if (!Number.isFinite(seasonId)) return withMessage(request.url, redirectTo, { error: t("seasonApi.invalidSeason") });
      const { error } = await supabase.from("seasons").delete().eq("club_id", clubId).eq("id", seasonId);
      if (error) return withMessage(request.url, redirectTo, { error: error.message || t("seasonApi.deleteFailed") });
      revalidateSeasonRelatedPages();
      return withMessage(request.url, redirectTo, { message: t("seasonApi.deleted") });
    }

    if (intent === "update") {
      const seasonId = Number(String(formData.get("season_id") ?? "").trim());
      const name = String(formData.get("name") ?? "").trim();
      const startDate = String(formData.get("start_date") ?? "").trim();
      const endDate = String(formData.get("end_date") ?? "").trim();
      if (!Number.isFinite(seasonId)) return withMessage(request.url, redirectTo, { error: t("seasonApi.invalidSeason") });
      if (!name) return withMessage(request.url, redirectTo, { error: t("seasonApi.nameRequired") });
      const parsedStart = parseIsoDate(startDate); const parsedEnd = endDate ? parseIsoDate(endDate) : null;
      if (!parsedStart || (endDate && !parsedEnd)) return withMessage(request.url, redirectTo, { error: t("seasonApi.invalidDates") });
      if (parsedEnd && parsedStart > parsedEnd) return withMessage(request.url, redirectTo, { error: t("seasonApi.startAfterEnd") });
      const { error: updateError } = await supabase.from("seasons").update({ name, start_date: startDate, end_date: endDate || null }).eq("club_id", clubId).eq("id", seasonId);
      if (updateError) return withMessage(request.url, redirectTo, { error: updateError.message || t("seasonApi.updateFailed") });
      let sessionQuery = supabase.from("sessions").update({ season_id: seasonId }).eq("club_id", clubId).gte("date", startDate);
      if (endDate) sessionQuery = sessionQuery.lte("date", endDate);
      const { error: sessionUpdateError } = await sessionQuery.or(`season_id.is.null,season_id.eq.${seasonId}`);
      if (sessionUpdateError) return withMessage(request.url, redirectTo, { error: sessionUpdateError.message || t("seasonApi.reassignFailed") });
      revalidateSeasonRelatedPages();
      return withMessage(request.url, redirectTo, { message: t("seasonApi.updated", { name }) });
    }

    if (intent !== "create") return withMessage(request.url, redirectTo, { error: t("seasonApi.unknownAction") });
    const name = String(formData.get("name") ?? "").trim();
    const startDate = String(formData.get("start_date") ?? "").trim();
    const endDate = String(formData.get("end_date") ?? "").trim();
    if (!name) return withMessage(request.url, redirectTo, { error: t("seasonApi.nameRequired") });
    const parsedStart = parseIsoDate(startDate); const parsedEnd = endDate ? parseIsoDate(endDate) : null;
    if (!parsedStart || (endDate && !parsedEnd)) return withMessage(request.url, redirectTo, { error: t("seasonApi.invalidDates") });
    if (parsedEnd && parsedStart > parsedEnd) return withMessage(request.url, redirectTo, { error: t("seasonApi.startAfterEnd") });
    const weekdayOne = getWeekdayNumber(formData.get("weekday_one")); const weekdayTwo = getWeekdayNumber(formData.get("weekday_two"));
    const selectedWeekdays = Array.from(new Set([weekdayOne, weekdayTwo].filter((value): value is number => value !== null)));
    const { data: createdSeason, error: seasonInsertError } = await supabase.from("seasons").insert({ club_id: clubId, name, start_date: startDate, end_date: endDate || null }).select("id, name, start_date, end_date").single<SeasonRow>();
    if (seasonInsertError || !createdSeason) return withMessage(request.url, redirectTo, { error: seasonInsertError?.message || t("seasonApi.createFailed") });
    if (selectedWeekdays.length === 0) { revalidateSeasonRelatedPages(); return withMessage(request.url, redirectTo, { message: buildCreateSuccessMessage(createdSeason.name, 0, 0, t) }); }
    const generated = getDatesForWeekdaysInRange(createdSeason.start_date ?? "", createdSeason.end_date ?? "", selectedWeekdays, t);
    if (generated.error) return withMessage(request.url, redirectTo, { error: generated.error });
    if (generated.dates.length === 0) { revalidateSeasonRelatedPages(); return withMessage(request.url, redirectTo, { message: buildCreateSuccessMessage(createdSeason.name, 0, 0, t) }); }
    const existingDatesResult = await supabase.from("sessions").select("date").eq("club_id", clubId).in("date", generated.dates);
    if (existingDatesResult.error) return withMessage(request.url, redirectTo, { error: existingDatesResult.error.message || t("seasonApi.existingCheckFailed") });
    const existingDates = new Set((((existingDatesResult.data as { date: string }[] | null) ?? []).map((row) => row.date)));
    const datesToCreate = generated.dates.filter((currentDate) => !existingDates.has(currentDate));
    const skippedSessionsCount = generated.dates.length - datesToCreate.length;
    if (datesToCreate.length > 0) {
      const rowsToInsert = datesToCreate.map((date) => ({ date, club_id: clubId, season_id: createdSeason.id, notes: null as string | null }));
      const { error: sessionInsertError } = await supabase.from("sessions").insert(rowsToInsert);
      if (sessionInsertError) return withMessage(request.url, redirectTo, { error: sessionInsertError.message || t("seasonApi.seriesCreateFailed") });
    }
    revalidateSeasonRelatedPages();
    return withMessage(request.url, redirectTo, { message: buildCreateSuccessMessage(createdSeason.name, datesToCreate.length, skippedSessionsCount, t) });
  } catch (error) {
    return withMessage(request.url, redirectTo, { error: error instanceof Error ? error.message : t("seasonApi.saveFailed") });
  }
}
