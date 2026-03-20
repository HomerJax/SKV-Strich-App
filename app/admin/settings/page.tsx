import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type MembershipRow = {
  club_id: string;
  role: "admin" | "member";
};

type ClubSettingsRow = {
  club_id: string;
  use_strength: boolean | null;
  use_categories: boolean | null;
  season_start_day: number | null;
  season_start_month: number | null;
  season_end_day: number | null;
  season_end_month: number | null;
  season_year_mode: "start_year" | "end_year" | null;
};

type AdminSettingsPageProps = {
  searchParams?: Promise<{
    saved?: string;
    error?: string;
  }>;
};

const MONTHS = [
  { value: 1, label: "Januar" },
  { value: 2, label: "Februar" },
  { value: 3, label: "März" },
  { value: 4, label: "April" },
  { value: 5, label: "Mai" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Dezember" },
];

const DAYS = Array.from({ length: 31 }, (_, index) => index + 1);

function getErrorMessage(error?: string) {
  switch (error) {
    case "unauthorized":
      return "Du hast keinen Zugriff auf diesen Bereich.";
    case "missing_club":
      return "Es konnte kein Club gefunden werden.";
    case "save_failed":
      return "Die Saison-Einstellungen konnten nicht gespeichert werden.";
    case "invalid_season_start_day":
      return "Bitte wähle einen gültigen Start-Tag.";
    case "invalid_season_start_month":
      return "Bitte wähle einen gültigen Start-Monat.";
    case "invalid_season_end_day":
      return "Bitte wähle einen gültigen End-Tag.";
    case "invalid_season_end_month":
      return "Bitte wähle einen gültigen End-Monat.";
    case "invalid_season_year_mode":
      return "Bitte wähle eine gültige Benennung.";
    default:
      return "";
  }
}

function monthLabel(value: number) {
  return MONTHS.find((month) => month.value === value)?.label ?? "?";
}

function getSeasonPreview(
  seasonStartDay: number,
  seasonStartMonth: number,
  seasonEndDay: number,
  seasonEndMonth: number,
  seasonYearMode: "start_year" | "end_year"
) {
  const now = new Date();
  const currentYear = now.getFullYear();

  const nowMonthDay = (now.getMonth() + 1) * 100 + now.getDate();
  const startMonthDay = seasonStartMonth * 100 + seasonStartDay;
  const endMonthDay = seasonEndMonth * 100 + seasonEndDay;

  const crossesYear = startMonthDay > endMonthDay;

  let seasonStartYear = currentYear;

  if (crossesYear) {
    seasonStartYear =
      nowMonthDay >= startMonthDay ? currentYear : currentYear - 1;
  } else {
    seasonStartYear = currentYear;
  }

  const seasonEndYear = crossesYear ? seasonStartYear + 1 : seasonStartYear;

  const seasonName =
    seasonYearMode === "end_year"
      ? String(seasonEndYear)
      : String(seasonStartYear);

  return {
    seasonStartLabel: `${String(seasonStartDay).padStart(2, "0")}. ${monthLabel(
      seasonStartMonth
    )} ${seasonStartYear}`,
    seasonEndLabel: `${String(seasonEndDay).padStart(2, "0")}. ${monthLabel(
      seasonEndMonth
    )} ${seasonEndYear}`,
    seasonName,
    crossesYear,
  };
}

export default async function AdminSettingsPage({
  searchParams,
}: AdminSettingsPageProps) {
  const resolvedSearchParams = await searchParams;
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="min-h-screen bg-neutral-100">
        <section className="mx-auto w-full max-w-3xl px-4 py-6">
          <div className="rounded-[24px] border border-black/10 bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">
              Kein Zugriff
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Bitte logge dich zuerst ein.
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Zur Startseite
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const { data: membershipData } = await supabase
    .from("club_memberships")
    .select("club_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const membership = (membershipData as MembershipRow | null) ?? null;

  if (!membership || membership.role !== "admin") {
    return (
      <main className="min-h-screen bg-neutral-100">
        <section className="mx-auto w-full max-w-3xl px-4 py-6">
          <div className="rounded-[24px] border border-black/10 bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">
              Kein Zugriff
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Dieser Bereich ist nur für Admins verfügbar.
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Zur Startseite
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const { data: settingsData } = await supabase
    .from("club_settings")
    .select(
      "club_id, use_strength, use_categories, season_start_day, season_start_month, season_end_day, season_end_month, season_year_mode"
    )
    .eq("club_id", membership.club_id)
    .maybeSingle();

  const settings = (settingsData as ClubSettingsRow | null) ?? null;

  const useStrength = settings?.use_strength ?? false;
  const useCategories = settings?.use_categories ?? false;
  const seasonStartDay = settings?.season_start_day ?? 1;
  const seasonStartMonth = settings?.season_start_month ?? 1;
  const seasonEndDay = settings?.season_end_day ?? 31;
  const seasonEndMonth = settings?.season_end_month ?? 12;
  const seasonYearMode = settings?.season_year_mode ?? "end_year";

  const preview = getSeasonPreview(
    seasonStartDay,
    seasonStartMonth,
    seasonEndDay,
    seasonEndMonth,
    seasonYearMode
  );

  const errorMessage = getErrorMessage(resolvedSearchParams?.error);
  const saved = resolvedSearchParams?.saved === "1";

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6 sm:px-5">
        <div className="flex items-center">
          <Link
            href="/admin"
            className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-900/20"
          >
            ← Zurück zum Adminbereich
          </Link>
        </div>

        <div className="rounded-[24px] border border-black/10 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-5">
            <div className="text-sm font-semibold text-slate-500">Admin</div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
              Neue Saison erstellen
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Hier definierst du Saison-Zeitraum, Benennung und wichtige
              Einstellungen für den Teamgenerator.
            </p>
          </div>

          {errorMessage ? (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {errorMessage}
            </div>
          ) : null}

          {saved ? (
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Saison-Einstellungen gespeichert.
            </div>
          ) : null}

          <form method="post" action="/api/admin/settings" className="space-y-6">
            <div className="rounded-[20px] border border-black/10 bg-neutral-50 p-4 sm:p-5">
              <div className="mb-3 text-sm font-semibold text-slate-500">
                Teamgenerator
              </div>

              <div className="space-y-3">
                <label className="flex items-start gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3">
                  <input
                    type="checkbox"
                    name="use_strength"
                    value="1"
                    defaultChecked={useStrength}
                    className="mt-1 h-4 w-4 rounded border-neutral-300"
                  />
                  <div>
                    <div className="text-sm font-semibold text-slate-950">
                      Stärke berücksichtigen
                    </div>
                    <div className="text-sm text-slate-600">
                      Der Teamgenerator bezieht die Spielerstärke in die
                      Verteilung ein.
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3">
                  <input
                    type="checkbox"
                    name="use_categories"
                    value="1"
                    defaultChecked={useCategories}
                    className="mt-1 h-4 w-4 rounded border-neutral-300"
                  />
                  <div>
                    <div className="text-sm font-semibold text-slate-950">
                      Kategorien berücksichtigen
                    </div>
                    <div className="text-sm text-slate-600">
                      Der Teamgenerator nutzt eure Club-Kategorien bei der
                      Aufteilung.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="rounded-[20px] border border-black/10 bg-neutral-50 p-4 sm:p-5">
              <div className="mb-1 text-sm font-semibold text-slate-500">
                Saison-Zeitraum
              </div>
              <p className="mb-4 text-sm text-slate-600">
                Lege fest, wann eure Saison beginnt und endet. Die Benennung
                kann wahlweise nach Startjahr oder Endjahr erfolgen.
              </p>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-black/10 bg-white p-4">
                  <div className="mb-3 text-sm font-semibold text-slate-950">
                    Saisonbeginn
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label
                        htmlFor="season_start_day"
                        className="block text-sm font-medium text-slate-900"
                      >
                        Tag
                      </label>
                      <select
                        id="season_start_day"
                        name="season_start_day"
                        defaultValue={String(seasonStartDay)}
                        className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition focus:border-slate-900"
                      >
                        {DAYS.map((day) => (
                          <option key={day} value={String(day)}>
                            {day}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="season_start_month"
                        className="block text-sm font-medium text-slate-900"
                      >
                        Monat
                      </label>
                      <select
                        id="season_start_month"
                        name="season_start_month"
                        defaultValue={String(seasonStartMonth)}
                        className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition focus:border-slate-900"
                      >
                        {MONTHS.map((month) => (
                          <option key={month.value} value={String(month.value)}>
                            {month.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-black/10 bg-white p-4">
                  <div className="mb-3 text-sm font-semibold text-slate-950">
                    Saisonende
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label
                        htmlFor="season_end_day"
                        className="block text-sm font-medium text-slate-900"
                      >
                        Tag
                      </label>
                      <select
                        id="season_end_day"
                        name="season_end_day"
                        defaultValue={String(seasonEndDay)}
                        className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition focus:border-slate-900"
                      >
                        {DAYS.map((day) => (
                          <option key={day} value={String(day)}>
                            {day}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="season_end_month"
                        className="block text-sm font-medium text-slate-900"
                      >
                        Monat
                      </label>
                      <select
                        id="season_end_month"
                        name="season_end_month"
                        defaultValue={String(seasonEndMonth)}
                        className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition focus:border-slate-900"
                      >
                        {MONTHS.map((month) => (
                          <option key={month.value} value={String(month.value)}>
                            {month.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-black/10 bg-white p-4">
                <label
                  htmlFor="season_year_mode"
                  className="block text-sm font-medium text-slate-900"
                >
                  Saison benennen
                </label>
                <p className="mt-1 text-sm text-slate-600">
                  Beispiel: Eine Saison von Dezember bis Dezember kann nach
                  Beginn oder Ende benannt werden.
                </p>
                <select
                  id="season_year_mode"
                  name="season_year_mode"
                  defaultValue={seasonYearMode}
                  className="mt-3 w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition focus:border-slate-900"
                >
                  <option value="start_year">Nach Startjahr</option>
                  <option value="end_year">Nach Endjahr</option>
                </select>
              </div>

              <div className="mt-4 rounded-2xl border border-black/10 bg-white p-4">
                <div className="text-sm font-semibold text-slate-950">
                  Vorschau der aktuellen Einstellung
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-neutral-50 p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Beginn
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-950">
                      {preview.seasonStartLabel}
                    </div>
                  </div>

                  <div className="rounded-xl bg-neutral-50 p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Ende
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-950">
                      {preview.seasonEndLabel}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-950 p-3 text-white">
                    <div className="text-xs font-semibold uppercase tracking-wide text-white/70">
                      Anzeigename
                    </div>
                    <div className="mt-1 text-lg font-bold">
                      {preview.seasonName}
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-sm text-slate-600">
                  {preview.crossesYear
                    ? "Diese Saison überschreitet einen Jahreswechsel."
                    : "Diese Saison liegt innerhalb eines Kalenderjahres."}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Neue Saison speichern
              </button>

              <Link
                href="/admin"
                className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-900/20"
              >
                Zurück
              </Link>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}