import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";
import { getFeatureFlagsForClub } from "@/lib/feature-flags";
import NewSessionForm from "./NewSessionForm";

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

function normalizeSessionType(
  value: FormDataEntryValue | null,
  enabled: boolean
): SessionType {
  if (!enabled) return "training";
  return String(value ?? "").trim() === "event" ? "event" : "training";
}

function getSessionTypeLabel(type: SessionType) {
  return type === "event" ? "Termin" : "Training";
}

function formatSuccessMessage(count: number, type: SessionType) {
  const label = getSessionTypeLabel(type);

  if (count <= 1) {
    return `${label} erfolgreich erstellt.`;
  }

  return `${count} ${label}${count === 1 ? "" : "e"} erfolgreich erstellt.`;
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
      error: "Das Startdatum muss vor oder am Saisonende liegen.",
      dates: [] as string[],
    };
  }

  const weekdaySet = new Set(weekdays);
  if (weekdaySet.size === 0) {
    return {
      error: "Bitte mindestens einen Wochentag auswählen.",
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
  date: string
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
    throw new Error(`Saison konnte nicht geladen werden: ${error.message}`);
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
      seasonsError.message || "Saisons konnten nicht geladen werden."
    );
  }

  const seasons = ((seasonsData as SeasonRow[] | null) ?? []).filter(
    (season) => season.start_date && season.end_date
  );

  async function createSessionAction(formData: FormData) {
    "use server";

    const { clubId: actionClubId } = await requireClub();
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
          redirect("/sessions/new?error=Bitte%20Datum%20ausw%C3%A4hlen.");
        }

        const seasonId = await findSeasonIdForDate(
          actionSupabase,
          actionClubId,
          date
        );

        const { data: created, error: insertError } = await actionSupabase
          .from("sessions")
          .insert({
            date,
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
              insertError.message || "Fehler beim Speichern."
            )}`
          );
        }

        redirect(`/sessions/${created.id}`);
      }

      if (!Number.isFinite(selectedSeasonId)) {
        redirect("/sessions/new?error=Bitte%20eine%20Saison%20ausw%C3%A4hlen.");
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
            seasonError.message || "Saison konnte nicht geladen werden."
          )}`
        );
      }

      if (!season?.start_date || !season?.end_date) {
        redirect(
          "/sessions/new?error=Die%20gew%C3%A4hlte%20Saison%20hat%20keinen%20g%C3%BCltigen%20Zeitraum."
        );
      }

      if (!seriesStartDate) {
        redirect(
          "/sessions/new?error=Bitte%20ein%20Startdatum%20f%C3%BCr%20die%20Serie%20w%C3%A4hlen."
        );
      }

      const seasonStart = parseIsoDate(season.start_date);
      const seasonEnd = parseIsoDate(season.end_date);
      const seriesStart = parseIsoDate(seriesStartDate);

      if (!seasonStart || !seasonEnd || !seriesStart) {
        redirect(
          "/sessions/new?error=Die%20Datumswerte%20konnten%20nicht%20verarbeitet%20werden."
        );
      }

      if (seriesStart < seasonStart || seriesStart > seasonEnd) {
        redirect(
          "/sessions/new?error=Das%20Startdatum%20muss%20innerhalb%20der%20gew%C3%A4hlten%20Saison%20liegen."
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
        selectedWeekdays
      );

      if (generated.error) {
        redirect(`/sessions/new?error=${encodeURIComponent(generated.error)}`);
      }

      if (generated.dates.length === 0) {
        redirect(
          "/sessions/new?error=Im%20gew%C3%A4hlten%20Zeitraum%20wurden%20keine%20passenden%20Termine%20gefunden."
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
              "Bestehende Termine konnten nicht geprüft werden."
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
          "/sessions/new?error=F%C3%BCr%20alle%20gew%C3%A4hlten%20Tage%20existieren%20bereits%20solche%20Termine."
        );
      }

      const rowsToInsert = datesToCreate.map((currentDate) => ({
        date: currentDate,
        notes,
        season_id: season.id,
        club_id: actionClubId,
        type: sessionType,
      }));

      const { error: insertError } = await actionSupabase
        .from("sessions")
        .insert(rowsToInsert);

      if (insertError) {
        redirect(
          `/sessions/new?error=${encodeURIComponent(
            insertError.message || "Fehler beim Erstellen der Serientermine."
          )}`
        );
      }

      redirect(
        `/sessions?success=${encodeURIComponent(
          formatSuccessMessage(rowsToInsert.length, sessionType)
        )}`
      );
    } catch (error) {
      if (isNextRedirectError(error)) {
        throw error;
      }

      const message =
        error instanceof Error ? error.message : "Fehler beim Speichern.";

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
        ← Zurück zu Trainings
      </Link>

      <div>
        <h1 className="text-lg font-semibold text-slate-900">
          Neuer Termin
        </h1>
        <p className="text-xs text-slate-500">
          Trainings oder Termine anlegen. Ein Termin kann z. B. ein Spiel,
          Turnier oder Orga-Termin sein.
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
        <div className="text-xs font-semibold text-slate-700">Hinweis</div>
        <div className="mt-1 text-sm text-slate-600">
          Serientermine erzeugen mehrere ganz normale Einträge. Jede einzelne
          Session bleibt danach separat bearbeitbar. Bestehende Einträge am selben
          Datum und selben Typ werden beim Serienlauf automatisch übersprungen.
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