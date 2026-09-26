import { randomUUID } from "crypto";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";
import { getFeatureFlagsForClub } from "@/lib/feature-flags";
import { sendClubPush } from "@/lib/push/club-events";
import NewSessionForm from "./NewSessionForm";
import { getServerI18n } from "@/lib/i18n/server";
import { translate } from "@/lib/i18n/messages";
import type { AppLocale } from "@/lib/i18n/config";

type NewSessionPageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

type SeasonRow = {
  id: number;
  name: string;
  start_date: string | null;
  end_date: string | null;
};

type CreateMode = "single" | "series";
type SessionType = "training" | "event";

type NewSessionFormSeason = {
  id: number;
  name: string;
  start_date: string | null;
  end_date: string | null;
};

function getTodayIsoDate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseIsoDate(value: string) {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;

  const date = new Date(`${trimmed}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function formatDateForPush(value: string, locale: AppLocale) {
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(locale === "de" ? "de-DE" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
  });
}

function normalizeSessionType(
  value: FormDataEntryValue | null,
  enabled: boolean
): SessionType {
  if (!enabled) return "training";
  return String(value ?? "").trim() === "event" ? "event" : "training";
}

function getSessionTypeLabel(type: SessionType, locale: AppLocale) {
  return translate(
    locale,
    type === "event" ? "newSession.event" : "newSession.training",
  );
}

function getSessionTypePlural(type: SessionType, locale: AppLocale) {
  return translate(
    locale,
    type === "event" ? "newSession.eventsPlural" : "newSession.trainingsPlural",
  );
}

function formatSuccessMessage(
  count: number,
  type: SessionType,
  locale: AppLocale,
) {
  if (count <= 1) {
    return translate(locale, "newSession.createdOne", {
      type: getSessionTypeLabel(type, locale),
    });
  }

  return translate(locale, "newSession.createdMany", {
    count,
    type: getSessionTypePlural(type, locale),
  });
}

function getWeekdayNumber(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (raw === "") return null;

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 6) {
    return null;
  }

  return parsed;
}

function getDatesForWeekdaysInRange(
  startDateIso: string,
  endDateIso: string,
  weekdays: number[],
  locale: AppLocale,
) {
  const start = parseIsoDate(startDateIso);
  const end = parseIsoDate(endDateIso);

  if (!start || !end) {
    return {
      error: translate(locale, "newSession.invalidDates"),
      dates: [] as string[],
    };
  }

  if (start > end) {
    return {
      error: translate(locale, "newSession.startBeforeEnd"),
      dates: [] as string[],
    };
  }

  const weekdaySet = new Set(weekdays);
  if (weekdaySet.size === 0) {
    return {
      error: translate(locale, "newSession.selectWeekday"),
      dates: [] as string[],
    };
  }

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

async function findSeasonIdForDate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clubId: string,
  date: string,
  locale: AppLocale,
) {
  const { data: season, error } = await supabase
    .from("seasons")
    .select("id, start_date, end_date")
    .eq("club_id", clubId)
    .lte("start_date", date)
    .gte("end_date", date)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      translate(locale, "newSession.seasonLoadFailed", { error: error.message }),
    );
  }

  return season?.id ?? null;
}

function isNextRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export default async function NewSessionPage({
  searchParams,
}: NewSessionPageProps) {
  const { locale, t } = await getServerI18n();
  const { clubId } = await requireClub();
  const supabase = await createClient();
  const resolvedSearchParams = await searchParams;
  const featureFlags = await getFeatureFlagsForClub(clubId);

  const sessionTypesEnabled = featureFlags.session_types ?? false;
  const todayIso = getTodayIsoDate();
  const errorMessage = resolvedSearchParams?.error ?? "";
  const successMessage = resolvedSearchParams?.success ?? "";

  const { data: seasonsData, error: seasonsError } = await supabase
    .from("seasons")
    .select("id, name, start_date, end_date")
    .eq("club_id", clubId)
    .order("start_date", { ascending: false });

  if (seasonsError) {
    throw new Error(
      seasonsError.message || t("newSession.seasonsLoadFailed")
    );
  }

  const seasons = ((seasonsData as SeasonRow[] | null) ?? []).filter(
    (season) => season.start_date && season.end_date
  );

  async function createSessionAction(formData: FormData) {
    "use server";

    const { clubId: actionClubId, user: actionUser } = await requireClub();
    const { locale: actionLocale, t: actionT } = await getServerI18n();
    const actionSupabase = await createClient();
    const actionFlags = await getFeatureFlagsForClub(actionClubId);

    const modeRaw = String(formData.get("mode") ?? "single").trim();
    const mode: CreateMode = modeRaw === "series" ? "series" : "single";
    const sessionTypesActive = actionFlags.session_types ?? false;
    const sessionType = normalizeSessionType(
      formData.get("type"),
      sessionTypesActive
    );

    const date = String(formData.get("date") ?? "").trim();
    const startTimeRaw = String(formData.get("start_time") ?? "").trim();
    const startTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(startTimeRaw)
      ? startTimeRaw
      : null;
    const notesRaw = String(formData.get("notes") ?? "").trim();
    const notes = notesRaw === "" ? null : notesRaw;

    const seriesStartDate = String(
      formData.get("series_start_date") ?? ""
    ).trim();
    const selectedSeasonIdRaw = String(
      formData.get("series_season_id") ?? ""
    ).trim();
    const selectedSeasonId = Number(selectedSeasonIdRaw);
    const weekdayOne = getWeekdayNumber(formData.get("weekday_one"));
    const weekdayTwo = getWeekdayNumber(formData.get("weekday_two"));

    try {
      if (mode === "single") {
        if (!date) {
          redirect(`/sessions/new?error=${encodeURIComponent(actionT("newSession.selectDate"))}`);
        }

        if (!startTime) {
          redirect(`/sessions/new?error=${encodeURIComponent(actionT("newSession.selectTime"))}`);
        }

        const seasonId = await findSeasonIdForDate(
          actionSupabase,
          actionClubId,
          date,
          actionLocale,
        );

        const { data: created, error: insertError } = await actionSupabase
          .from("sessions")
          .insert({
            date,
            start_time: startTime,
            notes,
            season_id: seasonId,
            club_id: actionClubId,
            type: sessionType,
          })
          .select("id")
          .single();

        if (insertError) {
          redirect(
            `/sessions/new?error=${encodeURIComponent(
              insertError.message || actionT("newSession.saveFailed")
            )}`
          );
        }

        try {
          const label = getSessionTypeLabel(sessionType, actionLocale);
          await sendClubPush({
            clubId: actionClubId,
            title: actionT("newSession.pushNew", { type: label }),
            body: actionT("newSession.pushBody", {
              type: label,
              date: formatDateForPush(date, actionLocale),
              time: startTime,
            }),
            url: `/sessions/${created.id}`,
            preference: "training_reminders",
            excludeUserIds: [actionUser.id],
          });
        } catch (error) {
          console.error("New session push failed", error);
        }

        redirect(`/sessions/${created.id}`);
      }

      if (!Number.isFinite(selectedSeasonId)) {
        redirect(`/sessions/new?error=${encodeURIComponent(actionT("newSession.selectSeason"))}`);
      }

      const { data: season, error: seasonError } = await actionSupabase
        .from("seasons")
        .select("id, name, start_date, end_date")
        .eq("club_id", actionClubId)
        .eq("id", selectedSeasonId)
        .maybeSingle<SeasonRow>();

      if (seasonError) {
        redirect(
          `/sessions/new?error=${encodeURIComponent(
            seasonError.message || actionT("newSession.seasonsLoadFailed")
          )}`
        );
      }

      if (!season?.start_date || !season?.end_date) {
        redirect(
          `/sessions/new?error=${encodeURIComponent(actionT("newSession.invalidSeasonRange"))}`
        );
      }

      if (!seriesStartDate) {
        redirect(
          `/sessions/new?error=${encodeURIComponent(actionT("newSession.selectSeriesStart"))}`
        );
      }

      const seasonStart = parseIsoDate(season.start_date);
      const seasonEnd = parseIsoDate(season.end_date);
      const seriesStart = parseIsoDate(seriesStartDate);

      if (!seasonStart || !seasonEnd || !seriesStart) {
        redirect(
          `/sessions/new?error=${encodeURIComponent(actionT("newSession.dateProcessingFailed"))}`
        );
      }

      if (seriesStart < seasonStart || seriesStart > seasonEnd) {
        redirect(
          `/sessions/new?error=${encodeURIComponent(actionT("newSession.startWithinSeason"))}`
        );
      }

      const selectedWeekdays = Array.from(
        new Set(
          [weekdayOne, weekdayTwo].filter((value): value is number => value !== null)
        )
      );

      const generated = getDatesForWeekdaysInRange(
        seriesStartDate,
        season.end_date,
        selectedWeekdays,
        actionLocale,
      );

      if (generated.error) {
        redirect(`/sessions/new?error=${encodeURIComponent(generated.error)}`);
      }

      if (generated.dates.length === 0) {
        redirect(
          `/sessions/new?error=${encodeURIComponent(actionT("newSession.noMatchingDates"))}`
        );
      }

      const existingDatesResult = await actionSupabase
        .from("sessions")
        .select("date")
        .eq("club_id", actionClubId)
        .eq("type", sessionType)
        .in("date", generated.dates);

      if (existingDatesResult.error) {
        redirect(
          `/sessions/new?error=${encodeURIComponent(
            existingDatesResult.error.message ||
              actionT("newSession.checkExistingFailed")
          )}`
        );
      }

      const existingDates = new Set(
        (((existingDatesResult.data as { date: string }[] | null) ?? []).map(
          (row) => row.date
        ))
      );

      const datesToCreate = generated.dates.filter(
        (entry) => !existingDates.has(entry)
      );

      if (datesToCreate.length === 0) {
        redirect(
          `/sessions/new?error=${encodeURIComponent(actionT("newSession.allDatesExist"))}`
        );
      }

      const seriesId = randomUUID();
      const rowsToInsert = datesToCreate.map((currentDate, index) => ({
        date: currentDate,
        start_time: startTime,
        notes,
        season_id: season.id,
        club_id: actionClubId,
        type: sessionType,
        series_id: seriesId,
        series_index: index + 1,
      }));

      const { error: insertError } = await actionSupabase
        .from("sessions")
        .insert(rowsToInsert);

      if (insertError) {
        redirect(
          `/sessions/new?error=${encodeURIComponent(
            insertError.message || actionT("newSession.seriesCreateFailed")
          )}`
        );
      }

      try {
        const pluralLabel = getSessionTypePlural(sessionType, actionLocale);
        await sendClubPush({
          clubId: actionClubId,
          title: actionT("newSession.pushMany", {
            count: rowsToInsert.length,
            type: pluralLabel,
          }),
          body: actionT("newSession.pushManyBody", { type: pluralLabel }),
          url: "/sessions",
          preference: "training_reminders",
          excludeUserIds: [actionUser.id],
        });
      } catch (error) {
        console.error("New session series push failed", error);
      }

      redirect(
        `/sessions?success=${encodeURIComponent(
          formatSuccessMessage(rowsToInsert.length, sessionType, actionLocale)
        )}`
      );
    } catch (error) {
      if (isNextRedirectError(error)) {
        throw error;
      }

      const message =
        error instanceof Error ? error.message : actionT("newSession.saveFailed");

      redirect(`/sessions/new?error=${encodeURIComponent(message)}`);
    }
  }

  const formSeasons: NewSessionFormSeason[] = seasons.map((season) => ({
    id: season.id,
    name: season.name,
    start_date: season.start_date,
    end_date: season.end_date,
  }));

  return (
    <div className="space-y-4">
      <Link
        href="/sessions"
        className="text-xs text-slate-500 hover:text-slate-700"
      >
        ← {t("newSession.back")}
      </Link>

      <div>
        <h1 className="text-lg font-semibold text-slate-900">
          {t("newSession.title")}
        </h1>
        <p className="text-xs text-slate-500">
          {t("newSession.description")}
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {successMessage}
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-xs font-semibold text-slate-700">{t("newSession.infoTitle")}</div>
        <div className="mt-1 text-sm text-slate-600">
          {t("newSession.infoText")}
        </div>
      </div>

      <NewSessionForm
        action={createSessionAction}
        initialDate={todayIso}
        seasons={formSeasons}
        enableSessionTypes={sessionTypesEnabled}
      />
    </div>
  );
}