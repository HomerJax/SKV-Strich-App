import Link from "next/link";
import { BarChart3, Users, Building2, MousePointerClick } from "lucide-react";
import { requirePowerUser } from "@/lib/auth/power-user";
import { createAdminClient } from "@/lib/supabase/admin";

type EventRow={created_at:string;user_id:string|null;club_id:string|null;event_name:string;path:string|null};
type ClubRow={id:string;display_name:string|null;name:string|null};
const LABELS:Record<string,string>={
 home_open:"Home",sessions_open:"Sessions",session_detail_open:"Session geöffnet",
 my_stats_open:"Meine Stats",standings_open:"Tabelle",player_pass_open:"Spielerpass",
 compare_open:"Vergleiche",mvp_open:"MVP",team_feed_open:"Kabinen-Talk",
 badge_open:"Badge geöffnet",team_cashbox_open:"Mannschaftskasse",
 beer_cashbox_open:"Bierkasse",event_roster_open:"Event-Kader",admin_open:"Admin",
 other_page_open:"Weitere Seiten"
};
function isoDate(d:Date){return d.toISOString().slice(0,10)}
function validDate(v?:string){return Boolean(v&&/^\d{4}-\d{2}-\d{2}$/.test(v))}
export default async function ProductAnalyticsPage({searchParams}:{searchParams:Promise<{from?:string;to?:string;club?:string}>}) {
 await requirePowerUser();
 const q=await searchParams;
 const today=new Date(); const defaultFrom=new Date(today.getTime()-29*86400000);
 const from=validDate(q.from)?q.from!:isoDate(defaultFrom);
 const to=validDate(q.to)?q.to!:isoDate(today);
 const startIso=from+"T00:00:00.000Z"; const end=new Date(to+"T00:00:00.000Z"); end.setUTCDate(end.getUTCDate()+1);
 const admin=createAdminClient();
 let query=admin.from("product_analytics_events").select("created_at,user_id,club_id,event_name,path").gte("created_at",startIso).lt("created_at",end.toISOString()).order("created_at",{ascending:false}).limit(50000);
 if(q.club) query=query.eq("club_id",q.club);
 const [{data:clubsData},{data:eventsData,error}]=await Promise.all([admin.from("clubs").select("id,display_name,name").order("display_name"),query]);
 if(error) throw new Error("Product Analytics konnten nicht geladen werden: "+error.message);
 const clubs=(clubsData??[]) as ClubRow[]; const events=(eventsData??[]) as EventRow[];
 const clubMap=new Map(clubs.map(c=>[c.id,c.display_name?.trim()||c.name?.trim()||"Ohne Namen"]));
 const stats=new Map<string,{clicks:number;users:Set<string>;clubs:Set<string>}>();
 for(const e of events){const s=stats.get(e.event_name)??{clicks:0,users:new Set<string>(),clubs:new Set<string>()};s.clicks++;if(e.user_id)s.users.add(e.user_id);if(e.club_id)s.clubs.add(e.club_id);stats.set(e.event_name,s)}
 const ranking=[...stats.entries()].sort((a,b)=>b[1].clicks-a[1].clicks);
 const users=new Set(events.map(e=>e.user_id).filter(Boolean)).size; const activeClubs=new Set(events.map(e=>e.club_id).filter(Boolean)).size;
 const params=(extra:Record<string,string|undefined>={})=>{const p=new URLSearchParams({from,to});const club=extra.club===undefined?q.club:extra.club;if(club)p.set("club",club);return p.toString()};
 return <main className="min-h-screen bg-slate-50 pb-24"><section className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6">
  <Link href="/power-user" className="w-fit rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold">← Power User</Link>
  <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
   <div className="text-xs font-bold uppercase tracking-[.18em] text-cyan-600">Power User · Product Analytics</div><h1 className="mt-2 text-3xl font-black tracking-tight">Nutzungsstatistik</h1><p className="mt-2 text-sm text-slate-600">Wie oft wurden Bereiche und Funktionen im gewählten Zeitraum tatsächlich geöffnet oder angeklickt?</p>
   <form className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_1.4fr_auto] sm:items-end">
    <label className="text-xs font-bold text-slate-600">Von<input name="from" type="date" defaultValue={from} className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"/></label>
    <label className="text-xs font-bold text-slate-600">Bis<input name="to" type="date" defaultValue={to} className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"/></label>
    <label className="text-xs font-bold text-slate-600">Verein<select name="club" defaultValue={q.club??""} className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="">Alle Vereine</option>{clubs.map(c=><option key={c.id} value={c.id}>{clubMap.get(c.id)}</option>)}</select></label>
    <button className="rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-black text-white">Anzeigen</button>
   </form>
   <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold"><Link href={"/power-user/product-analytics?"+new URLSearchParams({from:isoDate(new Date(today.getTime()-6*86400000)),to:isoDate(today),...(q.club?{club:q.club}:{})}).toString()} className="rounded-full bg-slate-100 px-3 py-1.5">Letzte 7 Tage</Link><Link href={"/power-user/product-analytics?"+new URLSearchParams({from:isoDate(defaultFrom),to:isoDate(today),...(q.club?{club:q.club}:{})}).toString()} className="rounded-full bg-slate-100 px-3 py-1.5">Letzte 30 Tage</Link><Link href={"/power-user/product-analytics?"+params({club:""})} className="rounded-full bg-slate-100 px-3 py-1.5">Alle Vereine</Link></div>
  </section>
  <div className="grid gap-3 sm:grid-cols-3"><Metric icon={<MousePointerClick className="h-5 w-5"/>} label="Aufrufe / Klicks" value={String(events.length)}/><Metric icon={<Users className="h-5 w-5"/>} label="Eindeutige Nutzer" value={String(users)}/><Metric icon={<Building2 className="h-5 w-5"/>} label="Aktive Vereine" value={String(activeClubs)}/></div>
  <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
   <div className="flex items-center gap-2 border-b border-slate-100 p-5"><BarChart3 className="h-5 w-5"/><div><h2 className="font-black">Nutzung nach Funktion</h2><p className="text-xs text-slate-500">{from} bis {to}{q.club?" · "+(clubMap.get(q.club)??"Verein"):" · alle Vereine"}</p></div></div>
   {ranking.length?<div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Bereich / Aktion</th><th className="px-5 py-3 text-right">Aufrufe / Klicks</th><th className="px-5 py-3 text-right">Eindeutige Nutzer</th><th className="px-5 py-3 text-right">Vereine</th></tr></thead><tbody className="divide-y divide-slate-100">{ranking.map(([name,s])=><tr key={name}><td className="px-5 py-3.5 font-bold text-slate-900">{LABELS[name]??name}</td><td className="px-5 py-3.5 text-right text-lg font-black">{s.clicks}</td><td className="px-5 py-3.5 text-right font-bold">{s.users.size}</td><td className="px-5 py-3.5 text-right font-bold">{s.clubs.size}</td></tr>)}</tbody></table></div>:<div className="p-8 text-center text-sm text-slate-500">Für diesen Zeitraum wurden noch keine Nutzungsdaten erfasst.</div>}
  </section>
  <p className="px-1 text-xs text-slate-400">Tracking wird erst seit dem 30.09.2026 erfasst. Frühere Zeiträume können deshalb keine Daten enthalten.</p>
 </section></main>
}
function Metric({icon,label,value}:{icon:React.ReactNode;label:string;value:string}){return <div className="rounded-[22px] border border-slate-200 bg-white p-4"><div className="flex items-center justify-between text-slate-500"><span className="text-xs font-bold uppercase tracking-wide">{label}</span>{icon}</div><div className="mt-2 text-3xl font-black">{value}</div></div>}
