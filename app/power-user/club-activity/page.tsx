import Link from "next/link";
import { requirePowerUser } from "@/lib/auth/power-user";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
type Event = { created_at:string; user_id:string|null; event_name:string; path:string|null };
type Player = { user_id:string|null; name:string|null; first_name:string|null; last_name:string|null };
type Club = { id:string; display_name:string|null; name:string|null };
const format = (v:string) => new Date(v).toLocaleString("de-DE",{timeZone:"Europe/Berlin",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
const labels:Record<string,string>={home_open:"Startseite",admin_open:"Verwaltung",sessions_open:"Trainings",session_detail_open:"Training geöffnet",standings_open:"Tabelle",my_stats_open:"Statistiken",player_pass_open:"Spielerpass",team_cashbox_open:"Mannschaftskasse",other_page_open:"Weitere Seite",badge_open:"Badge",team_feed_open:"Kabinentalk"};
export default async function ClubActivityPage({searchParams}:{searchParams:Promise<{club?:string;days?:string}>}) {
 await requirePowerUser();
 const q=await searchParams;
 const admin=createAdminClient();
 const days=[1,7,14,30].includes(Number(q.days))?Number(q.days):7;
 const {data:clubs,error:clubsError}=await admin.from("clubs").select("id,display_name,name").order("display_name");
 if(clubsError) throw new Error(clubsError.message);
 const allClubs=(clubs??[]) as Club[];
 const selected=allClubs.find(c=>c.id===q.club)??allClubs.find(c=>/geb ersheim|gebersheim/i.test(c.display_name??c.name??""))??allClubs[0];
 const clubId=selected?.id;
 const since=new Date(Date.now()-days*86400000).toISOString();
 const [eventResult,playerResult,guestResult]=clubId?await Promise.all([
  admin.from("product_analytics_events").select("created_at,user_id,event_name,path").eq("club_id",clubId).gte("created_at",since).order("created_at",{ascending:false}).limit(5000),
  admin.from("players").select("user_id,name,first_name,last_name").eq("club_id",clubId).not("user_id","is",null),
  admin.from("players").select("name,created_at").eq("club_id",clubId).eq("is_guest",true).gte("created_at",since).order("created_at",{ascending:false}).limit(100)
 ]):[{data:[],error:null},{data:[],error:null},{data:[],error:null}];
 if(eventResult.error||playerResult.error||guestResult.error) throw new Error(eventResult.error?.message??playerResult.error?.message??guestResult.error?.message);
 const events=(eventResult.data??[]) as Event[];
 const players=(playerResult.data??[]) as Player[];
 const playerNames=new Map(players.filter(p=>p.user_id).map(p=>[p.user_id!,[p.first_name,p.last_name].filter(Boolean).join(" ")||p.name||"Spieler"]));
 const userCounts=new Map<string,{name:string;count:number;last:string}>();
 const featureCounts=new Map<string,number>();
 for(const e of events){
  const id=e.user_id??"unknown";
  const previous=userCounts.get(id);
  userCounts.set(id,{name:playerNames.get(id)??(id==="unknown"?"Nicht zugeordnet":"Support / ohne Spielerprofil"),count:(previous?.count??0)+1,last:previous?.last??e.created_at});
  featureCounts.set(e.event_name,(featureCounts.get(e.event_name)??0)+1);
 }
 const users=[...userCounts.values()].sort((a,b)=>b.count-a.count);
 const features=[...featureCounts.entries()].sort((a,b)=>b[1]-a[1]);
 const params=(club:string,range:number)=>"/power-user/club-activity?"+new URLSearchParams({club,days:String(range)}).toString();
 return <main className="min-h-screen bg-slate-50 pb-24"><section className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6">
 <Link href="/power-user" className="text-sm font-bold text-slate-600">← Power User</Link>
 <header className="rounded-3xl border border-slate-200 bg-white p-6"><div className="text-xs font-bold uppercase tracking-widest text-cyan-700">Power User · Vereinsaktivität</div><h1 className="mt-2 text-3xl font-black">Wie nutzen die Teams strikr?</h1><p className="mt-2 text-sm text-slate-600">Erfasste Seitenaufrufe pro Verein, Nutzer und Zeitpunkt. Kein vollständiges Klick- oder Login-Protokoll.</p>
 <form className="mt-5 flex flex-wrap items-end gap-3"><label className="flex-1 text-xs font-bold">Verein<select name="club" defaultValue={clubId} className="mt-1 block w-full rounded-xl border border-slate-200 p-3 text-sm">{allClubs.map(c=><option key={c.id} value={c.id}>{c.display_name||c.name||c.id}</option>)}</select></label><label className="text-xs font-bold">Zeitraum<select name="days" defaultValue={days} className="mt-1 block rounded-xl border border-slate-200 p-3 text-sm">{[1,7,14,30].map(n=><option key={n} value={n}>{n} Tage</option>)}</select></label><button className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white">Anzeigen</button></form>
 {clubId?<div className="mt-3 flex gap-2 text-xs"><Link className="rounded-full bg-cyan-50 px-3 py-2 font-bold text-cyan-800" href={params(clubId,1)}>24 Stunden</Link><Link className="rounded-full bg-cyan-50 px-3 py-2 font-bold text-cyan-800" href={params(clubId,7)}>7 Tage</Link><Link className="rounded-full bg-cyan-50 px-3 py-2 font-bold text-cyan-800" href={params(clubId,30)}>30 Tage</Link></div>:null}</header>
 <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Aufrufe",events.length],["Aktive Konten",userCounts.size],["Bereiche",featureCounts.size],["Neue Gastspieler",guestResult.data?.length??0]].map(([label,value])=><div key={label} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="text-xs font-bold text-slate-500">{label}</div><div className="mt-2 text-3xl font-black">{value}</div></div>)}</div>
 <div className="grid gap-4 md:grid-cols-2"><section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-black">Aktive Nutzer</h2><div className="mt-3 divide-y divide-slate-100">{users.map((u,i)=><div key={i} className="flex items-center justify-between gap-3 py-3 text-sm"><div><div className="font-bold">{u.name}</div><div className="text-xs text-slate-500">Zuletzt {format(u.last)}</div></div><span className="font-black">{u.count}</span></div>)}{!users.length?<p className="py-5 text-sm text-slate-500">Keine Ereignisse im Zeitraum.</p>:null}</div></section>
 <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-black">Genutzte Bereiche</h2><div className="mt-3 divide-y divide-slate-100">{features.map(([name,count])=><div key={name} className="flex justify-between gap-3 py-3 text-sm"><span>{labels[name]??name}</span><b>{count}</b></div>)}</div></section></div>
 <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-black">Aktivitätsverlauf</h2><p className="mt-1 text-xs text-slate-500">Neueste zuerst · Uhrzeit Deutschland · maximal 5.000 Ereignisse</p><div className="mt-4 max-h-[700px] overflow-auto divide-y divide-slate-100">{events.map((e,i)=><div key={i} className="grid grid-cols-[92px_1fr] gap-3 py-3 text-sm sm:grid-cols-[120px_1fr_1fr]"><span className="text-xs text-slate-500">{format(e.created_at)}</span><span className="font-semibold">{e.user_id?(playerNames.get(e.user_id)??"Support / ohne Spielerprofil"):"Nicht zugeordnet"}</span><span className="col-start-2 text-slate-600 sm:col-start-auto">{labels[e.event_name]??e.event_name} <span className="text-xs text-slate-400">{e.path}</span></span></div>)}{!events.length?<p className="py-5 text-sm text-slate-500">Keine Ereignisse.</p>:null}</div></section>
 <p className="text-xs text-slate-500">Die Ansicht zeigt nur bereits instrumentierte Ereignisse. Öffnungen ohne Tracking, echte Anmeldungen, Gerätearten und einzelne Klicks können nicht zuverlässig rekonstruiert werden. Konten ohne Vereins-Spielerprofil können Supportzugriffe sein. Neue Gäste sind angelegte Datensätze, keine Registrierungen.</p>
 </section></main>;
}
