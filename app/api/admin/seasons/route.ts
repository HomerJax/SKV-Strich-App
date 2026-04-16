import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";
import { canManageClub } from "@/lib/auth/access";

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
  if (Number.isNaN(date.getTime())) return null;

  return date;
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
  weekdays: number[]
) {
  const start = parseIsoDate(startDateIso);
  const end = parseIsoDate(endDateIso);

  if (!start || !end) {
    return {
      error: "Bitte gültige Datumswerte wählen.",
      dates: [] as string[],
    };
  }

  if (start > end) {
    return {
      error: "Das Startdatum muss vor oder am Enddatum liegen.",
      dates: [] as string[],
    };
  }

  const weekdaySet = new Set(weekdays);

  if (weekdaySet.size === 0) {
    return {
      error: "",
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

function buildRedirectUrl(requestUrl: string, redirectTo: string) {
  return new URL(redirectTo || "/admin/seasons", requestUrl);
}

function withMessage(
  requestUrl: string,
  redirectTo: string,
  params: { message?: string; error?: string }
) {
  const url = buildRedirectUrl(requestUrl, redirectTo);

  if (params.message) {
    url.searchParams.set("message", params.message);
  }

  if (params.error) {
    url.searchParams.set("error", params.error);
  }

  return NextResponse.redirect(url, { status: 303 });
}

function buildCreateSuccessMessage(
  seasonName: string,
  createdSessionsCount: number,
  skippedSessionsCount: number
) {
  if (createdSessionsCount <= 0 && skippedSessionsCount <= 0) {
    return `Saison "${seasonName}" erfolgreich angelegt.`;
  }

  if (createdSessionsCount > 0 && skippedSessionsCount <= 0) {
    return `Saison "${seasonName}" erfolgreich angelegt. ${createdSessionsCount} Trainings wurden erstellt.`;
  }

  if (createdSessionsCount <= 0 && skippedSessionsCount > 0) {
    return `Saison "${seasonName}" erfolgreich angelegt. Alle passenden Trainings existierten bereits.`;
  }

  return `Saison "${seasonName}" erfolgreich angelegt. ${createdSessionsCount} Trainings wurden erstellt, ${skippedSessionsCount} bestehende Termine wurden übersprungen.`;
}

function revalidateSeasonRelatedPages() {
  revalidatePath("/admin/seasons");
  revalidatePath("/admin/settings");
  revalidatePath("/sessions");
  revalidatePath("/sessions/archive");
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const redirectTo = String(formData.get("redirect_to") ?? "/admin/seasons").trim();

  try {
    const { clubId, membership, isPowerUser } = await requireClub();

    const hasAdminAccess = canManageClub({
      isPowerUser,
      role: membership.role,
    });

    if (!hasAdminAccess) {
      return withMessage(request.url, redirectTo, {
        error: "Keine Berechtigung.",
      });
    }

    const supabase = await createClient();
    const intent = String(formData.get("intent") ?? "").trim();

    if (intent === "delete") {
      const seasonIdRaw = String(formData.get("season_id") ?? "").trim();
      const seasonId = Number(seasonIdRaw);

      if (!Number.isFinite(seasonId)) {
        return withMessage(request.url, redirectTo, {
          error: "Ungültige Saison.",
        });
      }

      const { error } = await supabase
        .from("seasons")
        .delete()
        .eq("club_id", clubId)
        .eq("id", seasonId);

      if (error) {
        return withMessage(request.url, redirectTo, {
          error: error.message || "Saison konnte nicht gelöscht werden.",
        });
      }

      revalidateSeasonRelatedPages();

      return withMessage(request.url, redirectTo, {
        message: "Saison erfolgreich gelöscht.",
      });
    }

    if (intent === "update") {
      const seasonIdRaw = String(formData.get("season_id") ?? "").trim();
      const seasonId = Number(seasonIdRaw);
      const name = String(formData.get("name") ?? "").trim();
      const startDate = String(formData.get("start_date") ?? "").trim();
      const endDate = String(formData.get("end_date") ?? "").trim();

      if (!Number.isFinite(seasonId)) {
        return withMessage(request.url, redirectTo, {
          error: "Ungültige Saison.",
        });
      }

      if (!name) {
        return withMessage(request.url, redirectTo, {
          error: "Bitte einen Namen eingeben.",
        });
      }

      const parsedStart = parseIsoDate(startDate);
      const parsedEnd = parseIsoDate(endDate);

      if (!parsedStart || !parsedEnd) {
        return withMessage(request.url, redirectTo, {
          error: "Bitte gültige Datumswerte wählen.",
        });
      }

      if (parsedStart > parsedEnd) {
        return withMessage(request.url, redirectTo, {
          error: "Das Startdatum muss vor oder am Enddatum liegen.",
        });
      }

      const { data: existingSeason, error: existingSeasonError } = await supabase
        .from("seasons")
        .select("id, name, start_date, end_date")
        .eq("club_id", clubId)
        .eq("id", seasonId)
        .maybeSingle<SeasonRow>();

      if (existingSeasonError || !existingSeason) {
        return withMessage(request.url, redirectTo, {
          error:
            existingSeasonError?.message || "Saison konnte nicht geladen werden.",
        });
      }

      const { error: updateError } = await supabase
        .from("seasons")
        .update({
          name,
          start_date: startDate,
          end_date: endDate,
        })
        .eq("club_id", clubId)
        .eq("id", seasonId);

      if (updateError) {
        return withMessage(request.url, redirectTo, {
          error: updateError.message || "Saison konnte nicht aktualisiert werden.",
        });
      }

      const { error: sessionUpdateError } = await supabase
        .from("sessions")
        .update({
          season_id: seasonId,
        })
        .eq("club_id", clubId)
        .gte("date", startDate)
        .lte("date", endDate)
        .or(`season_id.is.null,season_id.eq.${seasonId}`);

      if (sessionUpdateError) {
        return withMessage(request.url, redirectTo, {
          error:
            sessionUpdateError.message ||
            "Saison wurde aktualisiert, aber Sessions konnten nicht neu zugeordnet werden.",
        });
      }

      revalidateSeasonRelatedPages();

      return withMessage(request.url, redirectTo, {
        message: `Saison "${name}" erfolgreich aktualisiert.`,
      });
    }

    if (intent !== "create") {
      return withMessage(request.url, redirectTo, {
        error: "Unbekannte Aktion.",
      });
    }

    const name = String(formData.get("name") ?? "").trim();
    const startDate = String(formData.get("start_date") ?? "").trim();
    const endDate = String(formData.get("end_date") ?? "").trim();

    if (!name) {
      return withMessage(request.url, redirectTo, {
        error: "Bitte einen Namen eingeben.",
      });
    }

    const parsedStart = parseIsoDate(startDate);
    const parsedEnd = parseIsoDate(endDate);

    if (!parsedStart || !parsedEnd) {
      return withMessage(request.url, redirectTo, {
        error: "Bitte gültige Datumswerte wählen.",
      });
    }

    if (parsedStart > parsedEnd) {
      return withMessage(request.url, redirectTo, {
        error: "Das Startdatum muss vor oder am Enddatum liegen.",
      });
    }

    const weekdayOne = getWeekdayNumber(formData.get("weekday_one"));
    const weekdayTwo = getWeekdayNumber(formData.get("weekday_two"));
    const selectedWeekdays = Array.from(
      new Set(
        [weekdayOne, weekdayTwo].filter((value): value is number => value !== null)
      )
    );

    const { data: createdSeason, error: seasonInsertError } = await supabase
      .from("seasons")
      .insert({
        club_id: clubId,
        name,
        start_date: startDate,
        end_date: endDate,
      })
      .select("id, name, start_date, end_date")
      .single<SeasonRow>();

    if (seasonInsertError || !createdSeason) {
      return withMessage(request.url, redirectTo, {
        error: seasonInsertError?.message || "Saison konnte nicht erstellt werden.",
      });
    }

    if (selectedWeekdays.length === 0) {
      revalidateSeasonRelatedPages();

      return withMessage(request.url, redirectTo, {
        message: buildCreateSuccessMessage(createdSeason.name, 0, 0),
      });
    }

    const generated = getDatesForWeekdaysInRange(
      createdSeason.start_date ?? "",
      createdSeason.end_date ?? "",
      selectedWeekdays
    );

    if (generated.error) {
      return withMessage(request.url, redirectTo, {
        error: generated.error,
      });
    }

    if (generated.dates.length === 0) {
      revalidateSeasonRelatedPages();

      return withMessage(request.url, redirectTo, {
        message: buildCreateSuccessMessage(createdSeason.name, 0, 0),
      });
    }

    const existingDatesResult = await supabase
      .from("sessions")
      .select("date")
      .eq("club_id", clubId)
      .in("date", generated.dates);

    if (existingDatesResult.error) {
      return withMessage(request.url, redirectTo, {
        error:
          existingDatesResult.error.message ||
          "Bestehende Trainings konnten nicht geprüft werden.",
      });
    }

    const existingDates = new Set(
      (((existingDatesResult.data as { date: string }[] | null) ?? []).map(
        (row) => row.date
      ))
    );

    const datesToCreate = generated.dates.filter(
      (currentDate) => !existingDates.has(currentDate)
    );

    const skippedSessionsCount = generated.dates.length - datesToCreate.length;

    if (datesToCreate.length > 0) {
      const rowsToInsert = datesToCreate.map((date) => ({
        date,
        club_id: clubId,
        season_id: createdSeason.id,
        notes: null as string | null,
      }));

      const { error: sessionInsertError } = await supabase
        .from("sessions")
        .insert(rowsToInsert);

      if (sessionInsertError) {
        return withMessage(request.url, redirectTo, {
          error:
            sessionInsertError.message ||
            "Die Saison wurde erstellt, aber die Serientermine konnten nicht angelegt werden.",
        });
      }
    }

    revalidateSeasonRelatedPages();

    return withMessage(request.url, redirectTo, {
      message: buildCreateSuccessMessage(
        createdSeason.name,
        datesToCreate.length,
        skippedSessionsCount
      ),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Fehler beim Speichern.";

    return withMessage(request.url, redirectTo, {
      error: message,
    });
  }
}