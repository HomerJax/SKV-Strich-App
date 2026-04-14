import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";

type NewSessionPageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

type SeasonRow = {
  id: number;
  start_date: string | null;
  end_date: string | null;
};

type CreateMode = "single" | "series";

const WEEKDAY_OPTIONS = [
  { value: "1", label: "Montag" },
  { value: "2", label: "Dienstag" },
  { value: "3", label: "Mittwoch" },
  { value: "4", label: "Donnerstag" },
  { value: "5", label: "Freitag" },
  { value: "6", label: "Samstag" },
  { value: "0", label: "Sonntag" },
] as const;

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

function formatSuccessMessage(count: number) {
  if (count <= 1) {
    return "Training erfolgreich erstellt.";
  }

  return `${count} Trainings erfolgreich erstellt.`;
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
    return { error: "Bitte gültige Start- und Enddaten wählen.", dates: [] as string[] };
  }

  if (start > end) {
    return { error: "Das Enddatum muss am oder nach dem Startdatum liegen.", dates: [] as string[] };
  }

  const weekdaySet = new Set(weekdays);
  if (weekdaySet.size === 0) {
    return { error: "Bitte mindestens einen Wochentag auswählen.", dates: [] as string[] };
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
    .maybeSingle<SeasonRow>();

  if (error) {
    throw new Error(`Saison konnte nicht geladen werden: ${error.message}`);
  }

  return season?.id ?? null;
}

export default async function NewSessionPage({
  searchParams,
}: NewSessionPageProps) {
  await requireClub();
  const resolvedSearchParams = await searchParams;

  const todayIso = getTodayIsoDate();
  const initialStartDate = todayIso;
  const initialEndDate = todayIso;
  const errorMessage = resolvedSearchParams?.error ?? "";
  const successMessage = resolvedSearchParams?.success ?? "";

  async function createSessionAction(formData: FormData) {
    "use server";

    const { clubId } = await requireClub();
    const supabase = await createClient();

    const modeRaw = String(formData.get("mode") ?? "single").trim();
    const mode: CreateMode = modeRaw === "series" ? "series" : "single";

    const date = String(formData.get("date") ?? "").trim();
    const notesRaw = String(formData.get("notes") ?? "").trim();
    const notes = notesRaw === "" ? null : notesRaw;

    const seriesStartDate = String(formData.get("series_start_date") ?? "").trim();
    const seriesEndDate = String(formData.get("series_end_date") ?? "").trim();
    const weekdayOne = getWeekdayNumber(formData.get("weekday_one"));
    const weekdayTwo = getWeekdayNumber(formData.get("weekday_two"));

    try {
      if (mode === "single") {
        if (!date) {
          redirect("/sessions/new?error=Bitte%20Datum%20ausw%C3%A4hlen.");
        }

        const seasonId = await findSeasonIdForDate(supabase, clubId, date);

        const { data: created, error: insertError } = await supabase
          .from("sessions")
          .insert({
            date,
            notes,
            season_id: seasonId,
            club_id: clubId,
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

      const selectedWeekdays = Array.from(
        new Set([weekdayOne, weekdayTwo].filter((value): value is number => value !== null))
      );

      const generated = getDatesForWeekdaysInRange(
        seriesStartDate,
        seriesEndDate,
        selectedWeekdays
      );

      if (generated.error) {
        redirect(`/sessions/new?error=${encodeURIComponent(generated.error)}`);
      }

      if (generated.dates.length === 0) {
        redirect(
          "/sessions/new?error=Im%20gew%C3%A4hlten%20Zeitraum%20wurden%20keine%20passenden%20Trainingstage%20gefunden."
        );
      }

      const existingDatesResult = await supabase
        .from("sessions")
        .select("date")
        .eq("club_id", clubId)
        .in("date", generated.dates);

      if (existingDatesResult.error) {
        redirect(
          `/sessions/new?error=${encodeURIComponent(
            existingDatesResult.error.message || "Bestehende Trainings konnten nicht geprüft werden."
          )}`
        );
      }

      const existingDates = new Set(
        ((existingDatesResult.data as { date: string }[] | null) ?? []).map((row) => row.date)
      );

      const datesToCreate = generated.dates.filter((entry) => !existingDates.has(entry));

      if (datesToCreate.length === 0) {
        redirect(
          "/sessions/new?error=F%C3%BCr%20alle%20gew%C3%A4hlten%20Tage%20existieren%20bereits%20Trainings."
        );
      }

      const rowsToInsert: {
        date: string;
        notes: string | null;
        season_id: number | null;
        club_id: string;
      }[] = [];

      for (const currentDate of datesToCreate) {
        const seasonId = await findSeasonIdForDate(supabase, clubId, currentDate);

        rowsToInsert.push({
          date: currentDate,
          notes,
          season_id: seasonId,
          club_id: clubId,
        });
      }

      const { error: insertError } = await supabase
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
        `/sessions?success=${encodeURIComponent(formatSuccessMessage(rowsToInsert.length))}`
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Fehler beim Speichern.";
      redirect(`/sessions/new?error=${encodeURIComponent(message)}`);
    }
  }

  return (
    <div className="space-y-4">
      <Link
        href="/sessions"
        className="text-xs text-slate-500 hover:text-slate-700"
      >
        ← Zurück zu Trainings
      </Link>

      <div>
        <h1 className="text-lg font-semibold text-slate-900">Neues Training</h1>
        <p className="text-xs text-slate-500">
          Einzeltermin oder Serientermin anlegen. Saison wird automatisch über das
          jeweilige Datum erkannt.
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
          Serientermine erzeugen mehrere ganz normale Trainings. Jede einzelne
          Session bleibt danach separat bearbeitbar. Bestehende Trainings am selben
          Datum werden beim Serienlauf automatisch übersprungen.
        </div>
      </div>

      <form
        action={createSessionAction}
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-4"
      >
        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold text-slate-700">
            Modus
          </legend>

          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
            <input type="radio" name="mode" value="single" defaultChecked />
            Einzeltermin
          </label>

          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
            <input type="radio" name="mode" value="series" />
            Serientermin
          </label>
        </fieldset>

        <div className="rounded-xl border border-slate-200 p-4">
          <div className="mb-3 text-sm font-semibold text-slate-900">
            Einzeltermin
          </div>

          <label className="block">
            <div className="mb-1 text-xs font-semibold text-slate-700">Datum</div>
            <input
              name="date"
              type="date"
              defaultValue={todayIso}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <div className="mb-3 text-sm font-semibold text-slate-900">
            Serientermin
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <div className="mb-1 text-xs font-semibold text-slate-700">
                Startdatum
              </div>
              <input
                name="series_start_date"
                type="date"
                defaultValue={initialStartDate}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </label>

            <label className="block">
              <div className="mb-1 text-xs font-semibold text-slate-700">
                Enddatum
              </div>
              <input
                name="series_end_date"
                type="date"
                defaultValue={initialEndDate}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <div className="mb-1 text-xs font-semibold text-slate-700">
                Wochentag 1
              </div>
              <select
                name="weekday_one"
                defaultValue="4"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {WEEKDAY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <div className="mb-1 text-xs font-semibold text-slate-700">
                Wochentag 2 (optional)
              </div>
              <select
                name="weekday_two"
                defaultValue=""
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Kein zweiter Tag</option>
                {WEEKDAY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3 text-xs text-slate-500">
            Beispiel: Dienstag und Donnerstag im Saisonzeitraum. Bereits vorhandene
            Trainings am gleichen Datum werden nicht doppelt angelegt.
          </div>
        </div>

        <label className="block">
          <div className="mb-1 text-xs font-semibold text-slate-700">Notiz</div>
          <input
            name="notes"
            placeholder="optional, z. B. Flutlicht oder Hallentraining"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </label>

        <button
          type="submit"
          className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          Training anlegen
        </button>
      </form>
    </div>
  );
}