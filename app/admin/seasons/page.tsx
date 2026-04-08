import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";
import { AUTH_ROUTES } from "@/lib/auth/routes";

type Season = {
  id: number;
  name: string;
  start_date: string | null;
  end_date: string | null;
  club_id: string;
};

type PageProps = {
  searchParams?: Promise<{
    error?: string;
    message?: string;
  }>;
};

function isAdminRole(role: string | null | undefined) {
  return role === "admin";
}

function formatDate(date: string | null) {
  if (!date) return "nicht gesetzt";
  return new Date(date).toLocaleDateString("de-DE");
}

export default async function SeasonsAdminPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const { clubId, membership } = await requireClub();

  if (!isAdminRole(membership.role)) {
    redirect(AUTH_ROUTES.dashboard);
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("seasons")
    .select("id, name, start_date, end_date, club_id")
    .eq("club_id", clubId)
    .order("start_date", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const seasons = (data ?? []) as Season[];
  const flashError = resolvedSearchParams?.error ?? "";
  const flashMessage = resolvedSearchParams?.message ?? "";

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto w-full max-w-4xl px-4 py-6">
        <div className="mb-4 flex items-center">
          <Link
            href="/admin"
            className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-900/20"
          >
            ← Zurück zum Adminbereich
          </Link>
        </div>

        <div className="rounded-[24px] border border-black/10 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">
            Saisons verwalten
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Lege fest, wie deine Saisons heißen und in welchem Zeitraum sie
            gelten.
          </p>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            Trainings werden automatisch einer Saison zugeordnet, wenn ihr Datum
            zwischen <span className="font-semibold text-slate-900">Start</span>{" "}
            und <span className="font-semibold text-slate-900">Ende</span> dieser
            Saison liegt.
          </div>

          <form
            method="post"
            action="/api/admin/seasons"
            className="mt-6 space-y-4 rounded-2xl border border-black/10 bg-neutral-50 p-4"
          >
            <input type="hidden" name="intent" value="create" />

            <div className="text-sm font-semibold text-slate-800">
              Neue Saison
            </div>

            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block text-sm font-medium text-slate-900"
              >
                Name
              </label>
              <input
                id="name"
                name="name"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none"
                placeholder="z. B. Saison 2026/27"
                required
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="start_date"
                  className="mb-1.5 block text-sm font-medium text-slate-900"
                >
                  Startdatum
                </label>
                <input
                  id="start_date"
                  name="start_date"
                  type="date"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="end_date"
                  className="mb-1.5 block text-sm font-medium text-slate-900"
                >
                  Enddatum
                </label>
                <input
                  id="end_date"
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

            <button
              type="submit"
              className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Anlegen
            </button>

            {flashMessage ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {flashMessage}
              </div>
            ) : null}

            {flashError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {flashError}
              </div>
            ) : null}
          </form>

          <div className="mt-6 rounded-2xl border border-black/10 bg-white p-4">
            <div className="mb-3 text-sm font-semibold text-slate-800">
              Bestehende Saisons
            </div>

            {seasons.length === 0 ? (
              <div className="text-sm text-slate-500">
                Noch keine Saisons angelegt.
              </div>
            ) : (
              <ul className="space-y-2">
                {seasons.map((season) => (
                  <li
                    key={season.id}
                    className="flex flex-col gap-3 rounded-xl border border-slate-200 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="font-medium text-slate-900">
                        {season.name}
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
                      <button
                        type="submit"
                        className="text-sm font-medium text-red-600"
                      >
                        Löschen
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}