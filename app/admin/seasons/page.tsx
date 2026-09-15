import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { canManageClub } from "@/lib/auth/access";

type Season = { id: number; name: string; start_date: string | null; end_date: string | null; club_id: string };
type SessionSummary = { season_id: number | null; date: string; start_time: string | null; type: string | null };
type PageProps = { searchParams?: Promise<{ error?: string; message?: string }> };

const WEEKDAY_OPTIONS = [
  { value: "1", label: "Montag" }, { value: "2", label: "Dienstag" }, { value: "3", label: "Mittwoch" },
  { value: "4", label: "Donnerstag" }, { value: "5", label: "Freitag" }, { value: "6", label: "Samstag" }, { value: "0", label: "Sonntag" },
];
function formatDate(date: string | null) { if (!date) return "nicht gesetzt"; return new Date(`${date}T12:00:00`).toLocaleDateString("de-DE"); }
function todayIso() { const d = new Date(); const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,"0"); const day = String(d.getDate()).padStart(2,"0"); return `${y}-${m}-${day}`; }

export default async function SeasonsAdminPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const { clubId, membership, isPowerUser } = await requireClub();
  if (!canManageClub({ isPowerUser, role: membership.role })) redirect(AUTH_ROUTES.dashboard);
  const supabase = await createClient();
  const { data, error } = await supabase.from("seasons").select("id, name, start_date, end_date, club_id").eq("club_id", clubId).order("start_date", { ascending: false });
  if (error) throw new Error(error.message);
  const seasons = (data ?? []) as Season[];
  const { data: sessionData } = await supabase.from("sessions").select("season_id, date, start_time, type").eq("club_id", clubId).eq("type", "training").gte("date", todayIso()).order("date", { ascending: true });
  const sessions = (sessionData ?? []) as SessionSummary[];
  const flashError = resolvedSearchParams?.error ?? ""; const flashMessage = resolvedSearchParams?.message ?? "";

  return <main className="min-h-screen bg-neutral-100"><section className="mx-auto w-full max-w-4xl px-4 py-6">
    <div className="mb-4"><Link href="/admin" className="inline-flex rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900">← Zurück zum Adminbereich</Link></div>
    <div className="rounded-[24px] border border-black/10 bg-white p-5 shadow-sm">
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">Saisons & Trainingsserien</h1>
      <p className="mt-2 text-sm text-slate-600">Saisons anlegen und wiederkehrende Trainings zentral verwalten.</p>
      {isPowerUser ? <div className="mt-4 inline-flex rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-900">Power User Modus: Du prüfst diesen Verein ohne echte Mitgliedschaft.</div> : null}
      {flashMessage ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{flashMessage}</div> : null}
      {flashError ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{flashError}</div> : null}

      <div className="mt-6 rounded-2xl border border-black/10 bg-neutral-50 p-4">
        <div className="text-sm font-semibold text-slate-900">Trainingsserien verwalten</div>
        <p className="mt-1 text-sm text-slate-600">Hier kannst du z. B. eine falsch angelegte Uhrzeit mit einem Schritt für alle zukünftigen Trainings einer Saison korrigieren. Vergangene Trainings bleiben unverändert.</p>
        <div className="mt-4 space-y-3">
          {seasons.map((season) => {
            const future = sessions.filter((s) => s.season_id === season.id);
            const times = Array.from(new Set(future.map((s) => s.start_time).filter(Boolean))) as string[];
            return <div key={`series-${season.id}`} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="font-semibold text-slate-900">{season.name}</div>
              <div className="mt-1 text-xs text-slate-500">{future.length} zukünftige Trainings · aktuelle Zeit{times.length === 1 ? `: ${times[0]} Uhr` : times.length > 1 ? `en: ${times.join(", ")} Uhr` : ": nicht gesetzt"}</div>
              {future.length > 0 ? <form method="post" action="/api/admin/seasons" className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <input type="hidden" name="intent" value="update-training-time"/><input type="hidden" name="redirect_to" value="/admin/seasons"/><input type="hidden" name="season_id" value={String(season.id)}/>
                <label className="text-sm font-medium text-slate-900">Neue Startzeit<input name="start_time" type="time" defaultValue={times.length === 1 ? times[0] : ""} required className="mt-1.5 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"/></label>
                <label className="text-sm font-medium text-slate-900">Ändern ab<input name="from_date" type="date" defaultValue={todayIso()} min={todayIso()} required className="mt-1.5 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"/></label>
                <button type="submit" className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">Zukünftige ändern</button>
              </form> : <div className="mt-3 text-sm text-slate-500">Keine zukünftigen Trainings in dieser Saison.</div>}
            </div>;
          })}
        </div>
      </div>

      <form method="post" action="/api/admin/seasons" className="mt-6 space-y-4 rounded-2xl border border-black/10 bg-neutral-50 p-4">
        <input type="hidden" name="intent" value="create"/><input type="hidden" name="redirect_to" value="/admin/seasons"/>
        <div className="text-sm font-semibold text-slate-800">Neue Saison</div>
        <label className="block text-sm font-medium text-slate-900">Name<input name="name" className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm" placeholder="z. B. Saison 2026/27" required/></label>
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium text-slate-900">Startdatum<input name="start_date" type="date" className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm" required/></label><label className="text-sm font-medium text-slate-900">Enddatum<input name="end_date" type="date" className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm" required/></label></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="text-sm font-semibold text-slate-900">Serientraining für diese Saison</div><p className="mt-1 text-sm text-slate-600">Optional 1 oder 2 feste Trainingstage wählen.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">{["weekday_one","weekday_two"].map((name,i)=><label key={name} className="text-sm font-medium text-slate-900">Trainingstag {i+1}<select name={name} defaultValue="" className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="">{i ? "Kein zweiter Tag" : "Kein fester Tag"}</option>{WEEKDAY_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>)}</div>
        </div>
        <button type="submit" className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">Anlegen</button>
      </form>

      <div className="mt-6 rounded-2xl border border-black/10 bg-white p-4"><div className="mb-3 text-sm font-semibold text-slate-800">Bestehende Saisons</div>
        {seasons.length===0 ? <div className="text-sm text-slate-500">Noch keine Saisons angelegt.</div> : <ul className="space-y-2">{seasons.map(season=><li key={season.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-medium text-slate-900">{season.name}</div><div className="mt-1 text-xs text-slate-500">{formatDate(season.start_date)} – {formatDate(season.end_date)}</div></div><form method="post" action="/api/admin/seasons"><input type="hidden" name="intent" value="delete"/><input type="hidden" name="redirect_to" value="/admin/seasons"/><input type="hidden" name="season_id" value={String(season.id)}/><button type="submit" className="text-sm font-medium text-red-600">Löschen</button></form></li>)}</ul>}
      </div>
    </div>
  </section></main>;
}
