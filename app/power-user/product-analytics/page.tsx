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

export default async function ProductAnalyticsPage({searchParams}:{searchParams:Promise<{range?:string;club?:string}>}) {
 await requirePowerUser();
 const q=await searchParams;
 const days=q.range==="7d"?7:30;
 const since=new Date(Date.now()-days*86400000).toISOString();
 const admin=createAdminClient();
 const [{data:clubsData},{data:eventsData,error}]=await Promise.all([
   admin.from("clubs").select("id,display_name,name").order("display_name"),
   admin.from("product_analytics_events").select("created_at,user_id,club_id,event_name,path").gte("created_at",since).order("created_at",{ascending:false}).limit(10000)
 ]);
 if(error) throw new Error("Product Analytics konnten nicht geladen werden: "+error.message);
 const clubs=(clubsData??[]) as ClubRow[];
 const all=(eventsData??[]) as EventRow[];
 const events=q.club?all.filter(e=>e.club_id===q.club):all;
 const clubMap=new Map(clubs.map(c=>[c.id,c.display_name?.trim()||c.name?.trim()||"Ohne Namen"]));
 const counts=new Map<string,number>();
 events.forEach(e=>counts.set(e.event_name,(counts.get(e.event_name)??0)+1));
 const ranking=[...counts.entries()].sort((a,b)=>b[1]-a[1]);
 const users=new Set(events.map(e=>e.user_id).filter(Boolean)).size;
 const activeClubs=new Set(events.map(e=>e.club_id).filter(Boolean)).size;
 const dayCounts=new Map<string,number>();
 events.forEach(e=>{const d=e.created_at.slice(0,10);dayCounts.set(d,(dayCounts.get(d)??0)+1)});
 const daysList=Array.from({length:days},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(days-1-i));return d.toISOString().slice(0,10)});
 const maxDay=Math.max(1,...daysList.map(d=>dayCounts.get(d)??0));

 return <main className="min-h-screen bg-slate-50 pb-24"><section className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6">
   <div className="flex items-center justify-between gap-3"><Link href="/power-user" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold">← Power User</Link><div className="flex gap-2"><Link href="/power-user/product-analytics?range=7d" className={"rounded-xl px-3 py-2 text-sm font-bold "+(days===7?"bg-slate-950 text-white":"bg-white border border-slate-200")}>7 Tage</Link><Link href="/power-user/product-analytics?range=30d" className={"rounded-xl px-3 py-2 text-sm font-bold "+(days===30?"bg-slate-950 text-white":"bg-white border border-slate-200")}>30 Tage</Link></div></div>
   <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"><div className="text-xs font-bold uppercase tracking-[.18em] text-cyan-600">Power User · Product Analytics</div><h1 className="mt-2 text-3xl font-black tracking-tight">Was wird wirklich genutzt?</h1><p className="mt-2 text-sm text-slate-600">Feature-Aufrufe und Interaktionen der letzten {days} Tage. Keine Nachrichten- oder Freitextinhalte.</p>
   <div className="mt-4 flex flex-wrap gap-2"><Link href={"/power-user/product-analytics?range="+days+"d"} className={"rounded-full px-3 py-1.5 text-xs font-bold "+(!q.club?"bg-cyan-600 text-white":"bg-slate-100")}>Alle Clubs</Link>{clubs.map(c=><Link key={c.id} href={"/power-user/product-analytics?range="+days+"d&club="+c.id} className={"rounded-full px-3 py-1.5 text-xs font-bold "+(q.club===c.id?"bg-cyan-600 text-white":"bg-slate-100")}>{clubMap.get(c.id)}</Link>)}</div></section>
   <div className="grid gap-3 sm:grid-cols-3"><Metric icon={<MousePointerClick className="h-5 w-5"/>} label="Interaktionen" value={String(events.length)}/><Metric icon={<Users className="h-5 w-5"/>} label="Aktive Nutzer" value={String(users)}/><Metric icon={<Building2 className="h-5 w-5"/>} label="Aktive Clubs" value={String(activeClubs)}/></div>
   <section className="rounded-[24px] border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><BarChart3 className="h-5 w-5"/><h2 className="font-black">Nutzung nach Bereich</h2></div><div className="mt-4 space-y-3">{ranking.length?ranking.map(([name,count])=><div key={name}><div className="mb-1 flex justify-between gap-3 text-sm"><span className="font-bold">{LABELS[name]??name}</span><span className="font-black">{count}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-cyan-500" style={{width:(count/Math.max(1,ranking[0][1])*100)+"%"}}/></div></div>):<p className="text-sm text-slate-500">Noch keine Daten in diesem Zeitraum.</p>}</div></section>
   <section className="rounded-[24px] border border-slate-200 bg-white p-5"><h2 className="font-black">Aktivität im Verlauf</h2><div className="mt-5 flex h-32 items-end gap-1">{daysList.map(d=>{const n=dayCounts.get(d)??0;return <div key={d} className="group flex min-w-0 flex-1 flex-col items-center justify-end" title={d+": "+n}><div className="w-full rounded-t bg-cyan-500/80" style={{height:Math.max(n?6:1,n/maxDay*110)+"px"}}/></div>})}</div><div className="mt-2 flex justify-between text-[10px] text-slate-400"><span>{daysList[0]}</span><span>Heute</span></div></section>
   <section className="rounded-[24px] border border-slate-200 bg-white p-5"><h2 className="font-black">Letzte Aktivitäten</h2><div className="mt-3 divide-y divide-slate-100">{events.slice(0,30).map((e,i)=><div key={e.created_at+i} className="flex items-center justify-between gap-3 py-2.5 text-sm"><div><span className="font-bold">{LABELS[e.event_name]??e.event_name}</span><span className="ml-2 text-xs text-slate-400">{e.club_id?clubMap.get(e.club_id)??"Club":"–"}</span></div><span className="shrink-0 text-xs text-slate-400">{new Date(e.created_at).toLocaleString("de-DE")}</span></div>)}</div></section>
 </section></main>
}
function Metric({icon,label,value}:{icon:React.ReactNode;label:string;value:string}){return <div className="rounded-[22px] border border-slate-200 bg-white p-4"><div className="flex items-center justify-between text-slate-500"><span className="text-xs font-bold uppercase tracking-wide">{label}</span>{icon}</div><div className="mt-2 text-3xl font-black">{value}</div></div>}
