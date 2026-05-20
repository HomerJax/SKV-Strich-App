type ClubSetupSeasonStepProps = {
  error?: string;
  message?: string;
  redirectTo: string;
  submitLabel?: string;
};

const WEEKDAY_OPTIONS = [
  { value: "1", label: "Montag" },
  { value: "2", label: "Dienstag" },
  { value: "3", label: "Mittwoch" },
  { value: "4", label: "Donnerstag" },
  { value: "5", label: "Freitag" },
  { value: "6", label: "Samstag" },
  { value: "0", label: "Sonntag" },
];

export default function ClubSetupSeasonStep({
  error = "",
  message = "",
  redirectTo,
  submitLabel = "Weiter",
}: ClubSetupSeasonStepProps) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
        Trainings werden automatisch der Saison zugeordnet, wenn ihr Datum
        zwischen Start und Ende liegt.
      </div>

      <form
        method="post"
        action="/api/admin/seasons"
        className="space-y-4 rounded-2xl border border-black/10 bg-neutral-50 p-4"
      >
        <input type="hidden" name="intent" value="create" />
        <input type="hidden" name="redirect_to" value={redirectTo} />

        <div>
          <label
            htmlFor="season_create_name"
            className="mb-1.5 block text-sm font-medium text-slate-900"
          >
            Saisonname
          </label>
          <input
            id="season_create_name"
            name="name"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none"
            placeholder="z. B. Saison 2026/27"
            required
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="season_create_start_date"
              className="mb-1.5 block text-sm font-medium text-slate-900"
            >
              Startdatum
            </label>
            <input
              id="season_create_start_date"
              name="start_date"
              type="date"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none"
              required
            />
          </div>

          <div>
            <label
              htmlFor="season_create_end_date"
              className="mb-1.5 block text-sm font-medium text-slate-900"
            >
              Enddatum
            </label>
            <input
              id="season_create_end_date"
              name="end_date"
              type="date"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-sm font-semibold text-slate-900">
            Feste Trainingstage
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Optional: Wähle 1 oder 2 Tage. Dann werden passende Trainings direkt
            für die Saison angelegt.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="season_create_weekday_one"
                className="mb-1.5 block text-sm font-medium text-slate-900"
              >
                Trainingstag 1
              </label>
              <select
                id="season_create_weekday_one"
                name="weekday_one"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none"
                defaultValue=""
              >
                <option value="">Kein fester Tag</option>
                {WEEKDAY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="season_create_weekday_two"
                className="mb-1.5 block text-sm font-medium text-slate-900"
              >
                Trainingstag 2
              </label>
              <select
                id="season_create_weekday_two"
                name="weekday_two"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none"
                defaultValue=""
              >
                <option value="">Kein zweiter Tag</option>
                {WEEKDAY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {submitLabel}
        </button>

        {message ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </form>
    </div>
  );
}