import Link from "next/link";
import { requireCashboxAccess } from "@/lib/cashbox/access";
import { createAdminClient } from "@/lib/supabase/admin";

type Penalty={id:number;player_id:number;created_at:string;resolved_at:string|null;reason:string|null};
type Settlement={penalty_id:number;state:string};
type Season={id:number;name:string|null;start_date:string|null;end_date:string|null};
export default async function PenaltyStats({searchParams}:{searchParams?:Promise<{season?:string;view?:string}>}){
  const {clubId}=await requireCashboxAccess();
  const db=createAdminClient();
  const params=await searchParams;
  const [{data:seasons},{data:players}]=await Promise.all([
    db.from("seasons").select("id,name,start_date,end_date").eq("club_id",clubId).order("start_date",{ascending:false}),
    db.from("players").select("id,name,nickname,first_name,last_name").eq("club_id",clubId).eq("is_guest",false),
  ]);
  const list=(seasons??[]) as Season[];
  const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Berlin",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const current=list.find(s=>s.start_date&&s.end_date&&s.start_date<=today&&s.end_date>=today)??list[0];
  const selected=list.find(s=>String(s.id)===params?.season)??current;
  const lifetime=params?.view==="all";
  const penalties:Penalty[]=[];
  for(let offset=0;offset<100000;offset+=500){
    let q=db.from("penalties").select("id,player_id,created_at,resolved_at,reason")
      .eq("club_id",clubId).not("source_key","like","test:%").order("created_at",{ascending:false}).range(offset,offset+499);
    if(!lifetime){
      if(selected?.start_date)q=q.gte("created_at",selected.start_date+"T00:00:00");
      if(selected?.end_date)q=q.lt("created_at",new Date(Date.parse(selected.end_date+"T00:00:00Z")+86400000).toISOString().slice(0,10)+"T00:00:00");
      if(!selected)q=q.lt("created_at","1900-01-01T00:00:00Z");
    }
    const {data,error}=await q;
    if(error)throw new Error("Strafen-Statistik konnte nicht geladen werden");
    penalties.push(...(data??[] as Penalty[]));
    if(!data||data.length<500)break;
  }
  const ids=penalties.map(p=>p.id);
  const states=new Map<number,string>();
  for(let i=0;i<ids.length;i+=500){
    const {data}=await db.from("pilot_penalty_settlements").select("penalty_id,state").in("penalty_id",ids.slice(i,i+500));
    for(const s of (data??[]) as Settlement[])states.set(s.penalty_id,s.state);
  }
  const names=new Map((players??[]).map(p=>[p.id,p.nickname?.trim()||[p.first_name,p.last_name].filter(Boolean).join(" ").trim()||p.name||"Spieler"]));
  const totals=new Map<number,{total:number;open:number;done:number}>();
  const reasons=new Map<string,number>();
  for(const p of penalties){
    const state=states.get(p.id);
    if(state==="cancelled")continue;
    const entry=totals.get(p.player_id)??{total:0,open:0,done:0};
    entry.total++;
    if(state==="confirmed"||p.resolved_at)entry.done++;else entry.open++;
    totals.set(p.player_id,entry);
    const reason=(p.reason||"Sonstige Regel").trim();
    reasons.set(reason,(reasons.get(reason)??0)+1);
  }
  const ranking=[...totals.entries()].map(([id,x])=>({...x,id,name:names.get(id)??"Spieler"})).sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name,"de"));
  const topReasons=[...reasons.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5);
  return <main className="min-h-screen bg-[#f6f7f9] px-4 py-6 pb-28"><div className="mx-auto max-w-2xl space-y-5">
    <Link href="/mannschaftskasse" className="text-sm font-semibold text-slate-500">← Mannschaftskasse</Link>
    <header><p className="text-xs font-bold uppercase tracking-wider text-violet-700">Kabinenregeln</p><h1 className="mt-1 text-2xl font-black text-slate-950">Strafen-Rangliste</h1><p className="mt-1 text-sm text-slate-500">Wer sammelt die meisten Strafen? Ohne Test- und stornierte Einträge.</p></header>
    <nav className="flex flex-wrap gap-2">
      {selected?<Link href={`/mannschaftskasse/strafen-statistik?season=${selected.id}`} className={`rounded-full px-4 py-2 text-xs font-bold ${!lifetime?"bg-slate-950 text-white":"bg-white text-slate-700"}`}>{selected.name||"Aktuelle Saison"}</Link>:null}
      <Link href="/mannschaftskasse/strafen-statistik?view=all" className={`rounded-full px-4 py-2 text-xs font-bold ${lifetime?"bg-slate-950 text-white":"bg-white text-slate-700"}`}>Ewige Tabelle</Link>
    </nav>
    {!lifetime&&list.length>1?<div className="flex gap-2 overflow-x-auto pb-1">{list.filter(s=>s.id!==selected?.id).map(s=><Link key={s.id} href={`/mannschaftskasse/strafen-statistik?season=${s.id}`} className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">{s.name||"Saison"}</Link>)}</div>:null}
    <div className="grid grid-cols-3 gap-2">{[{label:"Strafen",value:ranking.reduce((n,x)=>n+x.total,0)},{label:"Offen",value:ranking.reduce((n,x)=>n+x.open,0)},{label:"Erledigt",value:ranking.reduce((n,x)=>n+x.done,0)}].map(x=><div key={x.label} className="rounded-xl border border-slate-200 bg-white p-3 text-center"><p className="text-2xl font-black text-slate-950">{x.value}</p><p className="mt-1 text-xs text-slate-500">{x.label}</p></div>)}</div>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><h2 className="px-4 py-4 text-base font-black">Rangliste</h2><div className="grid grid-cols-[2rem_1fr_3rem_3rem] gap-2 border-y border-slate-100 bg-slate-50 px-4 py-2 text-[11px] font-bold text-slate-500"><span>#</span><span>Spieler</span><span className="text-right">Gesamt</span><span className="text-right">Offen</span></div>
      {ranking.map((x,i)=><div key={x.id} className="grid grid-cols-[2rem_1fr_3rem_3rem] items-center gap-2 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0"><span className="font-bold text-slate-400">{i+1}.</span><span className="truncate font-semibold text-slate-900">{x.name}</span><span className="text-right font-black">{x.total}</span><span className="text-right font-semibold text-slate-500">{x.open}</span></div>)}
      {ranking.length===0?<p className="p-5 text-sm text-slate-500">Noch keine Strafen in diesem Zeitraum.</p>:null}
    </section>
    {topReasons.length>0?<section className="rounded-2xl border border-slate-200 bg-white p-4"><h2 className="mb-3 text-base font-black">Häufigste Kabinenregeln</h2>{topReasons.map(([reason,count])=><div key={reason} className="flex justify-between gap-4 border-t border-slate-100 py-3 text-sm"><span className="text-slate-700">{reason}</span><span className="font-black">{count}×</span></div>)}</section>:null}
  </div></main>;
}
