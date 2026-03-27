import Link from "next/link";
import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireFounder } from "@/lib/auth/founder";

type ProfileRow = {
  id: string;
  email?: string | null;
  full_name?: string | null;
  created_at?: string | null;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "–";
  return new Date(value).toLocaleString("de-DE");
}

export default async function FounderUsersPage() {
  await requireFounder();

  const supabase = await createClient();

  const profilesResult = await supabase
    .from("profiles")
    .select("id, email, full_name, created_at")
    .order("created_at", { ascending: false });

  const profiles = profilesResult.error
    ? []
    : ((profilesResult.data ?? []) as ProfileRow[]);

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link
            href="/founder"
            className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-900/20"
          >
            ← Zurück zum Founder Dashboard
          </Link>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <Users className="h-6 w-6" strokeWidth={2.1} />
            </div>

            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Founder / Users
              </div>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
                Alle User
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Liste aller aktuell verfügbaren User aus der Tabelle{" "}
                <span className="font-semibold">profiles</span>.
              </p>
            </div>
          </div>
        </div>

        {profilesResult.error ? (
          <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 shadow-sm">
            User konnten aktuell nicht geladen werden. Prüfe bitte, ob die
            Tabelle <span className="font-semibold">profiles</span> in deinem
            Projekt die richtige Quelle für registrierte User ist.
          </div>
        ) : null}

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          {profiles.length === 0 ? (
            <div className="text-sm text-slate-600">Keine User gefunden.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="px-3 py-3 font-medium">Name</th>
                    <th className="px-3 py-3 font-medium">E-Mail</th>
                    <th className="px-3 py-3 font-medium">Erstellt am</th>
                    <th className="px-3 py-3 font-medium">ID</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((profile) => (
                    <tr key={profile.id} className="border-b border-slate-100">
                      <td className="px-3 py-3 font-medium text-slate-950">
                        {profile.full_name?.trim() || "–"}
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        {profile.email?.trim() || "–"}
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        {formatDateTime(profile.created_at)}
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500">
                        {profile.id}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}