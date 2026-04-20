import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";
import { canManageClub } from "@/lib/auth/access";

type Season = {
  id: number;
  name: string;
  start_date: string | null;
  end_date: string | null;
  club_id: string;
};

type SeasonSettingsCardProps = {
  error?: string;
  message?: string;
  redirectTo?: string;
  createSubmitLabel?: string;
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

function formatDate(date: string | null) {
  if (!date) return "nicht gesetzt";
  return new Date(date).toLocaleDateString("de-DE");
}

function toDateInputValue(date: string | null) {
  if (!date) return "";
  return date.slice(0, 10);
}

function isCurrentSeason(startDate: string | null, endDate: string | null) {
  if (!startDate || !endDate) return false;

  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  return now >= start && now <= end;
}

export default async function SeasonSettingsCard({
  error = "",
  message = "",
  redirectTo = "/admin/settings",
  createSubmitLabel = "Anlegen",
}: SeasonSettingsCardProps) {
  const { clubId, membership, isPowerUser } = await requireClub();

  const hasAdminAccess = canManageClub({
    isPowerUser,
    role: membership.role,
  });

  if (!hasAdminAccess) {
    redirect("/admin");
  }

  const supabase = await createClient();

  const { data, error: queryError } = await supabase
    .from("seasons")
    .select("id, name, start_date, end_date, club_id")
    .eq("club_id", clubId)
    .order("start_date", { ascending: false });

  if (queryError) {
    throw new Error(queryError.message);
  }

  const seasons = (data ?? []) as Season[];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
        Trainings werden automatisch einer Saison zugeordnet, wenn ihr Datum
        zwischen <span className="font-semibold text-slate-900">Start</span>{" "}
        und <span className="font-semibold text-slate-900">Ende</span> dieser
        Saison liegt.
      </div>

      <form
        method="post"
        action="/api/admin/seasons"
        className="space-y-4 rounded-2xl border border-black/10 bg-neutral-50 p-4"
      >
        <input type="hidden" name="intent" value="create" />
        <input type="hidden" name="redirect_to" value={redirectTo} />

        <div className="text-sm font-semibold text-slate-800">
          Neue Saison
        </div>

        <div>
          <label
            htmlFor="season_create_name"
            className="mb-1.5 block text-sm font-medium text-slate-900"
          >
            Name
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
              required
            />
          </div>
        </div>

        <div className="text-xs text-slate-500">
          Beispiel: Start 01.07.2026, Ende 30.06.2027.
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-sm font-semibold text-slate-900">
            Serientraining für diese Saison
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Optional: Wähle 1 oder 2 Trainingstage. Dann werden direkt beim
            Anlegen der Saison alle passenden Trainings zwischen Saisonstart und
            Saisonende erzeugt.
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

          <div className="mt-3 text-xs text-slate-500">
            Beginn der Serie ist automatisch der Saisonstart, Ende der Serie
            automatisch das Saisonende. Doppelte Tage werden ignoriert.
          </div>
        </div>

        <button
          type="submit"
          className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {createSubmitLabel}
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

      <div className="space-y-3">
        <div className="text-sm font-semibold text-slate-800">
          Bestehende Saisons
        </div>

        {seasons.length === 0 ? (
          <div className="rounded-2xl border border-black/10 bg-white p-4 text-sm text-slate-500">
            Noch keine Saisons angelegt.
          </div>
        ) : (
          seasons.map((season) => {
            const current = isCurrentSeason(season.start_date, season.end_date);

            return (
              <div
                key={season.id}
                className="rounded-2xl border border-black/10 bg-white p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-slate-900">
                        {season.name}
                      </div>
                      {current ? (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          laufend
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Start: {formatDate(season.start_date)}
                    </div>
                    <div className="text-xs text-slate-500">
                      Ende: {formatDate(season.end_date)}
                    </div>
                  </div>

                  <form method="post" action="/api/admin/seasons">
                    <input type="hidden" name="intent" value="delete" />
                    <input
                      type="hidden"
                      name="season_id"
                      value={String(season.id)}
                    />
                    <input
                      type="hidden"
                      name="redirect_to"
                      value={redirectTo}
                    />
                    <button
                      type="submit"
                      className="text-sm font-medium text-red-600"
                    >
                      Löschen
                    </button>
                  </form>
                </div>

                <details className="group mt-4 rounded-2xl border border-black/10 bg-neutral-50">
                  <summary className="list-none cursor-pointer px-4 py-3 [&::-webkit-details-marker]:hidden">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-slate-800">
                        Saison bearbeiten
                      </div>
                      <div className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 transition group-open:rotate-180">
                        ⌄
                      </div>
                    </div>
                  </summary>

                  <div className="border-t border-black/10 px-4 py-4">
                    <form
                      method="post"
                      action="/api/admin/seasons"
                      className="space-y-4"
                    >
                      <input type="hidden" name="intent" value="update" />
                      <input
                        type="hidden"
                        name="season_id"
                        value={String(season.id)}
                      />
                      <input
                        type="hidden"
                        name="redirect_to"
                        value={redirectTo}
                      />

                      <div>
                        <label
                          htmlFor={`season_name_${season.id}`}
                          className="mb-1.5 block text-sm font-medium text-slate-900"
                        >
                          Name
                        </label>
                        <input
                          id={`season_name_${season.id}`}
                          name="name"
                          defaultValue={season.name}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none"
                          required
                        />
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label
                            htmlFor={`season_start_${season.id}`}
                            className="mb-1.5 block text-sm font-medium text-slate-900"
                          >
                            Startdatum
                          </label>
                          <input
                            id={`season_start_${season.id}`}
                            name="start_date"
                            type="date"
                            defaultValue={toDateInputValue(season.start_date)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none"
                            required
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`season_end_${season.id}`}
                            className="mb-1.5 block text-sm font-medium text-slate-900"
                          >
                            Enddatum
                          </label>
                          <input
                            id={`season_end_${season.id}`}
                            name="end_date"
                            type="date"
                            defaultValue={toDateInputValue(season.end_date)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none"
                            required
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        Änderungen speichern
                      </button>
                    </form>
                  </div>
                </details>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}