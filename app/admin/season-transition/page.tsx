import Link from "next/link";
import { redirect } from "next/navigation";
import { requireClub } from "@/lib/auth/guards";
import { canManageClub } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { getClubBillingAccess } from "@/lib/billing/club-billing";

export const dynamic = "force-dynamic";

type Season = { id:number; name:string; start_date:string|null; end_date:string|null };
type Session = { date:string; start_time:string|null; type:string|null };
const weekdayNames = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
function addDay(iso:string,days:number) {
  const d = new Date(iso+"T12:00:00Z"); d.setUTCDate(d.getUTCDate()+days); return d.toISOString().slice(0,10);
}
function dateWeekday(iso:string) {return new Date(iso+"T12:00:00Z").getUTCDay();}
export default async function SeasonTransitionPage({searchParams}:{searchParams?:Promise<{message?:string;error?:string}>}) {
  const { clubId, membership, isPowerUser } = await requireClub();
  if (!canManageClub({isPowerUser,role:membership.role})) redirect("/home");
  const supabase = await createClient();
  const billing = await getClubBillingAccess(supabase,clubId);
  const parts = new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Berlin",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const datePart = Object.fromEntries(parts.map(part => [part.type,part.value]));
  const today = [datePart.year,datePart.month,datePart.day].join("-");
  const [{data:seasonRows},{data:recentSessions}] = await Promise.all([
    supabase.from("seasons").select("id,name,start_date,end_date").eq("club_id",clubId).order("start_date",{ascending:false}),
    supabase.from("sessions").select("date,start_time,type").eq("club_id",clubId).eq("type","training").lte("date",today).order("date",{ascending:false}).limit(12),
  ]);
  const seasons = (seasonRows ?? []) as Season[];
  const current = seasons.find(s=>s.start_date && s.end_date && s.start_date <= today && s.end_date >= today) ?? null;
  const future = seasons.filter(s=>s.start_date && s.start_date > today);
  const days = ((recentSessions ?? []) as Session[]).map(s=>dateWeekday(s.date));
  const popular = [0,1,2,3,4,5,6].map(day=>({day,count:days.filter(d=>d===day).length})).sort((a,b)=>b.count-a.count);
  const primaryDay = popular[0]?.count ? popular[0].day : 4;
  const defaultStart = current?.end_date ? addDay(current.end_date,1) : addDay(today,1);
  const defaultEnd = addDay(defaultStart,364);
  const params = await searchParams;
  return <main className="min-h-screen bg-slate-50 px-4 py-7 text-slate-950">
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/home" className="text-sm font-bold text-slate-600">← Zurück zu Home</Link>
      <div className="rounded-[26px] bg-gradient-to-br from-slate-950 via-[#172558] to-[#30236b] p-6 text-white">
        <div className="text-[11px] font-black uppercase tracking-[.2em] text-violet-200">SAISONWECHSEL · ADMIN</div>
        <h1 className="mt-2 text-2xl font-black tracking-tight">Saisonabschluss & nächste Saison</h1>
        <p className="mt-2 text-sm text-white/70">Jetzt planen. Die laufende Saison bleibt bis zu ihrem Enddatum unverändert.</p>
      </div>
      {params?.message && <div className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{params.message}</div>}
      {params?.error && <div className="rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-800">{params.error}</div>}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-black">1. Saisonabschluss vorbereiten</h2>
        <p className="mt-1 text-sm text-slate-600">{current ? current.name+" · endet am "+new Date(current.end_date+"T12:00:00Z").toLocaleDateString("de-DE") : "Zurzeit keine laufende Saison erkannt."}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/standings" className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold">Tabelle prüfen</Link>
          <Link href="/sessions" className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold">Offene Ergebnisse prüfen</Link>
          <Link href="/sessions/archive" className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold">Saisonarchiv</Link>
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-black">2. Nächste Saison vorbereiten</h2>
        {future.length > 0 && <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">
          <strong>Bereits geplant:</strong> {future.map(s=>s.name+" ("+s.start_date+" – "+(s.end_date??"offen")+")").join(", ")}. Weitere Saisons kannst du unter <Link className="underline" href="/admin/seasons">Saisonverwaltung</Link> bearbeiten.
        </div>}
        {billing.isPro ? (
          <form action="/api/admin/seasons" method="post" className="mt-4 space-y-3">
            <input type="hidden" name="intent" value="create"/>
            <input type="hidden" name="redirect_to" value="/admin/season-transition"/>
            <label className="block text-sm font-bold">Saisonname
              <input name="name" required maxLength={100} defaultValue={"Saison "+new Date(defaultStart+"T12:00:00Z").getUTCFullYear()} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base"/>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs font-bold">Startdatum
                <input type="date" name="start_date" required min={defaultStart} defaultValue={defaultStart} className="mt-1 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-2 py-3 text-sm"/>
              </label>
              <label className="block text-xs font-bold">Enddatum
                <input type="date" name="end_date" required defaultValue={defaultEnd} className="mt-1 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-2 py-3 text-sm"/>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {["weekday_one","weekday_two"].map((name,index)=><label key={name} className="block text-xs font-bold">{index ? "Zweiter Trainingstag (optional)" : "Trainingstag"}
                <select name={name} defaultValue={index ? "" : String(primaryDay)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-3 text-sm">
                  <option value="">Keiner</option>
                  {weekdayNames.map((day,i)=><option key={day} value={i}>{day}</option>)}
                </select>
              </label>)}
            </div>
            <p className="text-xs leading-5 text-slate-500">Trainingstage sind vorbelegt, können aber geändert werden. Neue Termine werden nur für den künftigen Saisonzeitraum erstellt.</p>
            <button type="submit" className="w-full rounded-2xl bg-slate-950 px-4 py-3.5 text-sm font-black text-white">Neue Saison planen</button>
          </form>
        ) : <p className="mt-3 text-sm text-slate-600">Eine individuelle Saisonplanung ist mit PRO verfügbar. In Free läuft die strikr Standardsaison weiter.</p>}
      </section>
    </div>
  </main>;
}
